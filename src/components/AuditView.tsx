import React, { useState, useMemo, useEffect } from 'react';
import { Asset } from '../types';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  ClipboardCheck, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Camera, 
  QrCode,
  X,
  ListTodo,
  CheckCheck,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface AuditViewProps {
  assets: Asset[];
  units: { id: string; name: string }[];
  onUpdateAsset: (id: string, updates: Partial<Asset>) => void;
  onAddActivity: (activity: any) => void;
}

export default function AuditView({ assets, units, onUpdateAsset, onAddActivity }: AuditViewProps) {
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [scannedCode, setScannedCode] = useState('');
  const [auditedIds, setAuditedIds] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<{success: boolean, message: string} | null>(null);

  // Stop camera on unmount or when not scanning
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isComponentMounted = true;
    let isStarting = false;

    async function initScanner() {
      if (!isComponentMounted) return;
      isStarting = true;
      try {
        html5QrCode = new Html5Qrcode("audit-reader", {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A
          ],
          verbose: false
        });
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 100 } },
          (decodedText) => {
            if (!isComponentMounted) return;
            // Use ref to access latest state
            if (handleCodeSubmitRef.current) {
               handleCodeSubmitRef.current(decodedText);
            }
          },
          () => {} // ignore errors
        );
      } catch (err) {
        console.error("Camera start failed", err);
        setIsScanning(false);
        alert("Não foi possível acessar a câmera. Verifique as permissões.");
      } finally {
        isStarting = false;
        if (!isComponentMounted && html5QrCode) {
          if (html5QrCode.isScanning) {
            html5QrCode.stop().then(() => html5QrCode?.clear()).catch(console.error);
          } else {
            try { html5QrCode.clear(); } catch(e){}
          }
        }
      }
    }

    if (isScanning) {
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
  }, [isScanning]); // Depend only on isScanning

  const targetAssets = useMemo(() => {
    if (!selectedUnit) return [];
    return assets.filter(a => a.unit === selectedUnit);
  }, [assets, selectedUnit]);

  const pendingAssets = targetAssets.filter(a => !auditedIds.includes(a.id));
  const verifiedAssets = targetAssets.filter(a => auditedIds.includes(a.id));

  // Use a ref or functional update to avoid stale closures in camera callback
  const handleCodeSubmit = (codeToCheck: string) => {
    const code = (codeToCheck || scannedCode).trim().toLowerCase();
    if (!code) return;

    if (!selectedUnit) {
      setLastScanResult({ success: false, message: "Selecione uma unidade antes de bipar." });
      setScannedCode('');
      return;
    }

    // Find asset in the whole DB to see if it's from another unit
    const foundAsset = assets.find(a => 
      a.patrimonio.toLowerCase() === code || 
      a.serialNumber.toLowerCase() === code ||
      a.id.toLowerCase() === code
    );

    if (!foundAsset) {
      setLastScanResult({ success: false, message: `Código ${code.toUpperCase()} não encontrado no sistema.` });
      setScannedCode('');
      return;
    }

    if (foundAsset.unit !== selectedUnit) {
      setLastScanResult({ 
        success: false, 
        message: `Ativo ${foundAsset.name} pertence à unidade ${foundAsset.unit}, e não a ${selectedUnit}!` 
      });
      setScannedCode('');
      return;
    }

    // It belongs to this unit!
    setAuditedIds(prev => {
      if (prev.includes(foundAsset.id)) return prev;
      return [...prev, foundAsset.id];
    });
    
    setLastScanResult({ success: true, message: `OK! ${foundAsset.name} conferido.` });
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
    if (auditedIds.length === 0) return;
    
    if (!confirm(`Deseja finalizar a auditoria e salvar no histórico destes ${auditedIds.length} ativos?`)) {
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().slice(0, 5);
    
    // Save to Supabase and update local state
    for (const id of auditedIds) {
      const asset = assets.find(a => a.id === id);
      if (!asset) continue;

      const historyEntry = {
        id: `audit-${Date.now()}-${id}`,
        title: "Conferência Realizada",
        responsible: "Auditor(a)",
        date: today,
        time: time,
        type: "audit" as const,
        description: `Ativo conferido e validado fisicamente na unidade ${selectedUnit}.`
      };

      const newHistory = [historyEntry, ...asset.history];
      
      // Update local
      onUpdateAsset(id, { history: newHistory });

      // Fire and forget update
      supabase.from('assets').update({ history: newHistory }).eq('id', id).then();
    }

    onAddActivity({
      type: "audit",
      title: "Auditoria Finalizada",
      details: `${auditedIds.length} ativos auditados fisicamente na unidade ${selectedUnit}.`,
      by: "Sistema",
      icon: "fact_check",
      badgeColor: "bg-emerald-600"
    });

    alert("Auditoria finalizada e salva no histórico com sucesso!");
    setAuditedIds([]);
    setSelectedUnit('');
    setLastScanResult(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <ClipboardCheck className="text-indigo-600" size={32} />
            Conferência de Ativos
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Realize o inventário físico bipando os equipamentos localizados na unidade.</p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lado Esquerdo: Painel de Controle */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2 uppercase tracking-wider">Unidade para Auditoria</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                value={selectedUnit}
                onChange={(e) => {
                  setSelectedUnit(e.target.value);
                  setAuditedIds([]);
                  setLastScanResult(null);
                }}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none cursor-pointer"
              >
                <option value="">-- Selecione uma Unidade --</option>
                {units.map(u => (
                  <option key={u.id} value={u.name}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border ${lastScanResult ? (lastScanResult.success ? 'border-emerald-500 shadow-emerald-500/20' : 'border-rose-500 shadow-rose-500/20') : 'border-slate-200 dark:border-slate-700'} shadow-sm transition-all duration-300`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <QrCode size={18} className="text-indigo-600" />
                Leitura de Etiqueta
              </h3>
              <button 
                onClick={() => setIsScanning(!isScanning)}
                className={`p-2 rounded-lg transition-colors ${isScanning ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}
                title={isScanning ? "Fechar Câmera" : "Abrir Câmera"}
              >
                {isScanning ? <X size={16} /> : <Camera size={16} />}
              </button>
            </div>

            {/* Camera Viewfinder */}
            {isScanning && (
              <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black aspect-video relative">
                <div id="audit-reader" className="w-full h-full"></div>
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Patrimônio ou Série..."
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
                disabled={!selectedUnit}
                autoFocus
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={!selectedUnit || !scannedCode.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors"
              >
                Ler
              </button>
            </form>

            {lastScanResult && (
              <div className={`mt-4 p-3 rounded-xl text-xs font-bold flex items-start gap-2 ${
                lastScanResult.success 
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' 
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
              }`}>
                {lastScanResult.success ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
                <span>{lastScanResult.message}</span>
              </div>
            )}
            
            {!selectedUnit && (
              <p className="text-[10px] text-amber-600 font-semibold mt-3 text-center">
                Selecione uma unidade primeiro para habilitar o leitor.
              </p>
            )}
          </div>

          <div className="bg-indigo-900 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
            <ShieldCheck size={120} className="absolute -right-6 -bottom-6 text-indigo-800/50" />
            <div className="relative z-10">
              <h3 className="text-sm font-bold text-indigo-200 mb-4 uppercase tracking-wider">Status da Auditoria</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <span className="text-xs text-indigo-300 block mb-1">Total Unidade</span>
                  <span className="text-2xl font-black">{targetAssets.length}</span>
                </div>
                <div>
                  <span className="text-xs text-indigo-300 block mb-1">Conferidos</span>
                  <span className="text-2xl font-black text-emerald-400">{auditedIds.length}</span>
                </div>
              </div>

              <button
                onClick={handleFinalizeAudit}
                disabled={auditedIds.length === 0}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-indigo-800 disabled:text-indigo-400 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-bold shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                <CheckCheck size={18} />
                Finalizar e Salvar
              </button>
              {auditedIds.length > 0 && (
                <p className="text-[10px] text-indigo-200 mt-3 text-center">
                  O histórico de {auditedIds.length} ativos será atualizado.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Lado Direito: Listas */}
        <div className="lg:col-span-2 flex flex-col h-[calc(100vh-200px)] lg:h-auto gap-6">
          
          {/* Pendentes */}
          <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm flex flex-col min-h-[300px]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <ListTodo size={18} className="text-amber-500" />
                Pendentes de Leitura
                <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500 text-xs px-2 py-0.5 rounded-full font-black">
                  {pendingAssets.length}
                </span>
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {!selectedUnit ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                  Selecione uma unidade para ver os itens.
                </div>
              ) : pendingAssets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-emerald-500 text-sm font-bold gap-2">
                  <CheckCircle2 size={32} />
                  Todos os ativos foram conferidos!
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingAssets.map(asset => (
                    <div key={asset.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/50 flex justify-between items-center transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{asset.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">{asset.patrimonio}</span>
                          <span className="text-[10px] font-mono text-slate-500">SN: {asset.serialNumber}</span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 shrink-0 ml-2">
                        Pendente
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Conferidos */}
          <div className="flex-1 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl shadow-sm flex flex-col min-h-[300px]">
            <div className="p-4 border-b border-emerald-100 dark:border-emerald-900/30 flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20 rounded-t-2xl">
              <h3 className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                <CheckCheck size={18} className="text-emerald-500" />
                Ativos Conferidos
                <span className="bg-emerald-200 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 text-xs px-2 py-0.5 rounded-full font-black">
                  {verifiedAssets.length}
                </span>
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {verifiedAssets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                  Nenhum ativo conferido ainda.
                </div>
              ) : (
                <div className="space-y-2">
                  {verifiedAssets.map(asset => (
                    <div key={asset.id} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800/50 shadow-sm flex justify-between items-center">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{asset.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded">{asset.patrimonio}</span>
                        </div>
                      </div>
                      <div className="shrink-0 ml-2">
                        <CheckCircle2 size={20} className="text-emerald-500" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
