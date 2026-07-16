/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  TrendingUp, 
  Boxes, 
  CheckCircle2, 
  Wrench, 
  History, 
  Calendar, 
  Download, 
  ChevronRight,
  Sparkles,
  RefreshCw,
  Cpu,
  Monitor,
  Printer
} from 'lucide-react';
import { Asset } from '../types';
import { INITIAL_ACTIVITIES } from '../data/initialData';

interface DashboardViewProps {
  assets: Asset[];
  onSelectAsset: (asset: Asset) => void;
  activities: typeof INITIAL_ACTIVITIES;
  setActiveScreen?: (screen: any) => void;
}

export default function DashboardView({ assets, onSelectAsset, activities, setActiveScreen }: DashboardViewProps) {
  const [filterPeriod, setFilterPeriod] = useState('Últimos 30 dias');

  // Compute live responsive metrics to demonstrate deep data flow
  const liveTotal = assets.length;
  const liveInUseCount = assets.filter(a => a.status === 'Em Uso').length;
  const liveInUsePercent = liveTotal === 0 ? 0 : Math.round((liveInUseCount / liveTotal) * 100);
  const liveMaintenance = assets.filter(a => a.status === 'Manutenção').length;
  const liveCritical = assets.filter(a => a.status === 'Extraviado').length;

  // Compute category distributions
  const categoryCounts: Record<string, number> = {};

  assets.forEach(asset => {
    if (categoryCounts[asset.category] !== undefined) {
      categoryCounts[asset.category] += 1;
    } else {
      categoryCounts[asset.category] = 1;
    }
  });

  const maxVal = Math.max(...Object.values(categoryCounts), 0);

  // Distributions by units
  const unitsCounts: Record<string, number> = {};
  assets.forEach(asset => {
    if (!asset.unit) return;
    unitsCounts[asset.unit] = (unitsCounts[asset.unit] || 0) + 1;
  });

  const totalUnitAssets = Object.values(unitsCounts).reduce((a, b) => a + b, 0);

  // Expiring warranties
  const now = new Date();
  const expiringWarranties = assets
    .filter(a => a.warrantyExpiry)
    .map(asset => {
      const parts = asset.warrantyExpiry.split('-');
      if (parts.length !== 3) return null;
      const expiryDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const diffTime = expiryDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let status = "";
      let color = "";
      let dot = "";
      if (diffDays < 0) {
        status = "Expirado";
        color = "text-rose-500";
        dot = "bg-rose-500";
      } else if (diffDays <= 30) {
        status = "30 Dias";
        color = "text-amber-500";
        dot = "bg-amber-500";
      } else if (diffDays <= 90) {
        status = "90 Dias";
        color = "text-emerald-500";
        dot = "bg-emerald-500";
      } else {
        return null;
      }
      
      let icon = Cpu;
      if (asset.category === 'Redes') icon = RefreshCw;
      else if (asset.category === 'Periféricos') icon = Printer;
      else if (asset.category === 'Computadores') icon = Monitor;

      return {
        id: asset.id,
        name: asset.name,
        date: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(expiryDate),
        status,
        color,
        dot,
        icon,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (!a || !b) return 0;
      if (a.status === 'Expirado' && b.status !== 'Expirado') return -1;
      if (a.status !== 'Expirado' && b.status === 'Expirado') return 1;
      return 0;
    })
    .slice(0, 5) as any[];

  const exportToCSV = () => {
    if (assets.length === 0) {
      alert("Nenhum ativo disponível para exportação.");
      return;
    }

    const headers = [
      "ID Interno",
      "Nome do Aparelho",
      "Modelo",
      "Nº de Série",
      "Número (Celular)",
      "IMEI",
      "Tipo de Chip",
      "Responsável Atual",
      "Patrimônio",
      "Categoria",
      "Filial / Unidade",
      "Localização Específica",
      "Status Geral",
      "Valor (R$)",
      "Data de Aquisição"
    ];

    const csvRows = [headers.join(";")];

    assets.forEach(asset => {
      const numeroCelular = asset.specifications && asset.specifications["Número"] ? asset.specifications["Número"] : "";
      const imeiCelular = asset.specifications && asset.specifications["IMEI"] ? asset.specifications["IMEI"] : "";
      const tipoChip = asset.specifications && asset.specifications["Tipo de Chip"] ? asset.specifications["Tipo de Chip"] : "";

      const values = [
        asset.id,
        asset.name,
        asset.model,
        asset.serialNumber,
        numeroCelular,
        imeiCelular,
        tipoChip,
        asset.responsible?.name || "",
        asset.patrimonio,
        asset.category,
        asset.unit,
        asset.location,
        asset.status,
        asset.value !== undefined ? asset.value.toFixed(2) : "",
        asset.acquisitionDate
      ].map(val => {
        const clean = (val || "").toString().replace(/"/g, '""');
        return clean.includes(";") || clean.includes("\n") || clean.includes('"') ? `"${clean}"` : clean;
      });
      csvRows.push(values.join(";"));
    });

    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_ativos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="dashboard-view" className="space-y-6 max-w-7xl mx-auto">
      {/* Executive Welcome Section */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Visão Geral Executiva 
            <span className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 px-2 py-1 rounded font-medium flex items-center gap-1">
              <Sparkles size={12} />
              Tempo Real
            </span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1 select-none">Dados consolidados da rede operacional e ativos corporativos em atividade.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select 
            id="period-select"
            value={filterPeriod} 
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-600 outline-none shadow-sm cursor-pointer"
          >
            <option>Últimos 30 dias</option>
            <option>Últimos 90 dias</option>
            <option>Ano Atual (2026)</option>
          </select>

          <button 
            id="btn-export-rep"
            onClick={exportToCSV}
            className="bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-indigo-800 transition-all shadow active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <Download size={16} />
            Exportar Relatório
          </button>
        </div>
      </section>

      {/* Top 4 KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Assets */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
              <Boxes size={20} />
            </span>
            <span className="text-emerald-500 font-bold text-xs flex items-center bg-emerald-50 px-2 py-1 rounded-full">
              <TrendingUp size={12} className="mr-1" /> +4.2%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">Total de Ativos</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{liveTotal.toLocaleString('pt-BR')}</h3>
          </div>
        </div>

        {/* KPI 2: Assets in Use */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 size={20} />
            </span>
            <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500 text-xs bg-slate-100 px-2 py-1 rounded-full font-medium">
              {liveInUsePercent}% Utilização
            </span>
          </div>
          <div className="mt-4">
            <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">Ativos em Uso</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{liveInUseCount.toLocaleString('pt-BR')}</h3>
          </div>
          <div className="w-full bg-slate-100 mt-3 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-1000" 
              style={{ width: `${liveInUsePercent}%` }} 
            />
          </div>
        </div>

        {/* KPI 3: Maintenance */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 border-l-4 border-l-amber-500 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Wrench size={20} />
            </span>
            <span className="text-amber-600 text-xs font-bold bg-amber-50 px-2 py-0.5 rounded-full">
              Atenção Necessária
            </span>
          </div>
          <div className="mt-4">
            <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">Em Manutenção</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{liveMaintenance}</h3>
          </div>
        </div>

        {/* KPI 4: Pending Inventory */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 border-l-4 border-l-rose-500 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <History size={20} />
            </span>
            <span className="text-rose-600 text-xs font-bold bg-rose-50 px-2 py-0.5 rounded-full">
              Crítico
            </span>
          </div>
          <div className="mt-4">
            <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">Não Localizado / Extravio</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{liveCritical}</h3>
          </div>
        </div>
      </section>



      {/* Main Content Charts & Activity Feed */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Middle Left: Category Volume Chart Simulation */}
        <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-slate-900 dark:text-white select-none">Volume por Categoria (TI & Telecom)</h3>
            <button 
              onClick={() => setActiveScreen && setActiveScreen('categories')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
            >
              Ver Detalhamento
            </button>
          </div>

          <div className="flex-1 flex items-end justify-between gap-2 sm:gap-4 h-64 pt-4 select-none overflow-x-auto">
            {Object.entries(categoryCounts).map(([cat, val]) => {
              const heightPercent = maxVal > 0 ? (val / maxVal) * 90 : 10;
              return (
                <div key={cat} className="flex flex-col items-center flex-1 min-w-[48px] group">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-xl relative h-48 flex items-end overflow-hidden">
                    <div 
                      className="w-full bg-indigo-600/80 group-hover:bg-indigo-600 rounded-t-xl transition-all duration-700 ease-out relative cursor-pointer"
                      style={{ height: `${heightPercent}%` }}
                    >
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-bold whitespace-nowrap z-10">
                        {val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-2 text-center truncate w-full group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {cat}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Recent Activity feed logs */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-5">Atividade Recente</h4>
          <div className="space-y-5">
            {activities.slice(0, 3).map((act, index) => (
              <div key={act.id || index} className="flex gap-3 sm:gap-4">
                <div className="relative flex flex-col items-center shrink-0">
                  <div className={`w-8 h-8 rounded-full ${act.badgeColor} flex items-center justify-center text-white shrink-0 shadow-sm`}>
                    {act.icon === 'sync_alt' && <RefreshCw size={14} className="animate-spin" style={{ animationDuration: '6s' }} />}
                    {act.icon === 'build' && <Wrench size={14} />}
                    {act.icon === 'add_circle' && <Boxes size={14} />}
                  </div>
                  {index < 2 && <div className="w-0.5 bg-slate-100 dark:bg-slate-800 flex-1 my-1" />}
                </div>
                <div className="pb-2 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">{act.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-3">{act.details}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">{act.time} • Por {act.by}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Grid: Distributions & Warranties */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Distribuição por Unidade */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Distribuição por Unidade</h4>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">Alocação geográfica ativa das cargas de patrimônio</p>

          <div className="space-y-4">
            {Object.entries(unitsCounts).map(([un, count], index) => {
              const pct = totalUnitAssets > 0 ? Math.round((count / totalUnitAssets) * 100) : 0;
              const colors = ['bg-indigo-600', 'bg-violet-500', 'bg-teal-500', 'bg-emerald-500', 'bg-blue-500'];
              const barColor = colors[index % colors.length];

              return (
                <div key={un} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>{un}</span>
                    <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500 font-mono font-bold">
                      {count.toLocaleString('pt-BR')} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className={`${barColor} h-full rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Warranty List */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Vencimento de Garantia</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Prazos de cobertura técnica corporativa urgentes</p>
            </div>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
              PRÓXIMOS DIAS
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Ativo</th>
                  <th className="px-6 py-3">ID Interno</th>
                  <th className="px-6 py-3">Vencimento</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expiringWarranties.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">
                      Nenhum ativo com garantia prestes a expirar.
                    </td>
                  </tr>
                )}
                {expiringWarranties.map((w) => {
                  const Icon = w.icon;
                  // Look up actual asset object
                  const actualAsset = assets.find(a => a.id === w.id);
                  return (
                    <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <span className="p-2 bg-slate-100 text-slate-500 dark:text-slate-400 dark:text-slate-500 rounded-lg">
                          <Icon size={14} />
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{w.name}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500 dark:text-slate-400 dark:text-slate-500">{w.id}</td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500">{w.date}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200 dark:border-slate-700/50`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${w.dot}`} />
                          <span className={w.color}>{w.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => actualAsset ? onSelectAsset(actualAsset) : alert("Visualizando Detalhes...")}
                          className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-all"
                          title="Ver Ficha do Ativo"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
