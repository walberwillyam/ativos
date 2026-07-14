import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { ClipboardCheck, QrCode, X, CheckCircle2, AlertCircle, Camera, CheckCheck } from 'lucide-react';
import { Asset, AuditSchedule } from '../types';

interface ConferenteViewProps {
  userProfile: any;
  assets: Asset[];
}

export default function ConferenteView({ userProfile, assets }: ConferenteViewProps) {
  const [activeAudit, setActiveAudit] = useState<AuditSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [scannedCode, setScannedCode] = useState('');
  const [auditedIds, setAuditedIds] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<{success: boolean, message: string} | null>(null);

  const userUnit = userProfile?.unit;

  useEffect(() => {
    if (userUnit) {
      checkActiveAudit();
    }
  }, [userUnit]);

  const checkActiveAudit = async () => {
    try {
      setLoading(true);
      // Busca auditoria ativa para a unidade do usuário
      const { data, error } = await supabase
        .from('audit_schedules')
        .select('*')
        .eq('unit_id', userUnit)
        .eq('status', 'ativo')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setActiveAudit(data as AuditSchedule);
        loadProgress(data.id);
      } else {
        setActiveAudit(null);
      }
    } catch (err) {
      // Ignora erro se não encontrar nenhuma
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async (auditId: string) => {
    const { data } = await supabase.from('audit_progress').select('asset_id, status').eq('audit_id', auditId);
    if (data) {
      setAuditedIds(data.map(d => d.asset_id));
    }
  };

  // Stop camera on unmount or when not scanning
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isComponentMounted = true;
    let isStarting = false;

    async function initScanner() {
      if (!isComponentMounted) return;
      isStarting = true;
      try {
        html5QrCode = new Html5Qrcode("conferente-reader", {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8
          ],
          verbose: false
        });
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10 },
          (decodedText) => {
            if (!isComponentMounted) return;
            if (handleCodeSubmitRef.current) {
               handleCodeSubmitRef.current(decodedText);
            }
          },
          () => {} // ignore errors
        );
      } catch (err) {
        console.error("Camera start failed", err);
        setIsScanning(false);
        alert("Não foi possível acessar a câmera.");
      } finally {
        isStarting = false;
      }
    }

    if (isScanning && activeAudit) {
      initScanner();
    }

    return () => {
      isComponentMounted = false;
      if (html5QrCode && !isStarting) {
        if (html5QrCode.isScanning) {
          html5QrCode.stop().then(() => html5QrCode?.clear()).catch(console.error);
        } else {
          try { html5QrCode.clear(); } catch(e){}
        }
      }
    };
  }, [isScanning, activeAudit]);

  const targetAssets = useMemo(() => {
    if (!userUnit) return [];
    return assets.filter(a => a.unit === userUnit);
  }, [assets, userUnit]);

  const pendingAssets = targetAssets.filter(a => !auditedIds.includes(a.id));
  const verifiedAssets = targetAssets.filter(a => auditedIds.includes(a.id));

  const handleCodeSubmit = async (codeToCheck: string) => {
    const code = (codeToCheck || scannedCode).trim().toLowerCase();
    if (!code || !activeAudit) return;

    // Pausa pra não bipar duplo rápido
    if (isScanning) setIsScanning(false);

    const foundAsset = assets.find(a => 
      a.patrimonio?.toLowerCase() === code || 
      a.serialNumber?.toLowerCase() === code ||
      a.id?.toLowerCase() === code
    );

    if (!foundAsset) {
      setLastScanResult({ success: false, message: `Código ${code.toUpperCase()} não encontrado no sistema.` });
      setScannedCode('');
      return;
    }

    let status = 'conferido';
    if (foundAsset.unit !== userUnit) {
      status = 'invasor';
      setLastScanResult({ success: false, message: `Atenção: ${foundAsset.name} pertence a ${foundAsset.unit}! Marcado como invasor.` });
    } else {
      setLastScanResult({ success: true, message: `OK! ${foundAsset.name} conferido.` });
    }

    // Salvar progresso
    if (!auditedIds.includes(foundAsset.id)) {
      setAuditedIds(prev => [...prev, foundAsset.id]);
      await supabase.from('audit_progress').insert([{
        audit_id: activeAudit.id,
        asset_id: foundAsset.id,
        status: status,
        scanned_by: userProfile?.id
      }]);
    }
    
    setScannedCode('');
  };

  const handleCodeSubmitRef = React.useRef(handleCodeSubmit);
  useEffect(() => {
    handleCodeSubmitRef.current = handleCodeSubmit;
  }, [handleCodeSubmit]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCodeSubmit(scannedCode);
  };

  const handleFinalizeAudit = async () => {
    if (!activeAudit) return;
    
    if (!window.confirm("Deseja enviar a conferência para a T.I? Ao confirmar, você não poderá mais bipar itens.")) {
      return;
    }

    // Marca como concluído
    await supabase.from('audit_schedules')
      .update({ status: 'concluido', completed_at: new Date().toISOString() })
      .eq('id', activeAudit.id);
      
    // Para ativos pendentes, insere como não localizado
    for (const pending of pendingAssets) {
      await supabase.from('audit_progress').insert([{
        audit_id: activeAudit.id,
        asset_id: pending.id,
        status: 'nao_localizado'
      }]);
    }

    alert("Conferência enviada com sucesso!");
    setActiveAudit(null);
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-50"><p className="animate-pulse">Carregando...</p></div>;
  }

  // TELA DE BLOQUEIO (SEM CONFERÊNCIA ATIVA)
  if (!activeAudit) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
          <CheckCheck size={48} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Tudo certo por aqui!</h2>
        <p className="text-slate-500 max-w-md">Não há nenhuma conferência de ativos pendente ou agendada para sua unidade <strong>({userUnit || 'Não vinculada'})</strong> no momento.</p>
        <button onClick={checkActiveAudit} className="mt-8 px-6 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 font-medium shadow-sm">Atualizar Tela</button>
      </div>
    );
  }

  // TELA DA CONFERÊNCIA ATIVA
  return (
    <div className="flex-1 bg-slate-50 min-h-screen pb-24">
      <div className="bg-indigo-600 text-white p-6 shadow-md rounded-b-3xl">
        <h2 className="text-xl font-bold flex items-center gap-2"><ClipboardCheck /> Conferência de Ativos</h2>
        <p className="text-indigo-100 text-sm mt-1">Unidade: {userUnit}</p>
      </div>

      <div className="p-6 max-w-lg mx-auto space-y-6 -mt-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><QrCode size={18} className="text-indigo-600" /> Leitura</h3>
            <button 
              onClick={() => setIsScanning(!isScanning)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${isScanning ? 'bg-rose-100 text-rose-700' : 'bg-indigo-50 text-indigo-700'}`}
            >
              {isScanning ? <><X size={16} /> Fechar Câmera</> : <><Camera size={16} /> Abrir Câmera</>}
            </button>
          </div>

          {isScanning && (
            <div className="mb-4 overflow-hidden rounded-xl border border-slate-200">
              <div id="conferente-reader" className="w-full"></div>
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input 
              type="text" 
              value={scannedCode}
              onChange={(e) => setScannedCode(e.target.value.toUpperCase())}
              placeholder="Ou digite o Patrimônio..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-600 outline-none uppercase"
            />
            <button type="submit" className="px-5 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 text-sm">
              Confirmar
            </button>
          </form>

          {lastScanResult && (
            <div className={`mt-4 p-4 rounded-xl flex items-start gap-3 border ${lastScanResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
              {lastScanResult.success ? <CheckCircle2 className="shrink-0 mt-0.5" size={18} /> : <AlertCircle className="shrink-0 mt-0.5" size={18} />}
              <span className="text-sm font-medium leading-tight">{lastScanResult.message}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
            <div className="text-3xl font-black text-slate-800">{verifiedAssets.length}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase mt-1">Conferidos</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
            <div className="text-3xl font-black text-rose-600">{pendingAssets.length}</div>
            <div className="text-xs font-semibold text-rose-500/80 uppercase mt-1">Pendentes</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <ClipboardCheck size={18} className="text-indigo-600" /> 
              Lista de Ativos da Unidade
            </h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {targetAssets.map(asset => {
              const isVerified = auditedIds.includes(asset.id);
              return (
                <div key={asset.id} className={`p-4 flex items-center justify-between transition-colors ${isVerified ? 'bg-emerald-50' : ''}`}>
                  <div>
                    <p className={`font-semibold text-sm ${isVerified ? 'text-emerald-800' : 'text-slate-800'}`}>{asset.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Patrimônio: {asset.patrimonio || 'N/A'} {asset.serialNumber ? `| N/S: ${asset.serialNumber}` : ''}
                    </p>
                  </div>
                  {isVerified ? (
                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md shrink-0">
                      <CheckCircle2 size={14} /> Conferido
                    </div>
                  ) : (
                    <div className="text-xs font-medium text-slate-400 shrink-0">Pendente</div>
                  )}
                </div>
              );
            })}
            {targetAssets.length === 0 && (
              <div className="p-6 text-center text-slate-500 text-sm">
                Nenhum ativo encontrado para esta unidade.
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={handleFinalizeAudit}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 text-lg transition-all"
        >
          <CheckCheck /> Enviar Conferência
        </button>
      </div>
    </div>
  );
}
