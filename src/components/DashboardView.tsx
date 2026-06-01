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
}

export default function DashboardView({ assets, onSelectAsset, activities }: DashboardViewProps) {
  const [filterPeriod, setFilterPeriod] = useState('Últimos 30 dias');

  // Compute live responsive metrics to demonstrate deep data flow
  const liveTotal = 12476 + assets.length;
  const liveInUseCount = 10480 + assets.filter(a => a.status === 'Em Uso').length;
  const liveInUsePercent = Math.round((liveInUseCount / liveTotal) * 100);
  const liveMaintenance = 138 + assets.filter(a => a.status === 'Manutenção').length;
  const liveCritical = 26 + assets.filter(a => a.status === 'Extraviado').length;

  // Compute category distributions
  const categoryCounts: Record<string, number> = {
    "Notebooks": 3200,
    "Desktops": 1800,
    "Switches": 1100,
    "Monitores": 2400,
    "Nobreaks": 600,
  };

  assets.forEach(asset => {
    if (categoryCounts[asset.category] !== undefined) {
      categoryCounts[asset.category] += 1;
    } else {
      categoryCounts[asset.category] = 1;
    }
  });

  const maxVal = Math.max(...Object.values(categoryCounts));

  // Distributions by units
  const unitsCounts = {
    "Sede Matriz": 5410 + assets.filter(a => a.unit.includes("Matriz")).length,
    "Posto Operacional A": 3108 + assets.filter(a => a.unit.includes("Rio")).length,
    "Posto Operacional B": 2848 + assets.filter(a => a.unit.includes("Paraná")).length,
    "CD Logístico": 1100 + assets.filter(a => a.unit.includes("CD") || a.unit.includes("Depósito")).length,
  };

  const totalUnitAssets = Object.values(unitsCounts).reduce((a, b) => a + b, 0);

  // Expiring warranties
  const expiringWarranties = [
    { name: "MacBook Pro 14\"", id: "KINETIC-8821", date: "12 Mai, 2024", status: "Expirado", color: "text-rose-500", dot: "bg-rose-500", icon: Cpu },
    { name: "Cisco Nexus 9000", id: "KINETIC-8800", date: "05 Jun, 2024", status: "30 Dias", color: "text-amber-500", dot: "bg-amber-500", icon: RefreshCw },
    { name: "HP Enterprise M608", id: "ADM-IMP-22", date: "22 Jul, 2024", status: "60+ Dias", color: "text-slate-500", dot: "bg-slate-500", icon: Printer },
  ];

  return (
    <div id="dashboard-view" className="space-y-6 max-w-7xl mx-auto">
      {/* Executive Welcome Section */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Visão Geral Executiva 
            <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded font-medium flex items-center gap-1">
              <Sparkles size={12} />
              Tempo Real
            </span>
          </h2>
          <p className="text-slate-500 mt-1 select-none">Dados consolidados da rede operacional e ativos corporativos em atividade.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select 
            id="period-select"
            value={filterPeriod} 
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-600 outline-none shadow-sm cursor-pointer"
          >
            <option>Últimos 30 dias</option>
            <option>Últimos 90 dias</option>
            <option>Ano Atual (2026)</option>
          </select>

          <button 
            id="btn-export-rep"
            onClick={() => alert("Relatório gerado com sucesso! Iniciando download do PDF corporativo unificado...")}
            className="bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-indigo-800 transition-all shadow active:scale-95 whitespace-nowrap"
          >
            <Download size={16} />
            Exportar Relatório
          </button>
        </div>
      </section>

      {/* Top 4 KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Assets */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
              <Boxes size={20} />
            </span>
            <span className="text-emerald-500 font-bold text-xs flex items-center bg-emerald-50 px-2 py-1 rounded-full">
              <TrendingUp size={12} className="mr-1" /> +4.2%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total de Ativos</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{liveTotal.toLocaleString('pt-BR')}</h3>
          </div>
        </div>

        {/* KPI 2: Assets in Use */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 size={20} />
            </span>
            <span className="text-slate-500 text-xs bg-slate-100 px-2 py-1 rounded-full font-medium">
              {liveInUsePercent}% Utilização
            </span>
          </div>
          <div className="mt-4">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Ativos em Uso</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{liveInUseCount.toLocaleString('pt-BR')}</h3>
          </div>
          <div className="w-full bg-slate-100 mt-3 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-1000" 
              style={{ width: `${liveInUsePercent}%` }} 
            />
          </div>
        </div>

        {/* KPI 3: Maintenance */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 border-l-4 border-l-amber-500 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Wrench size={20} />
            </span>
            <span className="text-amber-600 text-xs font-bold bg-amber-50 px-2 py-0.5 rounded-full">
              Atenção Necessária
            </span>
          </div>
          <div className="mt-4">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Em Manutenção</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{liveMaintenance}</h3>
          </div>
        </div>

        {/* KPI 4: Pending Inventory */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 border-l-4 border-l-rose-500 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <History size={20} />
            </span>
            <span className="text-rose-600 text-xs font-bold bg-rose-50 px-2 py-0.5 rounded-full">
              Crítico
            </span>
          </div>
          <div className="mt-4">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Não Localizado / Extravio</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{liveCritical}</h3>
          </div>
        </div>
      </section>

      {/* Main Content Charts & Activity Feed */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Bar Chart: Assets by Category */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[380px]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="text-lg font-bold text-slate-900">Ativos por Categoria</h4>
              <p className="text-xs text-slate-400">Distribuição geral quantitativa de equipamentos</p>
            </div>
            <span className="text-xs font-semibold text-indigo-700 hover:underline cursor-pointer select-none">Filtro Rápido</span>
          </div>

          <div className="flex-1 flex items-end justify-between gap-4 h-64 pt-4 select-none">
            {Object.entries(categoryCounts).map(([cat, val]) => {
              const heightPercent = maxVal > 0 ? (val / maxVal) * 90 : 10;
              return (
                <div key={cat} className="flex flex-col items-center flex-1 group">
                  <div className="w-full bg-slate-100 rounded-t-xl relative h-48 flex items-end overflow-hidden">
                    <div 
                      className="w-full bg-indigo-600/80 group-hover:bg-indigo-600 rounded-t-xl transition-all duration-700 ease-out relative cursor-pointer"
                      style={{ height: `${heightPercent}%` }}
                    >
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-bold whitespace-nowrap z-10">
                        {val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 mt-2 text-center truncate w-full group-hover:text-slate-800">
                    {cat}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Recent Activity feed logs */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h4 className="text-lg font-bold text-slate-900 mb-5">Atividade Recente</h4>
          <div className="space-y-5">
            {activities.slice(0, 3).map((act, index) => (
              <div key={act.id || index} className="flex gap-4">
                <div className="relative flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full ${act.badgeColor} flex items-center justify-center text-white shrink-0 shadow-sm`}>
                    {act.icon === 'sync_alt' && <RefreshCw size={14} className="animate-spin" style={{ animationDuration: '6s' }} />}
                    {act.icon === 'build' && <Wrench size={14} />}
                    {act.icon === 'add_circle' && <Boxes size={14} />}
                  </div>
                  {index < 2 && <div className="w-0.5 bg-slate-100 flex-1 my-1" />}
                </div>
                <div className="pb-2">
                  <p className="text-sm font-bold text-slate-800 leading-tight">{act.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{act.details}</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">{act.time} • Por {act.by}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Grid: Distributions & Warranties */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Distribuição por Unidade */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h4 className="text-lg font-bold text-slate-900 mb-1">Distribuição por Unidade</h4>
          <p className="text-xs text-slate-400 mb-5">Alocação geográfica ativa das cargas de patrimônio</p>

          <div className="space-y-4">
            {Object.entries(unitsCounts).map(([un, count]) => {
              const pct = totalUnitAssets > 0 ? Math.round((count / totalUnitAssets) * 100) : 25;
              let barColor = 'bg-indigo-600';
              if (un.includes("Operacional A")) barColor = 'bg-violet-500';
              if (un.includes("Operacional B")) barColor = 'bg-teal-500';
              if (un.includes("CD Logístico")) barColor = 'bg-slate-500';

              return (
                <div key={un} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                    <span>{un}</span>
                    <span className="text-slate-500 font-mono font-bold">
                      {count.toLocaleString('pt-BR')} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className={`${barColor} h-full rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Warranty List */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
              <h4 className="text-lg font-bold text-slate-900">Vencimento de Garantia</h4>
              <p className="text-xs text-slate-500">Prazos de cobertura técnica corporativa urgentes</p>
            </div>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
              PRÓXIMOS DIAS
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Ativo</th>
                  <th className="px-6 py-3">ID Interno</th>
                  <th className="px-6 py-3">Vencimento</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expiringWarranties.map((w) => {
                  const Icon = w.icon;
                  // Look up actual asset object
                  const actualAsset = assets.find(a => a.id === w.id);
                  return (
                    <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <span className="p-2 bg-slate-100 text-slate-500 rounded-lg">
                          <Icon size={14} />
                        </span>
                        <span className="text-xs font-bold text-slate-800">{w.name}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">{w.id}</td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-500">{w.date}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200/50`}>
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
