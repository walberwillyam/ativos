/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
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
import { Asset, TimelineStep } from '../types';

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
  // Simulator support states
  const [targetSearchScan, setTargetSearchScan] = useState('');
  const [selectedSimAssetIndex, setSelectedSimAssetIndex] = useState(0);
  const [scanningEffect, setScanningEffect] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Pick asset to scan from current list
  const activeSimAsset = assets[selectedSimAssetIndex] || assets[0];

  const handleScanAction = () => {
    setScanningEffect(true);
    // Mimic quick camera light beep effect
    setTimeout(() => {
      setScanningEffect(false);
      setIsModalOpen(true);
    }, 1500);
  };

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
      description: "Leitura física do QR Code no local. Integridade posicional confirmada e reconciliada via GPS (SLA)."
    };

    const updatedAsset: Asset = {
      ...activeSimAsset,
      history: [auditStep, ...activeSimAsset.history]
    };

    onUpdateAsset(updatedAsset);
    setIsModalOpen(false);

    onAddActivity({
      type: "transfer",
      title: "Varredura de Auditoria",
      details: `Presença verificada física em campo para ${activeSimAsset.name}.`,
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
    <div id="scanner-view" className="space-y-6 max-w-md mx-auto select-none bg-slate-50 border border-slate-200 p-6 rounded-3xl shadow-lg pb-10">
      {/* Mobile-Vibe Header controls */}
      <header className="space-y-3">
        <div className="flex justify-between items-center bg-white border border-slate-200/80 px-4 py-2.5 rounded-2xl shadow-xs">
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
          <h2 className="text-2xl font-black text-slate-900 leading-tight">Inventário Rápido</h2>
          <p className="text-xs text-slate-400 mt-0.5">Leitor e varredura física para rondas de campo técnico patrimoniais.</p>
        </div>
      </header>

      {/* Simulator picker support dropdown card */}
      <section className="bg-white border border-indigo-100 p-4 rounded-2xl shadow-xs space-y-2">
        <label className="block text-[10px] font-black uppercase text-indigo-700 tracking-wider">Simulador de Código de Barras / QR</label>
        <div className="space-y-1.5">
          <span className="text-[11px] text-slate-400 block font-medium leading-tight">Selecione qual item técnico você está fisicamente "segurando com a mão" para aproximar do leitor óptico:</span>
          <select
            id="scanner-simulate-picker"
            value={selectedSimAssetIndex}
            onChange={(e) => setSelectedSimAssetIndex(parseInt(e.target.value))}
            className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
          >
            {assets.map((asset, index) => (
              <option key={asset.id} value={index}>
                [{asset.id}] {asset.name} ({asset.unit.split(' ')[0]})
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Camera Viewport laser Scanner layout */}
      <section className="relative flex justify-center">
        <div className="aspect-square w-full max-w-[280px] rounded-[32px] overflow-hidden bg-slate-900 relative border border-slate-800 shadow-inner group">
          {/* Simulated scanning feed images overlay */}
          <div className="absolute inset-0 opacity-40 grayscale group-hover:grayscale-0 transition-all duration-300 pointer-events-none">
            <img 
              src="https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&q=80&w=400" 
              alt="Scan Feed Cam View" 
              className="w-full h-full object-cover"
            />
          </div>

          {/* Visual laser overlays */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {/* Holographic frame lines */}
            <div className="w-40 h-40 border-2 border-indigo-500/80 rounded-2xl relative shadow-md">
              {/* Scan glowing laser line slider overlay if scanning active */}
              <div className={`absolute left-0 right-0 h-1 bg-indigo-500 shadow-[0_0_12px_#3b82f6] ${
                scanningEffect ? 'animate-bounce' : 'top-1/2'
              }`} />
            </div>
            
            <p className="mt-4 text-[10px] text-slate-300 font-extrabold uppercase tracking-widest bg-slate-950/75 px-3 py-1 rounded-full border border-slate-800">
              {scanningEffect ? 'VARRENDO CÓDIGO...' : 'APROXIME O CÓDIGO'}
            </p>
          </div>

          {/* Overlay laser scan lines flash animation triggers */}
          {scanningEffect && (
            <div className="absolute inset-0 bg-indigo-500/10 animate-pulse duration-100" />
          )}

          {/* Camera overlay hover buttons */}
          <button 
            id="scanner-viewport-btn"
            onClick={handleScanAction}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-indigo-700 hover:bg-indigo-850 text-white px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95 transition-transform"
          >
            <Scan size={14} className="animate-spin" style={{ animationDuration: '4s' }} />
            Disparar Captura
          </button>
        </div>
      </section>

      {/* Quick shortcuts action grid */}
      <section className="grid grid-cols-2 gap-3.5">
        <button 
          id="scanner-shortcut-new"
          onClick={onOpenNewAssetForm}
          className="flex flex-col items-center justify-center p-3.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl shadow-xs transition active:scale-95"
        >
          <PlusSquare size={24} className="text-indigo-700 mb-1" />
          <span className="font-extrabold text-[11px] text-slate-700 uppercase tracking-wider">Novo Ativo</span>
        </button>

        <button 
          id="scanner-shortcut-error"
          onClick={handleReportError}
          className="flex flex-col items-center justify-center p-3.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl shadow-xs transition active:scale-95"
        >
          <AlertTriangle size={24} className="text-rose-500 mb-1" />
          <span className="font-extrabold text-[11px] text-slate-700 uppercase tracking-wider">Declarar Defeito</span>
        </button>
      </section>

      {/* List matches typical listings from mockup */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-extrabold text-xs text-slate-500 uppercase tracking-widest leading-none">Últimas Leituras de Ronda</h3>
          <span className="text-[10px] font-bold text-indigo-700 cursor-pointer hover:underline bg-indigo-50 px-2 py-0.5 rounded">Rondas SLA</span>
        </div>

        <div className="space-y-2 select-none">
          {[
            { name: "Motor AC Trifásico 15HP", sn: "884-293-XP", type: "Ativo", tagColor: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-500", time: "10:45", icon: Cpu },
            { name: "Braço Robótico KUKA L3", sn: "112-990-MN", type: "Manutenção", tagColor: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", time: "Ontem", icon: Laptop },
            { name: "Painel Elétrico Central", sn: "556-121-PL", type: "Armazenado", tagColor: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400", time: "Ontem", icon: Layers }
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <span className="p-2 bg-slate-50 text-slate-400 rounded-xl">
                  <Icon size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate leading-tight">{item.name}</p>
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
          })}
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
