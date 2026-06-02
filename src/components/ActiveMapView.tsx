/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Minus, 
  Fullscreen, 
  Info, 
  ChevronRight, 
  Cpu, 
  Battery, 
  MapPin,
  Sparkles,
  Search,
  User,
  X,
  Settings,
  Copy
} from 'lucide-react';
import { Asset, AssetStatus } from '../types';

interface Partition {
  id: string;
  label: string;
  layout: string;
}

interface Unit {
  id: string;
  name: string;
  city: string;
  address: string;
  manager: string;
  email: string;
  partitions?: Partition[];
}

interface ActiveMapViewProps {
  assets: Asset[];
  onSelectAsset: (asset: Asset) => void;
  units: Unit[];
  onAddUnit: (newUnit: Unit) => void;
  onUpdateUnitPartitions: (unitId: string, updatedPartitions: Partition[]) => void;
  onUpdateUnit?: (updatedUnit: Unit) => void;
  onUpdateAsset?: (updatedAsset: Asset) => void;
}

export default function ActiveMapView({ assets, onSelectAsset, units, onAddUnit, onUpdateUnitPartitions, onUpdateUnit, onUpdateAsset }: ActiveMapViewProps) {
  const [activeFloor, setActiveFloor] = useState<string>('office');
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);
  const [highlightedAssetId, setHighlightedAssetId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("unit-sp");
  const [isNewUnitOpen, setIsNewUnitOpen] = useState(false);
  const [isEditUnitOpen, setIsEditUnitOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(true);

  // Partition management states
  const [isManagePartitionsOpen, setIsManagePartitionsOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [partitionsFormList, setPartitionsFormList] = useState<Partition[]>([]);
  const [newPartitionName, setNewPartitionName] = useState('');
  const [newPartitionLayout, setNewPartitionLayout] = useState('office');

  // Zoom and pan states for map viewport
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // New unit form fields state
  const [newUnitForm, setNewUnitForm] = useState({
    name: '',
    city: '',
    address: '',
    manager: '',
    email: ''
  });

  const [editUnitForm, setEditUnitForm] = useState({
    id: '',
    name: '',
    city: '',
    address: '',
    manager: '',
    email: ''
  });

  const activeUnit = useMemo(() => {
    return units.find(u => u.id === selectedUnitId) || units[0] || { id: "", name: "", city: "", address: "", manager: "", email: "" };
  }, [units, selectedUnitId]);

  // Group floors labels dynamically from active unit's configured partitions
  const currentUnitPartitions = useMemo(() => {
    return activeUnit.partitions || [
      { id: 'office', label: 'Escritório', layout: 'office' },
      { id: 'cpd', label: 'CPD / Datacenter', layout: 'cpd' },
      { id: 'pista', label: 'Pista Operacional', layout: 'pista' },
      { id: 'loja', label: 'Loja / Estoque', layout: 'loja' }
    ];
  }, [activeUnit]);

  // Synchronize dynamic active floor when unit selection changes
  useEffect(() => {
    if (currentUnitPartitions.length > 0) {
      const exists = currentUnitPartitions.some(p => p.id === activeFloor);
      if (!exists) {
        setActiveFloor(currentUnitPartitions[0].id);
      }
    }
  }, [selectedUnitId, currentUnitPartitions, activeFloor]);

  const activePartition = useMemo(() => {
    return currentUnitPartitions.find(p => p.id === activeFloor) || currentUnitPartitions[0] || { id: 'office', label: 'Escritório', layout: 'office' };
  }, [currentUnitPartitions, activeFloor]);

  // Filter assets matching current floor selection and active unit selection
  const floorAssets = useMemo(() => {
    return assets.filter(a => a.unit === activeUnit.name && a.currentFloor === activeFloor);
  }, [assets, activeUnit, activeFloor]);

  // Click handler for popup toggles
  const handleMarkerClick = (assetId: string) => {
    setActivePopoverId(prev => prev === assetId ? null : assetId);
    setHighlightedAssetId(assetId);
  };

  // Zoom and pan functions
  const handleZoomIn = () => {
    setZoom(z => Math.min(z + 0.15, 2.5));
  };

  const handleZoomOut = () => {
    setZoom(z => Math.max(z - 0.15, 0.6));
  };

  const handleResetZoom = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Drag to pan logic on the map canvas
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('select') || target.closest('a') || target.closest('input')) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Unit creation form submit
  const handleCreateUnitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitForm.name) return;

    const newId = `unit-user-${Date.now()}`;
    const newUnit = {
      id: newId,
      name: newUnitForm.name,
      city: newUnitForm.city || "Não informada",
      address: newUnitForm.address || "Não informado",
      manager: newUnitForm.manager || "Sem gestor atribuído",
      email: newUnitForm.email || "contato@ativosapoio.com.br"
    };

    onAddUnit(newUnit);
    setSelectedUnitId(newId);
    setIsNewUnitOpen(false);
    setNewUnitForm({ name: '', city: '', address: '', manager: '', email: '' });
  };

  const handleEditUnitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUnitForm.name || !onUpdateUnit) return;
    onUpdateUnit(editUnitForm);
    setIsEditUnitOpen(false);
  };

  const openEditUnitModal = () => {
    setEditUnitForm({
      id: activeUnit.id,
      name: activeUnit.name,
      city: activeUnit.city,
      address: activeUnit.address,
      manager: activeUnit.manager,
      email: activeUnit.email
    });
    setIsEditUnitOpen(true);
  };

  // Open the partition manager modal & fetch current partitions as local temporary state
  const handleOpenManagePartitions = () => {
    setPartitionsFormList([...currentUnitPartitions]);
    setNewPartitionName('');
    setNewPartitionLayout('office');
    setIsManagePartitionsOpen(true);
  };

  // Add partition to local temporary state list
  const handleAddPartitionLocal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartitionName.trim()) return;

    const newId = `part-${Date.now()}`;
    const newPartition: Partition = {
      id: newId,
      label: newPartitionName.trim(),
      layout: newPartitionLayout
    };

    setPartitionsFormList(prev => [...prev, newPartition]);
    setNewPartitionName('');
  };

  // Remove partition from local temporary state list
  const handleDeletePartitionLocal = (idToRemove: string) => {
    setPartitionsFormList(prev => prev.filter(p => p.id !== idToRemove));
  };

  // Save changes to the parent State
  const handleSavePartitionsCombined = () => {
    if (partitionsFormList.length === 0) {
      alert("A unidade deve possuir pelo menos 1 partição cadastrada!");
      return;
    }
    onUpdateUnitPartitions(activeUnit.id, partitionsFormList);
    
    // Fallback if current active floor was deleted
    const currentStillExists = partitionsFormList.some(p => p.id === activeFloor);
    if (!currentStillExists) {
      setActiveFloor(partitionsFormList[0].id);
    }
    
    setIsManagePartitionsOpen(false);
  };

  // Status dot style helper
  const getStatusDotColor = (status: AssetStatus) => {
    switch (status) {
      case 'Em Uso': return 'bg-emerald-500';
      case 'Manutenção': return 'bg-amber-500';
      case 'Armazenado': return 'bg-slate-500';
      case 'Extraviado': return 'bg-rose-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div id="map-view" className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Unit Selection and Information Header */}
      <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
          <div className="space-y-1">
            <span className="text-xs font-black uppercase text-indigo-700 tracking-wider">Unidade Ativa</span>
            <div className="flex flex-wrap items-center gap-3">
              <select
                id="unit-selector-dropdown"
                value={selectedUnitId}
                onChange={(e) => {
                  setSelectedUnitId(e.target.value);
                  setHighlightedAssetId(null);
                  setActivePopoverId(null);
                  handleResetZoom();
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-lg px-4 py-2 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 outline-none cursor-pointer leading-normal"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              
              <button
                id="btn-add-unit-modal-trigger"
                onClick={() => setIsNewUnitOpen(true)}
                className="flex items-center gap-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow transition"
              >
                <Plus size={14} /> Cadastrar Unidade
              </button>
              <button
                id="btn-edit-unit-modal-trigger"
                onClick={openEditUnitModal}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm transition-all"
              >
                <Settings size={14} className="text-indigo-700" /> Editar Unidade
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedUnitId);
                  alert(`ID da unidade copiado: ${selectedUnitId}`);
                }}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm transition-all"
                title="Copiar ID da Unidade para instalar o robô"
              >
                <Copy size={14} className="text-indigo-700" /> Copiar ID
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 select-none h-fit">
              {currentUnitPartitions.map((fl) => (
                <button
                  key={fl.id}
                  id={`floor-tab-${fl.id}`}
                  onClick={() => {
                    setActiveFloor(fl.id);
                    setActivePopoverId(null);
                    setHighlightedAssetId(null);
                  }}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeFloor === fl.id
                      ? 'bg-indigo-700 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {fl.label}
                </button>
              ))}
            </div>

            <button
              id="btn-edit-partitions-trigger"
              onClick={handleOpenManagePartitions}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm transition-all"
              title="Criar, editar ou remover partições desta unidade"
            >
              <Settings size={14} className="text-indigo-700" /> Gerenciar Partições
            </button>
          </div>
        </div>

        {/* Info card describing the unit */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs text-left">
          <div>
            <span className="text-slate-400 font-mono block uppercase">Cidade / Estado</span>
            <span className="text-slate-800 font-bold mt-0.5 block">{activeUnit.city}</span>
          </div>
          <div>
            <span className="text-slate-400 font-mono block uppercase">Endereço Técnico</span>
            <span className="text-slate-800 font-semibold mt-0.5 block truncate" title={activeUnit.address}>{activeUnit.address}</span>
          </div>
          <div>
            <span className="text-slate-400 font-mono block uppercase">Gestor Geral</span>
            <span className="text-slate-800 font-bold mt-0.5 block flex items-center gap-1.5">
              <span className="w-4 h-4 bg-slate-200 rounded-full flex items-center justify-center text-[8px] font-black uppercase text-slate-600">
                {activeUnit.manager ? activeUnit.manager.split(' ').map(n=>n[0]).join('') : "UU"}
              </span>
              {activeUnit.manager}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-mono block uppercase">Ativos Cadastrados</span>
            <span className="text-indigo-700 font-black mt-0.5 block">
              {assets.filter(a => a.unit === activeUnit.name).length} ativos localizados
            </span>
          </div>
        </div>
      </section>

      {/* Main Floor Blueprint Content */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-270px)] min-h-[500px]">
        {/* Interactive Floor plan Vector canvas with dragging capabilities */}
        <div 
          className={`col-span-12 lg:col-span-9 relative bg-white border border-slate-200 rounded-3xl overflow-hidden flex items-center justify-center select-none shadow-sm min-h-[440px] ${
            zoom > 1 ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Radial grid dots bg */}
          <div 
            className="absolute inset-0 opacity-45 pointer-events-none" 
            style={{ 
              backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
              backgroundSize: '24px 24px' 
            }} 
          />

          {/* Blueprint SVG Vector Plan of selected floor, subject to zoom & Pan translations */}
          <div 
            className="relative w-[90%] h-[90%] max-w-[700px] max-h-[500px]"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 150ms ease-out',
            }}
          >
            <svg 
              className="w-full h-full drop-shadow-sm transition-all" 
              viewBox="0 0 800 600"
              style={{ strokeLinecap: 'round', strokeLinejoin: 'round' }}
            >
              {/* Outer structural bounds */}
              <rect 
                x="30" 
                y="30" 
                width="740" 
                height="540" 
                rx="16" 
                fill="none" 
                stroke="#475569" 
                strokeWidth="4" 
              />

              {/* Room separations depending on activePartition layout style */}
              {activePartition.layout === 'office' && (
                <>
                  {/* Office Sections */}
                  <rect x="32" y="32" width="220" height="280" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
                  <rect x="252" y="32" width="240" height="280" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" />
                  <rect x="32" y="312" width="460" height="256" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
                  <rect x="492" y="32" width="276" height="536" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />

                  {/* Room Text Annotations */}
                  <text x="142" y="160" fill="#475569" className="text-xs font-bold font-sans fill-slate-500" textAnchor="middle">ESCRITÓRIO A</text>
                  <text x="372" y="160" fill="#475569" className="text-xs font-bold font-sans fill-slate-500" textAnchor="middle">SALA DE REUNIÃO</text>
                  <text x="262" y="440" fill="#475569" className="text-xs font-bold font-sans fill-slate-500" textAnchor="middle">ESCRITÓRIO CENTRAL B</text>
                  <text x="630" y="300" fill="#475569" className="text-xs font-bold font-sans fill-slate-500" textAnchor="middle">LOUNGE PRINCIPAL</text>
                </>
              )}

              {activePartition.layout === 'cpd' && (
                <>
                  {/* Datacenter row maps */}
                  <rect x="32" y="32" width="350" height="536" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
                  <rect x="382" y="32" width="386" height="300" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" />
                  <rect x="382" y="332" width="386" height="236" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />

                  {/* Corridors racks */}
                  <rect x="80" y="80" width="80" height="400" rx="4" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
                  <rect x="220" y="80" width="80" height="400" rx="4" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />

                  {/* CPD annotations */}
                  <text x="120" y="270" fill="#475569" className="text-xs font-black font-sans fill-slate-700" textAnchor="middle">RACK COLUNA - A</text>
                  <text x="260" y="270" fill="#475569" className="text-xs font-black font-sans fill-slate-700" textAnchor="middle">RACK COLUNA - B</text>
                  <text x="575" y="180" fill="#475569" className="text-xs font-bold font-sans fill-slate-500" textAnchor="middle">SALA DE OPERAÇÕES</text>
                  <text x="575" y="450" fill="#475569" className="text-xs font-bold font-sans fill-slate-500" textAnchor="middle">SALA DO NOBREAK</text>
                </>
              )}

              {activePartition.layout === 'pista' && (
                <>
                  {/* Pista Operacional */}
                  <rect x="32" y="32" width="500" height="350" fill="#fafafa" stroke="#94a3b8" strokeWidth="2" />
                  <rect x="532" y="32" width="236" height="536" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
                  <rect x="32" y="382" width="500" height="186" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" />

                  <text x="282" y="200" fill="#475569" className="text-xs font-bold font-sans fill-slate-500" textAnchor="middle">PISTA OPERACIONAL SUL</text>
                  <text x="650" y="280" fill="#475569" className="text-xs font-bold font-sans fill-slate-500" textAnchor="middle">DOCAS DE RECEPÇÃO</text>
                  <text x="282" y="470" fill="#475569" className="text-xs font-bold font-sans fill-slate-500" textAnchor="middle">MANUTENÇÃO / OFICINA</text>
                </>
              )}

              {activePartition.layout === 'loja' && (
                <>
                  {/* CD Logistico blueprint */}
                  <rect x="32" y="32" width="736" height="200" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
                  <rect x="32" y="232" width="400" height="336" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" />
                  <rect x="432" y="232" width="336" height="336" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />

                  {/* Shelves racks */}
                  <rect x="80" y="280" width="280" height="50" rx="4" fill="#e2e8f0" stroke="#94a3b8" />
                  <rect x="80" y="370" width="280" height="50" rx="4" fill="#e2e8f0" stroke="#94a3b8" />
                  <rect x="80" y="460" width="280" height="50" rx="4" fill="#e2e8f0" stroke="#94a3b8" />

                  <text x="400" y="130" fill="#475569" className="text-xs font-bold font-sans fill-slate-500" textAnchor="middle">LOJA PRINCIPAL DE VENDAS</text>
                  <text x="220" y="310" fill="#475569" className="text-xs font-bold font-sans fill-slate-500" textAnchor="middle text-[9px]">GAVETEIROS RACK DE ESTOQUE A</text>
                  <text x="600" y="400" fill="#475569" className="text-xs font-bold font-sans fill-slate-500" textAnchor="middle">ZONA DE EMBALAGEM / LOGÍSTICA</text>
                </>
              )}
            </svg>

            {/* Render dynamic marker buttons placed absolute on top of the SVG coordinates map */}
            {floorAssets.map((asset) => {
              const xPos = asset.mapCoordinates.x;
              const yPos = asset.mapCoordinates.y;
              const isPopoverOpen = activePopoverId === asset.id;
              const isFocused = highlightedAssetId === asset.id;

              return (
                <div 
                  key={asset.id} 
                  className="absolute z-10"
                  style={{ left: `${xPos}%`, top: `${yPos}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <div className="relative">
                    {/* Pulsating marker element of selected status */}
                    <button
                      id={`map-marker-dot-${asset.id}`}
                      onClick={() => handleMarkerClick(asset.id)}
                      className={`w-5 h-5 rounded-full border-2 border-white shadow-md cursor-pointer transition-transform duration-300 relative flex items-center justify-center active:scale-95 ${
                        isFocused ? 'scale-130 ring-4 ring-indigo-500/50' : 'hover:scale-125'
                      } ${getStatusDotColor(asset.status)}`}
                    >
                      {/* Inner pulsate animation ring for premium feel */}
                      {asset.status === 'Em Uso' && (
                        <span className="absolute inset-0 rounded-full bg-inherit animate-ping opacity-35" />
                      )}
                    </button>

                    {/* Highly stylized detail hover popup popover card */}
                    {isPopoverOpen && (
                      <div 
                        id={`map-marker-popover-${asset.id}`}
                        className="absolute bottom-7 left-1/2 -translate-x-1/2 w-52 bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-700 z-30 animate-slide-up"
                      >
                        <p className="font-bold text-xs truncate leading-tight">{asset.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{asset.id}</p>

                        <div className="flex items-center gap-1.5 mt-2 mb-3 bg-slate-800 px-2 py-1 rounded-lg w-fit">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            asset.status === 'Em Uso' ? 'bg-emerald-400' :
                            asset.status === 'Manutenção' ? 'bg-amber-400' : 'bg-slate-400'
                          }`} />
                          <span className="text-[9px] font-black uppercase tracking-wider">{asset.status}</span>
                        </div>

                        <button 
                          id={`map-view-details-link-${asset.id}`}
                          onClick={() => onSelectAsset(asset)}
                          className="w-full py-1 text-center bg-indigo-700 hover:bg-indigo-800 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-center gap-1 leading-none"
                        >
                          Ver Ficha Técnica <ChevronRight size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dynamic Drag Alert Prompt Banner */}
          {zoom > 1 && (
            <div className="absolute top-4 right-4 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs animate-pulse select-none z-20">
              <Info size={12} /> Clique e arraste para navegar no mapa
            </div>
          )}

          {/* Real Zoom Controls panel */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-20">
            <button 
              onClick={handleZoomIn}
              className="w-10 h-10 bg-slate-950/80 hover:bg-slate-900 text-white rounded-xl flex items-center justify-center transition shadow-md active:scale-90"
              title="Aumentar Zoom (+)"
            >
              <Plus size={18} />
            </button>
            <button 
              onClick={handleZoomOut}
              className="w-10 h-10 bg-slate-950/80 hover:bg-slate-900 text-white rounded-xl flex items-center justify-center transition shadow-md active:scale-90"
              title="Diminuir Zoom (-)"
            >
              <Minus size={18} />
            </button>
            <button 
              onClick={handleResetZoom}
              className="w-10 h-10 bg-slate-950/80 hover:bg-slate-900 text-white rounded-xl flex items-center justify-center transition shadow-md active:scale-90"
              title="Centralizar / Resetar Zoom"
            >
              <Fullscreen size={18} />
            </button>
          </div>

          {/* Collapsible non-blocking Legend Overlay indicator */}
          <div className="absolute top-6 left-6 z-20 text-left">
            {isLegendOpen ? (
              <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-lg flex flex-col gap-2.5 w-44 transition-all animate-fade-in">
                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 mb-0.5">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 leading-none">Legenda de Status</h4>
                  <button 
                    onClick={() => setIsLegendOpen(false)}
                    className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded transition"
                    title="Ocultar Legenda"
                  >
                    <Minus size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-bold text-slate-700">Em Uso</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-[11px] font-bold text-slate-700">Manutenção</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                  <span className="text-[11px] font-bold text-slate-700">Armazenado</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-[11px] font-bold text-slate-700">Extraviado</span>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setIsLegendOpen(true)}
                className="bg-white/95 backdrop-blur-md px-3 py-2.5 rounded-2xl border border-slate-200/80 shadow-md hover:bg-slate-50 transition flex items-center gap-2 text-xs font-bold text-slate-700"
                title="Expandir Legenda de Status"
              >
                <span className="flex gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                </span>
                <span>Ver Legenda</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Assets in active view sidebar */}
        <div className="col-span-12 lg:col-span-3 flex flex-col h-full overflow-hidden bg-white border border-slate-200 rounded-3xl min-w-[240px]">
          <div className="p-4 border-b border-slate-150 flex justify-between items-center bg-slate-50 rounded-t-3xl select-none">
            <div className="text-left">
              <h3 className="font-bold text-slate-900 text-[14px]">Ativos nesta Vista</h3>
              <p className="text-[10px] text-slate-400 truncate max-w-[160px]">Partição: {currentUnitPartitions.find(f=>f.id===activeFloor)?.label || activeFloor}</p>
            </div>
            <span className="bg-indigo-100 text-indigo-900 text-[10px] px-2 py-0.5 rounded-full font-black">
              {floorAssets.length}
            </span>
          </div>

          {/* List items dynamic mapping */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar select-none text-left">
            {floorAssets.length === 0 ? (
              <div className="text-center py-20 flex flex-col items-center">
                <MapPin size={24} className="text-slate-300 animate-bounce mb-2" />
                <p className="text-slate-400 text-xs mb-4">Nenhum ativo localizado neste piso físico.</p>
                <button
                  onClick={() => setIsAllocateModalOpen(true)}
                  className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1 transition"
                >
                  <Plus size={14} /> Alocar Ativo Aqui
                </button>
              </div>
            ) : (
              floorAssets.map((asset) => {
                const isSelected = highlightedAssetId === asset.id;
                return (
                  <div
                    key={asset.id}
                    id={`map-sidebar-item-${asset.id}`}
                    onClick={() => {
                      setHighlightedAssetId(asset.id);
                      setActivePopoverId(asset.id);
                    }}
                    className={`p-3 border rounded-xl hover:border-indigo-600 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-indigo-600 bg-indigo-50/40' 
                        : 'border-slate-100 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-slate-800 text-xs truncate max-w-[150px] leading-tight">{asset.name}</p>
                      <span className={`w-2 h-2 rounded-full mt-1 ${getStatusDotColor(asset.status)}`} />
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">{asset.id} • {asset.location}</p>
                    
                    <div className="mt-3 flex items-center justify-between pointer-events-none">
                      <div className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600 leading-none">
                          {asset.responsible.initials}
                        </span>
                        <span className="text-[9px] text-slate-400 capitalize truncate max-w-[80px]">{asset.responsible.name.split(' ')[0]}</span>
                      </div>
                      
                      <span className="text-[9px] text-indigo-700 font-bold uppercase tracking-widest bg-indigo-50 px-1.5 py-0.5 rounded">
                        REVISÃO: ALTA
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            
            {floorAssets.length > 0 && (
              <button
                onClick={() => setIsAllocateModalOpen(true)}
                className="w-full mt-4 py-3 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-600 font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 transition"
              >
                <Plus size={16} /> Alocar Outro Ativo
              </button>
            )}
          </div>
        </div>
      </section>

      {/* PARTITION MANAGEMENT MODAL */}
      {isManagePartitionsOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900">Gerenciar Partições</h3>
                <p className="text-sm text-slate-500">Configure os pisos e setores visuais da unidade {activeUnit.name}</p>
              </div>
              <button 
                onClick={() => setIsManagePartitionsOpen(false)}
                className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="space-y-4">
                {currentUnitPartitions.map((part, index) => (
                  <div key={part.id} className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <input 
                        type="text"
                        value={part.label}
                        onChange={(e) => {
                          const newParts = [...currentUnitPartitions];
                          newParts[index].label = e.target.value;
                          onUpdateUnitPartitions(activeUnit?.id || '', newParts);
                        }}
                        className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium text-slate-700"
                      />
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={() => {
                    const newId = `part-${Date.now()}`;
                    onUpdateUnitPartitions(activeUnit?.id || '', [
                      ...currentUnitPartitions,
                      { id: newId, label: "Novo Setor", layout: "default" }
                    ]);
                  }}
                  className="w-full py-3 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-600 font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 transition"
                >
                  <Plus size={18} /> Adicionar Nova Partição
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ALLOCATE ASSET MODAL */}
      {isAllocateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <MapPin size={24} className="text-indigo-600" />
                  Alocar Ativo
                </h3>
                <p className="text-sm text-slate-500 mt-1">Selecione um ativo para enviar para <strong className="text-indigo-600">{currentUnitPartitions.find(f=>f.id===activeFloor)?.label}</strong></p>
              </div>
              <button 
                onClick={() => setIsAllocateModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-3">
                {assets.filter(a => a.unit === activeUnit.name && a.currentFloor !== activeFloor).length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-500 font-medium">Não há ativos não-alocados nesta unidade.</p>
                  </div>
                ) : (
                  assets.filter(a => a.unit === activeUnit.name && a.currentFloor !== activeFloor).map((asset) => (
                    <div key={asset.id} className="flex justify-between items-center p-4 border border-slate-200 rounded-2xl hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{asset.name}</h4>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{asset.patrimonio}</p>
                      </div>
                      <button
                        onClick={() => {
                          if (onUpdateAsset) {
                            onUpdateAsset({
                              ...asset,
                              currentFloor: activeFloor,
                              mapCoordinates: { x: 50, y: 50 }
                            });
                          }
                          setIsAllocateModalOpen(false);
                        }}
                        className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-xl text-xs font-bold transition-transform active:scale-95"
                      >
                        Mover para cá
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Dialog for New Unit creation */}
      {isNewUnitOpen && (
        <div id="new-unit-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-250 animate-zoom-in leading-normal text-left">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="text-indigo-700" size={20} />
                  Criar Nova Unidade
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Cadastre um novo polo físico para controle de ativos.</p>
              </div>
              <button 
                id="close-new-unit-modal"
                onClick={() => setIsNewUnitOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUnitSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Nome Comercial da Unidade *</label>
                <input 
                  type="text" 
                  id="form-unit-name"
                  placeholder="Ex: Filial - Belo Horizonte" 
                  value={newUnitForm.name}
                  onChange={(e) => setNewUnitForm(p => ({ ...p, name: e.target.value }))}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Cidade / UF *</label>
                  <input 
                    type="text" 
                    id="form-unit-city"
                    placeholder="Ex: Belo Horizonte / MG" 
                    value={newUnitForm.city}
                    onChange={(e) => setNewUnitForm(p => ({ ...p, city: e.target.value }))}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Responsável Geral *</label>
                  <input 
                    type="text" 
                    id="form-unit-manager"
                    placeholder="Ex: Amanda Santos" 
                    value={newUnitForm.manager}
                    onChange={(e) => setNewUnitForm(p => ({ ...p, manager: e.target.value }))}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Endereço Completo</label>
                <input 
                  type="text" 
                  id="form-unit-address"
                  placeholder="Ex: Av. do Contorno, 5000 - Savassi" 
                  value={newUnitForm.address}
                  onChange={(e) => setNewUnitForm(p => ({ ...p, address: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">E-mail Administrativo</label>
                <input 
                  type="email" 
                  id="form-unit-email"
                  placeholder="Ex: bh.filial@ativosapoio.com.br" 
                  value={newUnitForm.email}
                  onChange={(e) => setNewUnitForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 text-xs font-bold border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsNewUnitOpen(false)}
                  className="px-4 py-2 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-indigo-700 hover:bg-indigo-800 text-white px-5 py-2 rounded-xl shadow"
                >
                  Cadastrar Unidade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Dialog for Edit Unit */}
      {isEditUnitOpen && (
        <div id="edit-unit-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-250 animate-zoom-in leading-normal text-left">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Settings className="text-indigo-700" size={20} />
                  Editar Unidade
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Altere os dados comerciais do polo físico.</p>
              </div>
              <button 
                onClick={() => setIsEditUnitOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditUnitSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Nome Comercial da Unidade *</label>
                <input 
                  type="text" 
                  value={editUnitForm.name}
                  onChange={(e) => setEditUnitForm(p => ({ ...p, name: e.target.value }))}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Cidade / UF *</label>
                  <input 
                    type="text" 
                    value={editUnitForm.city}
                    onChange={(e) => setEditUnitForm(p => ({ ...p, city: e.target.value }))}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Responsável Geral *</label>
                  <input 
                    type="text" 
                    value={editUnitForm.manager}
                    onChange={(e) => setEditUnitForm(p => ({ ...p, manager: e.target.value }))}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Endereço Completo</label>
                <input 
                  type="text" 
                  value={editUnitForm.address}
                  onChange={(e) => setEditUnitForm(p => ({ ...p, address: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">E-mail Administrativo</label>
                <input 
                  type="email" 
                  value={editUnitForm.email}
                  onChange={(e) => setEditUnitForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-600 focus:bg-white outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 text-xs font-bold border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsEditUnitOpen(false)}
                  className="px-4 py-2 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-indigo-700 hover:bg-indigo-800 text-white px-5 py-2 rounded-xl shadow"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Partitions Manager Modal */}
      {isManagePartitionsOpen && (
        <div id="partitions-manager-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 w-full max-w-lg max-h-[85vh] overflow-y-auto flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1 text-left">
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Settings className="text-indigo-750 text-indigo-600" size={20} />
                    Configurar Partições
                  </h3>
                  <p className="text-slate-500 text-xs leading-normal">
                    Edite ou crie as partições/setores de <strong>{activeUnit.name}</strong>. Cada partição define um setor do mapa.
                  </p>
                </div>
                <button 
                  onClick={() => setIsManagePartitionsOpen(false)}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition"
                  title="Fechar"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Editable Partitions List */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                <label className="block text-[11px] font-black uppercase text-slate-400 tracking-wider text-left">Setores Cadastrados</label>
                {partitionsFormList.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                    <p className="text-slate-400 text-xs">Nenhum setor cadastrado para esta unidade. Adicione um abaixo!</p>
                  </div>
                ) : (
                  partitionsFormList.map((part, index) => (
                    <div key={part.id} className="flex flex-wrap md:flex-nowrap items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-2xl">
                      <input
                        type="text"
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        value={part.label}
                        onChange={(e) => {
                          const newVal = e.target.value;
                          setPartitionsFormList(prev => prev.map((p, idx) => idx === index ? { ...p, label: newVal } : p));
                        }}
                        placeholder="Nome do Setor"
                        required
                      />
                      <select
                        className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer"
                        value={part.layout}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPartitionsFormList(prev => prev.map((p, idx) => idx === index ? { ...p, layout: val } : p));
                        }}
                      >
                        <option value="office">Layout: Escritório</option>
                        <option value="cpd">Layout: CPD / Rede</option>
                        <option value="pista">Layout: Pista Operacional</option>
                        <option value="loja">Layout: Estoque</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleDeletePartitionLocal(part.id)}
                        className="p-1.5 bg-white hover:bg-rose-50 border border-slate-200 text-slate-400 hover:text-rose-600 rounded-xl transition shadow-xs"
                        title="Remover partição"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Partition Section */}
              <form onSubmit={handleAddPartitionLocal} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-3 shadow-xs">
                <h4 className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">Adicionar Novo Setor</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Nome do Setor / Partição *</label>
                    <input
                      type="text"
                      placeholder="Ex: Mezanino, Doca C"
                      value={newPartitionName}
                      onChange={(e) => setNewPartitionName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Fundo Visual Técnico *</label>
                    <select
                      value={newPartitionLayout}
                      onChange={(e) => setNewPartitionLayout(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:ring-2 focus:ring-indigo-600 outline-none cursor-pointer"
                    >
                      <option value="office">Escritório Corporativo</option>
                      <option value="cpd">CPD / Computador de rede</option>
                      <option value="pista">Pista Operacional / Logística</option>
                      <option value="loja">Loja / Armazém de Estoque</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 shadow-sm"
                >
                  <Plus size={12} /> Adicionar na Lista
                </button>
              </form>
            </div>

            <div className="pt-4 mt-5 flex justify-end gap-2 text-xs font-bold border-t border-slate-100">
              <button 
                type="button"
                onClick={() => setIsManagePartitionsOpen(false)}
                className="px-4 py-2 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleSavePartitionsCombined}
                className="bg-indigo-700 hover:bg-indigo-800 text-white px-5 py-2 rounded-xl shadow"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
