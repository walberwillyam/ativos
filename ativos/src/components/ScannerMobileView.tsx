/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  Scan, 
  MapPin, 
  Search, 
  PlusSquare, 
  AlertTriangle, 
  Laptop, 
  Cpu, 
  Layers, 
  X, 
  CheckCircle,
  Satellite,
  Clock,
  Sparkles
} from 'lucide-react';
import { Asset, TimelineStep, AssetStatus } from '../types';

interface ScannerMobileViewProps {
  assets: Asset[];
  onUpdateAsset: (updatedAsset: Asset) => void;
  onAddActivity: (activity: {
    type: string;
    title: string;
    details: string;
    by: string;
    icon: string;
    badgeColor: string;
  }) => void;
  onOpenNewAssetForm: () => void;
}

export default function ScannerMobileView({ assets, onUpdateAsset, onAddActivity, onOpenNewAssetForm }: ScannerMobileViewProps) {
  const [selectedSimAssetIndex, setSelectedSimAssetIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scannedAssetStatus, setScannedAssetStatus] = useState<AssetStatus>('Em Uso');

  const activeSimAsset = assets[selectedSimAssetIndex] || assets[0];

  useEffect(() => {
    if (activeSimAsset && isModalOpen) {
      setScannedAssetStatus(activeSimAsset.status);
    }
  }, [activeSimAsset, isModalOpen]);

  // HTML5 QR Code setup
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isComponentMounted = true;
    let isStarting = false;

    function onScanSuccess(decodedText: string) {
      if (!isComponentMounted || !html5QrCode) return;
      
      const foundAsset = assets.find(a => a.id === decodedText || a.serialNumber === decodedText || a.patrimonio === decodedText);
      
      if (foundAsset) {
        if (html5QrCode.isScanning) {
          html5QrCode.stop().then(() => {
            setSelectedSimAssetIndex(assets.findIndex(a => a.id === foundAsset.id));
            setIsModalOpen(true);
          }).catch(err => console.log("Stop error", err));
        } else {
          setSelectedSimAssetIndex(assets.findIndex(a => a.id === foundAsset.id));
          setIsModalOpen(true);
        }
      } else {
        alert(`Código ${decodedText} lido, mas ativo não localizado no inventário.`);
      }
    }

    function onScanFailure() {
      // Ignora falhas de frame
    }

    async function initScanner() {
      if (!isComponentMounted) return;
      isStarting = true;
      try {
        html5QrCode = new Html5Qrcode("reader", {
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
          { 
            fps: 10, 
            qrbox: { width: 250, height: 150 }
          },
          onScanSuccess,
          onScanFailure
        );
      } catch (err) {
        console.error("Camera start failed", err);
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

    initScanner();

    return () => {
      isComponentMounted = false;
      if (html5QrCode && !isStarting) {
        if (html5QrCode.isScanning) {
          html5QrCode.stop().then(() => {
            html5QrCode?.clear();
          }).catch(console.error);
        } else {
          try { html5QrCode.clear(); } catch(e){}
        }
      }
    };
  }, [assets]);

  const handleConfirmPresence = () => {
    if (!activeSimAsset) return;

    // Build timeline audit scan entry
    const auditStep: TimelineStep = {
      id: `step-audit-${Date.now()}`,
      title: "Verificação de Presença por Scan",
      responsible: "Técnico de Campo",
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      type: "scan",
      description: `Leitura física do QR Code no local. Integridade posicional confirmada. Estado operacional definido como: ${scannedAssetStatus}.`
    };

    const updatedAsset: Asset = {
      ...activeSimAsset,
      status: scannedAssetStatus,
      history: [auditStep, ...activeSimAsset.history]
    };

    onUpdateAsset(updatedAsset);
    setIsModalOpen(false);

    onAddActivity({
      type: "transfer",
      title: "Varredura de Auditoria",
      details: `Presença verificada física em campo para ${activeSimAsset.name} com status ${scannedAssetStatus}.`,
      by: "Técnico de Campo",
      icon: "sync_alt",
      badgeColor: "bg-emerald-500"
    });

    alert(`Varredura reconciliada! Registro gravado e verificado com sucesso para ${activeSimAsset.id}!`);
  };

  const handleReportError = () => {
    if (!activeSimAsset) return;
    setIsModalOpen(false);

    const errorStep: TimelineStep = {
      id: `step-err-${Date.now()}`,
      title: "Manutenção Autodeclarada em Scan",
      responsible: "Técnico de Campo",
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      type: "maintenance",
      description: "Constatado incidente técnico físico no local durante ronda física. Equipamento rebaixado de status."
    };

    const updatedAsset: Asset = {
      ...activeSimAsset,
      status: "Manutenção",
      history: [errorStep, ...activeSimAsset.history]
    };

    onUpdateAsset(updatedAsset);

    onAddActivity({
      type: "maintenance",
      title: "Manutenção Solicitada",
      details: `${activeSimAsset.name} marcado em manutenção urgente sob scan.`,
      by: "Técnico de Campo",
      icon: "build",
      badgeColor: "bg-amber-500"
    });

    alert(`Sucesso! Status reclassificado e ordem de reparo aberta automaticamente para ${activeSimAsset.id}.`);
  };

  return (
    <div id="scanner-view" className="space-y-6 max-w-md mx-auto select-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-lg pb-10">
      {/* Mobile-Vibe Header controls */}
      <header className="space-y-3">
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-4 py-2.5 rounded-2xl shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-black tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Ativos Apoio Scan</span>
          </div>
          <div className="flex items-center text-slate-500 gap-1 text-[11px] font-bold">
            <MapPin size={12} className="text-emerald-500" />
            <span>GPS ATIVO</span>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Inventário Rápido</h2>
          <p className="text-xs text-slate-400 mt-0.5">Leitor e varredura física para rondas de campo técnico patrimoniais.</p>
        </div>
      </header>

      {/* Camera Viewport Real Scanner */}
      <section className="relative flex justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-4 shadow-sm">
        <div className="w-full max-w-[320px] rounded-2xl overflow-hidden relative" id="reader-wrapper">
          <div id="reader" className="w-full rounded-2xl overflow-hidden"></div>
          <style>{`
            #reader { border: none !important; }
            #reader video { object-fit: cover !important; border-radius: 1rem !important; }
            #reader__dashboard_section_csr button { 
              background: #4f46e5; color: white; padding: 6px 12px; border-radius: 8px; font-weight: bold; border: none; font-size: 12px; margin-bottom: 8px;
            }
            #reader__dashboard_section_swaplink { text-decoration: none; color: #4f46e5; font-weight: bold; }
          `}</style>
        </div>
      </section>

      {/* Quick shortcuts action grid */}
      <section className="grid grid-cols-2 gap-3.5">
        <button 
          id="scanner-shortcut-new"
          onClick={onOpenNewAssetForm}
          className="flex flex-col items-center justify-center p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl shadow-xs transition active:scale-95"
        >
          <PlusSquare size={24} className="text-indigo-700 dark:text-indigo-400 mb-1" />
          <span className="font-extrabold text-[11px] text-slate-700 dark:text-slate-200 uppercase tracking-wider">Novo Ativo</span>
        </button>

        <button 
          id="scanner-shortcut-error"
          onClick={handleReportError}
          className="flex flex-col items-center justify-center p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl shadow-xs transition active:scale-95"
        >
          <AlertTriangle size={24} className="text-rose-500 mb-1" />
          <span className="font-extrabold text-[11px] text-slate-700 dark:text-slate-200 uppercase tracking-wider">Declarar Defeito</span>
        </button>
      </section>

      {/* List matches typical listings from mockup */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-widest leading-none">Últimas Leituras de Ronda</h3>
          <span className="text-[10px] font-bold text-indigo-700 cursor-pointer hover:underline bg-indigo-50 px-2 py-0.5 rounded">Rondas SLA</span>
        </div>

        <div className="space-y-2 select-none">
          {(() => {
            // Get recently scanned assets based on their history
            const scannedAssets = assets
              .filter(a => a.history.some(h => h.type === 'scan'))
              .map(a => {
                const lastScan = a.history.find(h => h.type === 'scan')!;
                return {
                  name: a.name,
                  sn: a.serialNumber || a.id,
                  type: a.status,
                  tagColor: a.status === 'Em Uso' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                            a.status === 'Manutenção' ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-slate-100 text-slate-600 border-slate-200",
                  dot: a.status === 'Em Uso' ? "bg-emerald-500" :
                       a.status === 'Manutenção' ? "bg-amber-500" :
                       "bg-slate-400",
                  time: lastScan.time,
                  date: new Date(`${lastScan.date}T${lastScan.time}`),
                  icon: Cpu
                };
              })
              .sort((a, b) => b.date.getTime() - a.date.getTime())
              .slice(0, 3);

            if (scannedAssets.length === 0) {
              return (
                <div className="p-4 text-center text-xs text-slate-400 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-800">
                  Nenhuma leitura de ronda registrada ainda.
                </div>
              );
            }

            return scannedAssets.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs">
                  <span className="p-2 bg-slate-50 dark:bg-slate-900 text-slate-400 rounded-xl">
                    <Icon size={16} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">{item.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate uppercase">S/N: {item.sn}</p>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border flex items-center gap-1 ${item.tagColor}`}>
                      <span className={`w-1 h-1 rounded-full ${item.dot}`} />
                      {item.type}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 font-medium">{item.time}</span>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </section>

      {/* Confirmation Overlay Modal Bottom Sheet matching high fidelity images */}
      {isModalOpen && activeSimAsset && (
        <div id="confirmation-modal" className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-t-[32px] rounded-b-3xl overflow-hidden shadow-2xl border border-slate-150 animate-slide-up">
            <div className="p-6 space-y-5">
              {/* Slidable swipe indicator handle */}
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto -mt-2" />

              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">Ativo Identificado</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Leitura de etiqueta de patrimônio confirmada!</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Verified content summary layout card */}
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3.5 text-xs text-slate-700">
                <div className="flex justify-between border-b border-slate-200/50 pb-2.5">
                  <span className="text-slate-400 font-medium">Nome do Ativo</span>
                  <span className="font-bold text-slate-800 text-right max-w-[140px] truncate">{activeSimAsset.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/50 pb-2.5">
                  <span className="text-slate-400 font-medium">Código Patrimonial</span>
                  <span className="font-mono font-bold text-slate-800">{activeSimAsset.id}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/50 pb-2.5">
                  <span className="text-slate-400 font-medium font-sans">Nº Série / SN</span>
                  <span className="font-mono font-bold text-slate-800">{activeSimAsset.serialNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Localização Registrada</span>
                  <div className="text-right">
                    <p className="font-bold text-slate-800">{activeSimAsset.unit}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{activeSimAsset.location}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2.5 border-t border-slate-200/50 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400 font-bold">Estado Operacional</span>
                  <select 
                    value={scannedAssetStatus}
                    onChange={(e) => setScannedAssetStatus(e.target.value as AssetStatus)}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                  >
                    <option value="Em Uso">Em Uso</option>
                    <option value="Manutenção">Manutenção</option>
                    <option value="Armazenado">Armazenado</option>
                    <option value="Extraviado">Extraviado</option>
                    <option value="Obsoleto">Obsoleto</option>
                  </select>
                </div>
              </div>

              {/* Confirmation buttons */}
              <div className="flex flex-col gap-2.5 pt-1">
                <button 
                  id="scanner-confirm-presence-btn"
                  onClick={handleConfirmPresence}
                  className="w-full py-3.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-2xl font-bold flex items-center justify-center gap-1.5 shadow"
                >
                  <CheckCircle size={16} />
                  Confirmar Presença (Auditar)
                </button>

                <button 
                  id="scanner-report-error-btn"
                  onClick={handleReportError}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold flex items-center justify-center gap-1.5 shadow"
                >
                  <AlertTriangle size={16} />
                  Registrar Manutenção
                </button>

                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-3.5 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-2xl text-xs font-bold bg-white"
                >
                  Cancelar Caputra
                </button>
              </div>

              {/* Telemetry metadata footer list */}
              <div className="flex items-center justify-center gap-5 text-[10px] font-bold text-slate-400 pb-1">
                <div className="flex items-center gap-1">
                  <Clock size={12} className="text-slate-300" />
                  <span>14:32:05 (UTC)</span>
                </div>
                <div className="flex items-center gap-1">
                  <Satellite size={12} className="text-slate-300 animate-pulse" />
                  <span>GPS: -23.55, -46.63</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
