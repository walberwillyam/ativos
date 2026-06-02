/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Laptop, 
  Trash2, 
  RefreshCw, 
  ChevronRight, 
  Filter, 
  MoreVertical,
  Plus,
  Upload,
  Download,
  Search,
  Monitor,
  Printer,
  Cpu,
  Layers,
  Wrench,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  FileSpreadsheet,
  Wifi,
  Archive,
  Tags
} from 'lucide-react';
import { Asset, AssetStatus, ActiveScreen, Category } from '../types';
import { supabase } from '../lib/supabaseClient';

interface InventoryViewProps {
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  onSelectAsset: (asset: Asset) => void;
  onAddActivity: (activity: {
    type: string;
    title: string;
    details: string;
    by: string;
    icon: string;
    badgeColor: string;
  }) => void;
  units: Array<{ 
    id: string; 
    name: string; 
    city: string; 
    address: string; 
    manager: string; 
    email: string; 
    partitions?: Array<{ id: string; label: string; layout: string }>;
  }>;
  categories?: Category[];
}

export default function InventoryView({ assets, setAssets, onSelectAsset, onAddActivity, units, categories = [] }: InventoryViewProps) {
  // Filters state
  const [selectedUnit, setSelectedUnit] = useState('Todas as Unidades');
  const [selectedCategory, setSelectedCategory] = useState('Todas Categorias');
  const [selectedStatus, setSelectedStatus] = useState('Qualquer Status');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Bulk Select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Controls for Modals
  const [isNewAssetOpen, setIsNewAssetOpen] = useState(false);
  const [isBulkTransferOpen, setIsBulkTransferOpen] = useState(false);
  const [isBulkStatusOpen, setIsBulkStatusOpen] = useState(false);

  // Form Fields state for New Asset
  const [newAssetForm, setNewAssetForm] = useState({
    name: '',
    patrimonio: '',
    category: 'Notebooks',
    model: '',
    serialNumber: '',
    unit: 'Matriz - São Paulo',
    location: 'Escritório Sala A',
    currentFloor: 'office',
    status: 'Em Uso' as AssetStatus,
    value: '',
    acquisitionDate: '2026-06-01',
    warrantyExpiry: '2028-06-01',
    responsibleName: 'Ricardo Mendes',
    processor: '',
    ram: '',
    storage: ''
  });

  // Bulk edits helpers
  const [bulkTargetUnit, setBulkTargetUnit] = useState('Matriz - São Paulo');
  const [bulkTargetStatus, setBulkTargetStatus] = useState<AssetStatus>('Em Uso');

  // Available unique fields for filters lists
  const unitsList = useMemo(() => {
    const list = new Set([
      'Todas as Unidades',
      ...units.map(u => u.name),
      ...assets.map(a => a.unit)
    ]);
    return Array.from(list);
  }, [units, assets]);

  const categoriesList = useMemo(() => {
    const list = new Set(assets.map(a => a.category));
    if (categories && categories.length > 0) {
      categories.forEach(c => list.add(c.name));
    }
    return ['Todas Categorias', ...Array.from(list).sort()];
  }, [assets, categories]);

  const statusesList = ['Qualquer Status', 'Em Uso', 'Manutenção', 'Armazenado', 'Extraviado'];

  // Apply filters in client side memory
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      // 1. Search term match name, category, model, serial, id, or responsible
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesQuery = 
          asset.name.toLowerCase().includes(query) ||
          asset.id.toLowerCase().includes(query) ||
          asset.serialNumber.toLowerCase().includes(query) ||
          asset.patrimonio.toLowerCase().includes(query) ||
          asset.model.toLowerCase().includes(query) ||
          asset.category.toLowerCase().includes(query) ||
          asset.responsible.name.toLowerCase().includes(query);
        
        if (!matchesQuery) return false;
      }

      // 2. Unit match
      if (selectedUnit !== 'Todas as Unidades' && asset.unit !== selectedUnit) {
        return false;
      }

      // 3. Category match
      if (selectedCategory !== 'Todas Categorias' && asset.category !== selectedCategory) {
        return false;
      }

      // 4. Status match
      if (selectedStatus !== 'Qualquer Status' && asset.status !== selectedStatus) {
        return false;
      }

      // 5. Acquisition date match
      if (startDate && asset.acquisitionDate < startDate) {
        return false;
      }
      if (endDate && asset.acquisitionDate > endDate) {
        return false;
      }

      return true;
    });
  }, [assets, searchTerm, selectedUnit, selectedCategory, selectedStatus, startDate, endDate]);

  // Handle Multi-selection
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredAssets.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  // Create individual item categories with representative Lucide icons
  const getCategoryIcon = (categoryName: string) => {
    const cat = categories.find(c => c.name === categoryName);
    if (cat?.icon === 'Laptop') return <Laptop size={14} className="text-indigo-600" />;
    if (cat?.icon === 'Monitor') return <Monitor size={14} className="text-emerald-600" />;
    if (cat?.icon === 'Cpu') return <Cpu size={14} className="text-violet-600" />;
    if (cat?.icon === 'Printer') return <Printer size={14} className="text-slate-600 dark:text-slate-300" />;
    if (cat?.icon === 'Wifi') return <Wifi size={14} className="text-sky-600" />;
    if (cat?.icon === 'Archive') return <Archive size={14} className="text-amber-600" />;
    
    switch (categoryName) {
      case 'Notebooks': return <Laptop size={14} className="text-indigo-600" />;
      case 'Monitores': return <Monitor size={14} className="text-emerald-600" />;
      case 'Switches': return <Cpu size={14} className="text-violet-600" />;
      case 'Impressoras': return <Printer size={14} className="text-slate-600 dark:text-slate-300" />;
      default: return <Tags size={14} className="text-slate-400 dark:text-slate-500" />;
    }
  };

  // Render pretty status badges
  const getStatusBadge = (status: AssetStatus) => {
    let classes = 'bg-slate-100 text-slate-700 border-slate-200 dark:border-slate-700';
    let dotColor = 'bg-slate-400';

    if (status === 'Em Uso') {
      classes = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      dotColor = 'bg-emerald-500';
    } else if (status === 'Manutenção') {
      classes = 'bg-amber-50 text-amber-700 border-amber-300';
      dotColor = 'bg-amber-500';
    } else if (status === 'Extraviado') {
      classes = 'bg-rose-50 text-rose-700 border-rose-200';
      dotColor = 'bg-rose-500';
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${classes}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        {status}
      </span>
    );
  };

  // Clear filters trigger
  const handleClearFilters = () => {
    setSelectedUnit('Todas as Unidades');
    setSelectedCategory('Todas Categorias');
    setSelectedStatus('Qualquer Status');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
  };

  // Submit asset registration form
  const handleCreateAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetForm.name || !newAssetForm.model) {
      alert("Por favor, preencha o Nome e o Modelo do ativo.");
      return;
    }

    const randomIDNum = Math.floor(1000 + Math.random() * 9000);
    const newID = `KINETIC-${randomIDNum}`;
    const cleanPatrimonio = newAssetForm.patrimonio || `#PAT-${randomIDNum}`;

    const newAsset: Asset = {
      id: newID,
      patrimonio: cleanPatrimonio,
      name: newAssetForm.name,
      category: newAssetForm.category,
      model: newAssetForm.model,
      serialNumber: newAssetForm.serialNumber || `SN-${randomIDNum}-X`,
      unit: newAssetForm.unit,
      location: newAssetForm.location,
      currentFloor: newAssetForm.currentFloor || (newAssetForm.category === 'Hardware de Rede' ? 'cpd' : 'office'),
      mapCoordinates: { x: Math.floor(15 + Math.random() * 70), y: Math.floor(15 + Math.random() * 70) },
      responsible: {
        name: newAssetForm.responsibleName,
        initials: newAssetForm.responsibleName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
      },
      status: newAssetForm.status,
      value: parseFloat(newAssetForm.value) || 2500.00,
      acquisitionDate: newAssetForm.acquisitionDate,
      warrantyExpiry: newAssetForm.warrantyExpiry,
      specifications: {
        ...(newAssetForm.processor ? { "Processador": newAssetForm.processor } : {}),
        ...(newAssetForm.ram ? { "Memória RAM": newAssetForm.ram } : {}),
        ...(newAssetForm.storage ? { "Armazenamento": newAssetForm.storage } : {}),
        "Sistema Operacional": "Homologado Corporativo"
      },
      history: [
        {
          id: `hist-auto-${Date.now()}`,
          title: "Ativo Cadastrado no Sistema",
          responsible: newAssetForm.responsibleName,
          date: newAssetForm.acquisitionDate,
          time: "10:00",
          type: "creation",
          description: `Patrimônio inicial registrado no almoxarifado de ${newAssetForm.unit}.`
        }
      ],
      imageUrl: newAssetForm.category === 'Notebooks' 
        ? "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=800"
        : "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=800"
    };

    setAssets(prev => [newAsset, ...prev]);
    setIsNewAssetOpen(false);

    // Save to DB
    supabase.from('assets').insert([newAsset]).then();

    // Add logging check to Dashboard activities
    onAddActivity({
      type: "creation",
      title: "Ativo Cadastrado",
      details: `${newAsset.name} (#${newAsset.id}) cadastrado com sucesso.`,
      by: newAssetForm.responsibleName,
      icon: "add_circle",
      badgeColor: "bg-indigo-600"
    });

    // Reset Form to initial
    setNewAssetForm({
      name: '',
      patrimonio: '',
      category: 'Notebooks',
      model: '',
      serialNumber: '',
      unit: 'Matriz - São Paulo',
      location: 'Escritório Sala A',
      status: 'Em Uso',
      value: '',
      acquisitionDate: '2026-06-01',
      warrantyExpiry: '2028-06-01',
      responsibleName: 'Ricardo Mendes',
      processor: '',
      ram: '',
      storage: ''
    });

    alert(`Ativo ${newID} registrado com sucesso!`);
  };

  // Bulk Status change handler
  const handleBulkStatusChangeSubmit = () => {
    if (selectedIds.length === 0) return;
    setAssets(prev => prev.map(a => {
      if (selectedIds.includes(a.id)) {
        // Append history entry
        const historyEntry = {
          id: `hist-bulk-${Date.now()}-${a.id}`,
          title: "Alteração de Status em Lote",
          responsible: "Administrador Geral",
          date: "2026-06-01",
          time: "12:00",
          type: "maintenance" as const,
          description: `Fase operacional atualizada em lote para: ${bulkTargetStatus}.`
        };
        return {
          ...a,
          status: bulkTargetStatus,
          history: [historyEntry, ...a.history]
        };
      }
      return a;
    }));

    // Save to DB
    supabase.from('assets')
      .update({ status: bulkTargetStatus })
      .in('id', selectedIds)
      .then();

    onAddActivity({
      type: "maintenance",
      title: "Alteração Status em Lote",
      details: `Status de ${selectedIds.length} ativos modificado para ${bulkTargetStatus}.`,
      by: "Administrador",
      icon: "build",
      badgeColor: "bg-amber-500"
    });

    setIsBulkStatusOpen(false);
    setSelectedIds([]);
    alert(`Status de ${selectedIds.length} ativos foi redefinido para "${bulkTargetStatus}"!`);
  };

  // Bulk Transfer handler
  const handleBulkTransferSubmit = () => {
    if (selectedIds.length === 0) return;
    setAssets(prev => prev.map(a => {
      if (selectedIds.includes(a.id)) {
        const historyEntry = {
          id: `hist-bulk-${Date.now()}-${a.id}`,
          title: `Transferido em Lote`,
          responsible: "Administrador Geral",
          date: "2026-06-01",
          time: "12:00",
          type: "transfer" as const,
          description: `Localização de polo físico corporativo transferido em lote para: ${bulkTargetUnit}.`
        };
        return {
          ...a,
          unit: bulkTargetUnit,
          history: [historyEntry, ...a.history]
        };
      }
      return a;
    }));

    // Save to DB
    supabase.from('assets')
      .update({ unit: bulkTargetUnit })
      .in('id', selectedIds)
      .then();

    onAddActivity({
      type: "transfer",
      title: "Carga Transferida em Lote",
      details: `${selectedIds.length} ativos movimentados para polo ${bulkTargetUnit}.`,
      by: "Administrador",
      icon: "sync_alt",
      badgeColor: "bg-emerald-500"
    });

    setIsBulkTransferOpen(false);
    setSelectedIds([]);
    alert(`${selectedIds.length} ativos foram transferidos com sucesso para "${bulkTargetUnit}"!`);
  };

  // Bulk Delete / Low asset handler
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Deseja realmente dar BAIXA (excluir permanentemente) nestes ${selectedIds.length} ativos patrimoniais do sistema? Esta ação é irreversível.`)) {
      return;
    }

    setAssets(prev => prev.filter(a => !selectedIds.includes(a.id)));

    // Save to DB
    supabase.from('assets')
      .delete()
      .in('id', selectedIds)
      .then();

    onAddActivity({
      type: "maintenance",
      title: "Baixa de Ativos / Descarte",
      details: `Concluído processo de baixa operacional em lote para ${selectedIds.length} itens.`,
      by: "Administrador",
      icon: "build",
      badgeColor: "bg-rose-500"
    });

    setSelectedIds([]);
    alert(`Cursos de descarte e baixa finalizados com êxito!`);
  };

  return (
    <div id="inventory-view" className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header action menu */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Gestão de Ativos</h2>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Visualize, filtre e gerencie o ciclo de vida completo de seus ativos de TI e mobiliário corporativos.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            id="btn-import-assets"
            onClick={() => alert("Função de importação de planilhas de ativos. Formato compatível: .CSV ou .XLSX corporativo padrão.")}
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Upload size={14} />
            Importar CSV
          </button>

          <button 
            id="btn-export-all-assets"
            onClick={() => alert("Planilha de inventário completa gerada e baixada com sucesso (formato XLSX).")}
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Download size={14} />
            Exportar XLS
          </button>

          <button 
            id="btn-add-asset-trigger"
            onClick={() => setIsNewAssetOpen(true)}
            className="bg-indigo-700 hover:bg-indigo-800 text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow transition-transform active:scale-95"
          >
            <Plus size={16} />
            Novo Ativo
          </button>
        </div>
      </section>

      {/* Advanced Filters Section */}
      <section className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        {/* Dynamic Search box */}
        <div className="relative w-full max-w-lg">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input 
            type="text"
            id="asset-search-box"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por ID, Nome, Nº Patrimônio, Série, Modelo, Responsável..."
            className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm w-full focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400 dark:text-slate-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          {/* Unit Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Unidade / Polo</label>
            <select 
              id="filter-unit-select"
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 transition-all cursor-pointer"
            >
              {unitsList.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Categoria de Ativo</label>
            <select 
              id="filter-category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 transition-all cursor-pointer"
            >
              {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Estado de Operação</label>
            <select 
              id="filter-status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 transition-all cursor-pointer"
            >
              {statusesList.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>

          {/* Date range filter */}
          <div className="md:col-span-2 flex items-center gap-2">
            <div className="w-1/2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Apenas após</label>
              <input 
                type="date"
                id="filter-start-date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 transition-all"
              />
            </div>
            <div className="w-1/2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Apenas antes</label>
              <input 
                type="date"
                id="filter-end-date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Clear Filters Action button */}
        <div className="flex justify-end pt-2">
          <button 
            id="btn-clear-filters"
            onClick={handleClearFilters}
            className="text-indigo-600 font-semibold text-xs hover:underline flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg active:scale-95"
          >
            <Filter size={12} />
            Limpar Todos Filtros
          </button>
        </div>
      </section>

      {/* Bulk Actions Toolbar (Only when active checkboxes are checked) */}
      {selectedIds.length > 0 && (
        <section className="bg-indigo-900 text-white px-5 py-3 rounded-2xl border border-indigo-700 shadow-lg flex flex-col md:flex-row justify-between items-center gap-3 animate-fade-in select-none">
          <div className="flex items-center gap-3 text-sm font-bold">
            <span className="bg-indigo-300 text-indigo-950 text-xs px-2.5 py-1 rounded-full font-black">
              {selectedIds.length}
            </span>
            <span>Ativos corporativos selecionados para edição conjunta</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button 
              id="bulk-btn-transfer"
              onClick={() => setIsBulkTransferOpen(true)}
              className="text-xs bg-indigo-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1 transition-colors"
            >
              <RefreshCw size={12} />
              Transferir Unidade
            </button>

            <button 
              id="bulk-btn-status"
              onClick={() => setIsBulkStatusOpen(true)}
              className="text-xs bg-indigo-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1 transition-colors"
            >
              <Wrench size={12} />
              Alterar Estado
            </button>

            <button 
              id="bulk-btn-delete"
              onClick={handleBulkDelete}
              className="text-xs bg-rose-700 hover:bg-rose-850 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1 transition-colors"
            >
              <Trash2 size={12} />
              Dar Baixa Física
            </button>

            <button 
              onClick={() => setSelectedIds([])}
              className="text-xs text-indigo-300 hover:text-white px-2 py-1"
            >
              Cancelar
            </button>
          </div>
        </section>
      )}

      {/* Spreadsheet grid layout table */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[460px]">
        <div className="overflow-x-auto flex-1 scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
              <tr className="text-[11px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3.5 text-center w-12">
                  <input 
                    type="checkbox"
                    id="bulk-select-all"
                    checked={filteredAssets.length > 0 && selectedIds.length === filteredAssets.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer h-4 w-4"
                  />
                </th>
                <th className="px-5 py-3.5">ID Interno</th>
                <th className="px-5 py-3.5">Nome</th>
                <th className="px-5 py-3.5">Patrimônio</th>
                <th className="px-5 py-3.5">Categoria</th>
                <th className="px-5 py-3.5">Modelo / Marca</th>
                <th className="px-5 py-3.5">Nº de Série</th>
                <th className="px-5 py-3.5">Filial / Unidade</th>
                <th className="px-5 py-3.5">Localização Específica</th>
                <th className="px-5 py-3.5">Responsável Atual</th>
                <th className="px-5 py-3.5">Status Geral</th>
                <th className="px-5 py-3.5 text-center w-16">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-24 px-6">
                    <div className="max-w-md mx-auto flex flex-col items-center">
                      <Layers size={48} className="text-slate-300 dark:text-slate-700 dark:text-slate-200 animate-pulse" />
                      <h4 className="font-bold text-slate-700 dark:text-slate-200 mt-4">Nenhum ativo localizado</h4>
                      <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Refine seus filtros de busca ou termine digitando outro termo para pesquisar.</p>
                      <button 
                        onClick={handleClearFilters}
                        className="mt-4 px-4 py-2 bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-xs font-bold rounded-lg"
                      >
                        Limpar Todos Filtros
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const isChecked = selectedIds.includes(asset.id);
                  return (
                    <tr 
                      key={asset.id} 
                      className={`group hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${isChecked ? 'bg-indigo-50/40 dark:bg-indigo-900/20' : ''}`}
                    >
                      <td className="px-4 py-3 text-center">
                        <input 
                          type="checkbox"
                          id={`row-select-${asset.id}`}
                          checked={isChecked}
                          onChange={(e) => handleSelectRow(asset.id, e.target.checked)}
                          className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-600 cursor-pointer h-4 w-4"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <button 
                          onClick={() => onSelectAsset(asset)}
                          className="font-mono text-xs font-bold text-indigo-700 hover:underline hover:text-indigo-900 transition-colors text-left"
                        >
                          {asset.id}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[160px]" title={asset.name}>
                        {asset.name}
                      </td>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400 dark:text-slate-500 font-mono text-xs">{asset.patrimonio}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {getCategoryIcon(asset.category)}
                          <span>{asset.category}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-800 dark:text-slate-100 font-medium truncate max-w-[160px]" title={asset.model}>
                        {asset.model}
                      </td>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400 dark:text-slate-500 font-mono text-xs truncate max-w-[120px]">{asset.serialNumber}</td>
                      <td className="px-5 py-3 text-xs text-slate-700 dark:text-slate-200 font-semibold">{asset.unit}</td>
                      <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 truncate max-w-[130px]">{asset.location}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 text-xs">
                          {asset.responsible.initials && (
                            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-slate-300 ring-1 ring-slate-200">
                              {asset.responsible.initials}
                            </span>
                          )}
                          <span className="text-slate-800 dark:text-slate-100">{asset.responsible.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">{getStatusBadge(asset.status)}</td>
                      <td className="px-5 py-3 text-center">
                        <button 
                          id={`action-btn-sheet-${asset.id}`}
                          onClick={() => onSelectAsset(asset)}
                          className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all"
                          title="Ver Ficha do Ativo"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer pagination and metrics indicators */}
        <div className="flex justify-between items-center px-6 py-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-xs">
          <div className="text-slate-500 dark:text-slate-400 dark:text-slate-500 font-semibold select-none">
            Mostrando <span className="text-slate-900 dark:text-white">{filteredAssets.length}</span> corporativos de <span className="text-slate-900 dark:text-white">{assets.length}</span> ativos totais catalogados.
          </div>
          <div className="flex items-center gap-1 select-none">
            <span className="text-slate-400 dark:text-slate-500 mr-2">Páginas:</span>
            <button className="w-7 h-7 bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm">1</button>
            <button className="w-7 h-7 hover:bg-slate-200 rounded-lg text-slate-600 dark:text-slate-300 text-xs">2</button>
            <span className="px-1 text-slate-400 dark:text-slate-500">...</span>
            <button className="w-7 h-7 hover:bg-slate-200 rounded-lg text-slate-600 dark:text-slate-300 text-xs">42</button>
          </div>
        </div>
      </section>

      {/* Slide-over Right Panel Form for Create Asset */}
      {isNewAssetOpen && (
        <div id="new-asset-modal" className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-slide-left border-l border-slate-200 dark:border-slate-700">
            {/* Slide Header */}
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-950">Registrar Novo Ativo</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Cadastre o patrimônio físico individual de TI no sistema.</p>
              </div>
              <button 
                id="close-new-asset-modal"
                onClick={() => setIsNewAssetOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form body scrollable */}
            <form onSubmit={handleCreateAssetSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Nome Descritivo do Ativo *</label>
                <input 
                  type="text" 
                  id="form-asset-name"
                  placeholder="Ex: Notebook Administrativo ThinkPad" 
                  value={newAssetForm.name}
                  onChange={(e) => setNewAssetForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Número de Patrimônio (Opcional)</label>
                  <input 
                    type="text" 
                    id="form-patrimonio"
                    placeholder="Ex: #PAT-004452" 
                    value={newAssetForm.patrimonio}
                    onChange={(e) => setNewAssetForm(prev => ({ ...prev, patrimonio: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Categoria de Inventário *</label>
                  <select 
                    id="form-asset-category"
                    value={newAssetForm.category}
                    onChange={(e) => setNewAssetForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                  >
                    {categories.length > 0 ? (
                      categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                    ) : (
                      <>
                        <option>Notebooks</option>
                        <option>Monitores</option>
                        <option>Impressoras</option>
                        <option>Switches</option>
                        <option>Hardware de Rede</option>
                        <option>Mobiliário</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Marca / Modelo Completo *</label>
                  <input 
                    type="text" 
                    id="form-model"
                    placeholder="Ex: Lenovo ThinkPad L14 Gen 4" 
                    value={newAssetForm.model}
                    onChange={(e) => setNewAssetForm(prev => ({ ...prev, model: e.target.value }))}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Número de Série (Serial) *</label>
                  <input 
                    type="text" 
                    id="form-serial"
                    placeholder="Ex: LNV-88339281-Z" 
                    value={newAssetForm.serialNumber}
                    onChange={(e) => setNewAssetForm(prev => ({ ...prev, serialNumber: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Unidade Polo Inicial *</label>
                  <select 
                    id="form-unit"
                    value={newAssetForm.unit}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      const matchedUnit = units.find(u => u.name === selectedName);
                      const matchedParts = matchedUnit?.partitions || [
                        { id: 'office', label: 'Escritório' },
                        { id: 'cpd', label: 'CPD / Datacenter' },
                        { id: 'pista', label: 'Pista Operacional' },
                        { id: 'loja', label: 'Loja / Estoque' }
                      ];
                      setNewAssetForm(prev => ({ 
                        ...prev, 
                        unit: selectedName, 
                        currentFloor: matchedParts[0]?.id || 'office' 
                      }));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Partição / Setor Inicial *</label>
                  <select 
                    id="form-current-floor"
                    value={newAssetForm.currentFloor}
                    onChange={(e) => setNewAssetForm(prev => ({ ...prev, currentFloor: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                  >
                    {(units.find(u => u.name === newAssetForm.unit)?.partitions || [
                      { id: 'office', label: 'Escritório' },
                      { id: 'cpd', label: 'CPD / Datacenter' },
                      { id: 'pista', label: 'Pista Operacional' },
                      { id: 'loja', label: 'Loja / Estoque' }
                    ]).map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Localização de Detalhe *</label>
                  <input 
                    type="text" 
                    id="form-location"
                    placeholder="Ex: Sala B - Mesa 04" 
                    value={newAssetForm.location}
                    onChange={(e) => setNewAssetForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Responsável Nome *</label>
                  <input 
                    type="text" 
                    id="form-responsible"
                    placeholder="Ex: Carlos Eduardo" 
                    value={newAssetForm.responsibleName}
                    onChange={(e) => setNewAssetForm(prev => ({ ...prev, responsibleName: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Estado Operacional Inicial *</label>
                  <select 
                    id="form-status"
                    value={newAssetForm.status}
                    onChange={(e) => setNewAssetForm(prev => ({ ...prev, status: e.target.value as AssetStatus }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                  >
                    <option>Em Uso</option>
                    <option>Manutenção</option>
                    <option>Armazenado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Valor Compra R$</label>
                  <input 
                    type="number" 
                    id="form-value"
                    placeholder="4500" 
                    value={newAssetForm.value}
                    onChange={(e) => setNewAssetForm(prev => ({ ...prev, value: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Adquirido Em</label>
                  <input 
                    type="date" 
                    id="form-date-acq"
                    value={newAssetForm.acquisitionDate}
                    onChange={(e) => setNewAssetForm(prev => ({ ...prev, acquisitionDate: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Garantia Até</label>
                  <input 
                    type="date" 
                    id="form-date-warranty"
                    value={newAssetForm.warrantyExpiry}
                    onChange={(e) => setNewAssetForm(prev => ({ ...prev, warrantyExpiry: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Technical Specifications Mock toggles */}
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest block">Configuração Técnica (Notebook / Servidor)</span>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold mb-1">Processador</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Core i7" 
                      value={newAssetForm.processor}
                      onChange={(e) => setNewAssetForm(prev => ({ ...prev, processor: e.target.value }))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold mb-1">Carga RAM</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 16GB" 
                      value={newAssetForm.ram}
                      onChange={(e) => setNewAssetForm(prev => ({ ...prev, ram: e.target.value }))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold mb-1">Armazenamento</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 512GB SSD" 
                      value={newAssetForm.storage}
                      onChange={(e) => setNewAssetForm(prev => ({ ...prev, storage: e.target.value }))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => setIsNewAssetOpen(false)}
                  className="w-1/2 py-3 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-center"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  id="btn-register-asset-confirm"
                  className="w-1/2 py-3 bg-indigo-700 text-white text-sm font-bold rounded-xl hover:bg-indigo-800 text-center shadow"
                >
                  Cadastrar Ativo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Transfer Modal */}
      {isBulkTransferOpen && (
        <div id="bulk-transfer-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 animate-slide-up">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <RefreshCw className="text-indigo-600" size={20} />
              Transferir Unidade em Lote
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Deseja alterar em lote o polo de localização física corporativa para os {selectedIds.length} ativos selecionados?</p>

            <div className="my-5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Unidade / Filial Destino</label>
              <select 
                id="bulk-transfer-unit-select"
                value={bulkTargetUnit}
                onChange={(e) => setBulkTargetUnit(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.name}>{u.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setIsBulkTransferOpen(false)}
                className="w-1/2 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button 
                id="bulk-transfer-confirm-btn"
                onClick={handleBulkTransferSubmit}
                className="w-1/2 py-2.5 bg-indigo-700 text-white rounded-xl text-sm font-bold hover:bg-indigo-800"
              >
                Confirmar Transferência
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Status Update Modal */}
      {isBulkStatusOpen && (
        <div id="bulk-status-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 animate-slide-up">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Wrench className="text-indigo-600" size={20} />
              Reclassificar Status em Lote
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Defina em conjunto o estado operacional de andamento para os {selectedIds.length} ativos corporativos.</p>

            <div className="my-5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Novo Status Geral</label>
              <select 
                id="bulk-status-select-input"
                value={bulkTargetStatus}
                onChange={(e) => setBulkTargetStatus(e.target.value as AssetStatus)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option>Em Uso</option>
                <option>Manutenção</option>
                <option>Armazenado</option>
                <option>Extraviado</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setIsBulkStatusOpen(false)}
                className="w-1/2 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button 
                id="bulk-status-confirm-btn"
                onClick={handleBulkStatusChangeSubmit}
                className="w-1/2 py-2.5 bg-indigo-700 text-white rounded-xl text-sm font-bold hover:bg-indigo-800"
              >
                Confirmar Alteração
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
