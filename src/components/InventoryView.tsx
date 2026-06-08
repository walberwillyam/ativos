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
  Tags,
  Camera,
  QrCode,
  ImagePlus,
  FileText
} from 'lucide-react';
import { Asset, AssetStatus, ActiveScreen, Category } from '../types';
import { supabase } from '../lib/supabaseClient';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

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
  const handleExportCSV = () => {
    if (assets.length === 0) {
      alert("Nenhum ativo disponível para exportação.");
      return;
    }

    const headers = [
      "ID Interno",
      "Nome",
      "Patrimônio",
      "Categoria",
      "Modelo",
      "Nº de Série",
      "Filial / Unidade",
      "Localização Específica",
      "Responsável Atual",
      "Status Geral",
      "Valor (R$)",
      "Data de Aquisição",
      "Vencimento de Garantia"
    ];

    const csvRows = [headers.join(";")];

    assets.forEach(asset => {
      const values = [
        asset.id,
        asset.name,
        asset.patrimonio,
        asset.category,
        asset.model,
        asset.serialNumber,
        asset.unit,
        asset.location,
        asset.responsible?.name || "",
        asset.status,
        asset.value !== undefined ? asset.value.toFixed(2) : "",
        asset.acquisitionDate,
        asset.warrantyExpiry || ""
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

  const handleGenerateBoardReport = () => {
    if (filteredAssets.length === 0) {
      alert("Nenhum ativo disponível no filtro atual para gerar o relatório.");
      return;
    }

    const totalAssets = filteredAssets.length;
    const totalValue = filteredAssets.reduce((sum, a) => sum + (a.value || 0), 0);
    const avgValue = totalAssets > 0 ? totalValue / totalAssets : 0;

    const catCounts: Record<string, number> = {};
    const catValues: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    const unitCounts: Record<string, number> = {};

    filteredAssets.forEach(a => {
      catCounts[a.category] = (catCounts[a.category] || 0) + 1;
      catValues[a.category] = (catValues[a.category] || 0) + (a.value || 0);
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
      unitCounts[a.unit] = (unitCounts[a.unit] || 0) + 1;
    });

    const formatBRL = (v: number) => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    };

    const categoriesList = Object.keys(catCounts).map(cat => ({
      name: cat,
      count: catCounts[cat],
      percentage: ((catCounts[cat] / totalAssets) * 100).toFixed(1),
      value: catValues[cat]
    })).sort((a, b) => b.count - a.count);

    const statusList = Object.keys(statusCounts).map(st => ({
      name: st,
      count: statusCounts[st],
      percentage: ((statusCounts[st] / totalAssets) * 100).toFixed(1)
    })).sort((a, b) => b.count - a.count);

    const unitsList = Object.keys(unitCounts).map(u => ({
      name: u,
      count: unitCounts[u],
      percentage: ((unitCounts[u] / totalAssets) * 100).toFixed(1)
    })).sort((a, b) => b.count - a.count);

    const reportDate = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const assetsTableRows = filteredAssets.map(a => `
      <tr class="border-b border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
        <td class="px-4 py-3 text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">${a.id}</td>
        <td class="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">${a.name}</td>
        <td class="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">${a.patrimonio}</td>
        <td class="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 font-medium">${a.category}</td>
        <td class="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">${a.model}</td>
        <td class="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">${a.unit}</td>
        <td class="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">${a.responsible?.name || '-'}</td>
        <td class="px-4 py-3 text-xs">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-xs ${
            a.status === 'Em Uso' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
            a.status === 'Manutenção' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
            a.status === 'Extraviado' ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400' :
            'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
          }">
            ${a.status}
          </span>
        </td>
        <td class="px-4 py-3 text-sm font-semibold text-right text-slate-800 dark:text-slate-200">${formatBRL(a.value || 0)}</td>
      </tr>
    `).join('');

    const categoriesCardsHTML = categoriesList.map(c => `
      <div class="bg-white/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/80 p-4 rounded-xl shadow-sm hover:shadow-md transition-all">
        <div class="flex justify-between items-start mb-2">
          <span class="text-sm font-bold text-slate-800 dark:text-slate-200">${c.name}</span>
          <span class="text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-bold rounded">${c.count} u.</span>
        </div>
        <div class="space-y-1">
          <div class="flex justify-between text-xs text-slate-500">
            <span>Valor Total</span>
            <span class="font-semibold text-slate-700 dark:text-slate-300">${formatBRL(c.value)}</span>
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
            <div class="bg-indigo-600 h-full" style="width: ${c.percentage}%"></div>
          </div>
          <div class="text-[10px] text-right text-slate-400 mt-1">${c.percentage}% do total</div>
        </div>
      </div>
    `).join('');

    const statusChartRowsHTML = statusList.map(s => `
      <div class="space-y-1">
        <div class="flex justify-between text-xs font-medium">
          <span class="text-slate-700 dark:text-slate-300">${s.name}</span>
          <span class="text-slate-500 dark:text-slate-400">${s.count} ativos (${s.percentage}%)</span>
        </div>
        <div class="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
          <div class="${
            s.name === 'Em Uso' ? 'bg-emerald-500' :
            s.name === 'Manutenção' ? 'bg-amber-500' :
            s.name === 'Extraviado' ? 'bg-rose-500' :
            'bg-slate-400'
          } h-full" style="width: ${s.percentage}%"></div>
        </div>
      </div>
    `).join('');

    const unitsChartRowsHTML = unitsList.map(u => `
      <div class="space-y-1">
        <div class="flex justify-between text-xs font-medium">
          <span class="text-slate-700 dark:text-slate-300">${u.name}</span>
          <span class="text-slate-500 dark:text-slate-400">${u.count} ativos (${u.percentage}%)</span>
        </div>
        <div class="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
          <div class="bg-indigo-500 h-full" style="width: ${u.percentage}%"></div>
        </div>
      </div>
    `).join('');

    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Apresentação Executiva - Inventário de Ativos</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Outfit', 'sans-serif'],
          }
        }
      }
    }
  </script>
  <style>
    @media print {
      .no-print { display: none !important; }
      body { background-color: white !important; color: black !important; }
      .print-card { 
        background-color: white !important; 
        border: 1px solid #e2e8f0 !important; 
        color: black !important;
        box-shadow: none !important;
      }
      .print-text-muted { color: #475569 !important; }
      .print-text-dark { color: #0f172a !important; }
      .page-break { page-break-before: always; }
      tr { page-break-inside: avoid; }
    }
    .slide {
      display: none;
      min-height: calc(100vh - 160px);
    }
    .slide.active {
      display: flex;
      flex-direction: column;
      justify-content: center;
      animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .slide-bg-gradient {
      background: radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.03) 90%);
    }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans transition-colors duration-200">
  
  <!-- TOP CONTROL BAR (NON-PRINTABLE) -->
  <div class="no-print bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex flex-wrap justify-between items-center sticky top-0 z-50 shadow-sm transition-colors">
    <div class="flex items-center gap-3">
      <div class="h-9 w-9 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white font-extrabold text-sm tracking-wider shadow-md shadow-indigo-500/20">
        KT
      </div>
      <div>
        <h1 class="text-sm font-bold tracking-tight text-white">KINETIC ATIVOS</h1>
        <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Amostra Executiva para Diretoria</p>
      </div>
    </div>
    
    <div class="flex items-center gap-2 mt-3 sm:mt-0">
      <div class="bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/50 flex">
        <button onclick="setView('slides')" id="btn-view-slides" class="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 transition-all flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 8 6 4-6 4Z"/></svg>
          Modo Apresentação
        </button>
        <button onclick="setView('report')" id="btn-view-report" class="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          Modo Relatório A4
        </button>
      </div>
      
      <button onclick="toggleTheme()" class="p-2 rounded-xl bg-slate-800/80 border border-slate-700/50 text-slate-300 hover:bg-slate-700 transition-all" title="Alternar Tema">
        <svg id="theme-icon-sun" class="hidden" xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>
        <svg id="theme-icon-moon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
      </button>
      
      <button onclick="window.print()" class="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
        Salvar PDF / Imprimir
      </button>
    </div>
  </div>

  <!-- SLIDES CONTAINER -->
  <div id="slides-container" class="flex-1 flex flex-col justify-between px-6 py-8 md:px-12 max-w-6xl mx-auto w-full slide-bg-gradient">
    
    <!-- Slide 1: Cover -->
    <div class="slide active">
      <div class="max-w-3xl">
        <span class="px-3.5 py-1.5 bg-indigo-500/10 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/20 uppercase tracking-widest">Amostra de Ativos</span>
        <h2 class="text-4xl md:text-6xl font-extrabold tracking-tight mt-6 leading-tight text-white">
          Diagnóstico e Levantamento de <span class="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-500">Ativos Corporativos</span>
        </h2>
        <p class="text-slate-400 text-lg mt-6 font-light leading-relaxed">
          Visão consolidada do inventário de hardware, infraestrutura e periféricos das unidades corporativas. Um compilado analítico para controle patrimonial e planejamento orçamentário.
        </p>
        <div class="h-1 w-20 bg-gradient-to-r from-indigo-500 to-purple-500 mt-10 rounded-full"></div>
        <div class="mt-8 flex flex-col sm:flex-row gap-6 text-xs text-slate-500">
          <div>
            <span class="block uppercase tracking-wider font-semibold text-[10px] text-slate-600">Data de Geração</span>
            <span class="font-medium text-slate-300">${reportDate}</span>
          </div>
          <div>
            <span class="block uppercase tracking-wider font-semibold text-[10px] text-slate-600">Filtro Aplicado</span>
            <span class="font-medium text-slate-300">${totalAssets} ativos selecionados</span>
          </div>
          <div>
            <span class="block uppercase tracking-wider font-semibold text-[10px] text-slate-600">Autor</span>
            <span class="font-medium text-slate-300">Administrador de TI</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Slide 2: KPI Dashboard Overview -->
    <div class="slide">
      <div class="space-y-8">
        <div>
          <span class="text-indigo-400 text-xs font-bold uppercase tracking-widest">Resumo Executivo</span>
          <h3 class="text-3xl font-extrabold text-white mt-2">Visão Geral do Patrimônio</h3>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div class="print-card bg-slate-900/50 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between h-40">
            <span class="text-xs uppercase font-bold tracking-wider text-slate-400">Volume de Equipamentos</span>
            <div class="my-2">
              <span class="text-4xl md:text-5xl font-extrabold text-white">${totalAssets}</span>
              <span class="text-sm text-slate-500 ml-1">itens</span>
            </div>
            <p class="text-[11px] text-slate-500">Ativos cadastrados sob controle de inventário ativo.</p>
          </div>
          
          <div class="print-card bg-slate-900/50 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between h-40">
            <span class="text-xs uppercase font-bold tracking-wider text-slate-400">Valor de Mercado Estimado</span>
            <div class="my-2">
              <span class="text-3xl md:text-4xl font-extrabold text-indigo-400">${formatBRL(totalValue)}</span>
            </div>
            <p class="text-[11px] text-slate-500">Soma financeira do inventário, baseado no valor de aquisição.</p>
          </div>
          
          <div class="print-card bg-slate-900/50 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between h-40">
            <span class="text-xs uppercase font-bold tracking-wider text-slate-400">Custo Médio Unitário</span>
            <div class="my-2">
              <span class="text-3xl md:text-4xl font-extrabold text-purple-400">${formatBRL(avgValue)}</span>
            </div>
            <p class="text-[11px] text-slate-500">Custo médio por equipamento tecnológico registrado.</p>
          </div>
        </div>
        
        <div class="print-card bg-indigo-950/20 border border-indigo-900/40 p-5 rounded-2xl">
          <div class="flex gap-3">
            <span class="text-2xl">💡</span>
            <div>
              <h4 class="text-sm font-bold text-indigo-300">Insights do Portfólio</h4>
              <p class="text-xs text-indigo-200/80 mt-1 leading-relaxed">
                Este relatório representa uma amostra dinâmica. O valor consolidado ajuda a diretoria na tomada de decisão sobre novos investimentos, planejamento tributário/depreciação e cobertura de seguros para os ativos de TI.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Slide 3: Categories -->
    <div class="slide">
      <div class="space-y-6">
        <div>
          <span class="text-indigo-400 text-xs font-bold uppercase tracking-widest">Distribuição Temática</span>
          <h3 class="text-3xl font-extrabold text-white mt-2">Ativos por Categoria</h3>
          <p class="text-xs text-slate-400 mt-1">Divisão proporcional e volume financeiro consolidado por categoria de equipamento.</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-4 max-h-[350px] overflow-y-auto pr-2">
            ${categoriesList.slice(0, 5).map(c => `
              <div class="print-card bg-slate-900/45 border border-slate-800/80 p-4 rounded-xl">
                <div class="flex justify-between items-center text-xs font-semibold mb-2">
                  <span class="text-slate-200">${c.name}</span>
                  <span class="text-indigo-400">${c.count} unidades (${c.percentage}%)</span>
                </div>
                <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-1">
                  <div class="bg-indigo-500 h-full" style="width: ${c.percentage}%"></div>
                </div>
                <div class="text-[10px] text-slate-500 text-right">Valor estimado: ${formatBRL(c.value)}</div>
              </div>
            `).join('')}
          </div>
          
          <div class="print-card bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h4 class="text-sm font-bold text-white">Concentração de Categoria</h4>
              <p class="text-xs text-slate-400 mt-2 leading-relaxed">
                A categoria principal identificada nesta amostra é <strong class="text-indigo-400">${categoriesList[0]?.name || 'N/A'}</strong>, correspondendo a <strong class="text-slate-200">${categoriesList[0]?.percentage || '0'}%</strong> de todos os ativos monitorados.
              </p>
            </div>
            
            <div class="pt-4 border-t border-slate-800 text-xs text-slate-500">
              * Apenas as 5 maiores categorias estão representadas neste gráfico para legibilidade.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Slide 4: Status and Health -->
    <div class="slide">
      <div class="space-y-6">
        <div>
          <span class="text-indigo-400 text-xs font-bold uppercase tracking-widest">Saúde Operacional</span>
          <h3 class="text-3xl font-extrabold text-white mt-2">Estado de Conservação e Status</h3>
          <p class="text-xs text-slate-400 mt-1">Status operacional dos ativos registrados no parque tecnológico.</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="print-card bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-6">
            <h4 class="text-sm font-bold text-white mb-4">Volume por Status</h4>
            ${statusChartRowsHTML}
          </div>
          
          <div class="print-card bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
            <div class="space-y-3">
              <h4 class="text-sm font-bold text-white">Análise de Indisponibilidade</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Ativos classificados em status como <strong>"Manutenção"</strong> necessitam de auditoria de chamados ou custos de reparo.
              </p>
              <p class="text-xs text-slate-400 leading-relaxed">
                Manter uma taxa de ativos <strong>"Em Uso"</strong> acima de 85% indica ótima eficiência operacional e menor nível de estoque ocioso nos almoxarifados locais.
              </p>
            </div>
            
            <div class="p-3 bg-slate-950/40 border border-slate-800 rounded-xl text-xs text-slate-500 flex justify-between">
              <span>Eficiência Operacional:</span>
              <span class="font-bold text-emerald-400">${
                statusList.find(s => s.name === 'Em Uso')?.percentage || '0'
              }% ativo</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Slide 5: Distribution by Unit -->
    <div class="slide">
      <div class="space-y-6">
        <div>
          <span class="text-indigo-400 text-xs font-bold uppercase tracking-widest">Geografia & Logística</span>
          <h3 class="text-3xl font-extrabold text-white mt-2">Distribuição por Unidade</h3>
          <p class="text-xs text-slate-400 mt-1">Alocação de ativos patrimoniais entre as filiais corporativas cadastradas.</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="print-card bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-6">
            <h4 class="text-sm font-bold text-white mb-4">Volume por Unidade</h4>
            ${unitsChartRowsHTML}
          </div>
          
          <div class="print-card bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
            <div class="space-y-3">
              <h4 class="text-sm font-bold text-white">Descentralização Física</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                O maior contingente de ativos está alocado em <strong>"${unitsList[0]?.name || 'N/A'}"</strong>, respondendo por <strong>${unitsList[0]?.count || '0'}</strong> equipamentos.
              </p>
              <p class="text-xs text-slate-400 leading-relaxed">
                Este mapeamento físico é crucial para auditorias locais, prevenção de perdas e planejamento logístico para substituições de tecnologia ou remanejamentos em lote.
              </p>
            </div>
            
            <div class="text-[11px] text-slate-500 italic">
              Relatório integrado via telemetria automatizada.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Slide 6: Summary and Action -->
    <div class="slide">
      <div class="max-w-3xl">
        <span class="text-indigo-400 text-xs font-bold uppercase tracking-widest">Encerramento</span>
        <h3 class="text-4xl md:text-5xl font-extrabold text-white mt-4 leading-tight">Recomendações e Próximos Passos</h3>
        
        <div class="mt-8 space-y-4">
          <div class="flex gap-4">
            <div class="h-6 w-6 rounded-full bg-indigo-900/40 flex items-center justify-center text-xs font-bold text-indigo-400">1</div>
            <p class="text-sm text-slate-400">
              <strong class="text-slate-200">Auditoria Localizada:</strong> Priorizar inventário nas unidades menores para conferência de conformidade do número de série com o banco de dados.
            </p>
          </div>
          
          <div class="flex gap-4">
            <div class="h-6 w-6 rounded-full bg-indigo-900/40 flex items-center justify-center text-xs font-bold text-indigo-400">2</div>
            <p class="text-sm text-slate-400">
              <strong class="text-slate-200">Redução de Custos com Manutenção:</strong> Equipamentos classificados em manutenção há mais de 30 dias devem ser avaliados para obsolescência ou venda de sucata.
            </p>
          </div>
          
          <div class="flex gap-4">
            <div class="h-6 w-6 rounded-full bg-indigo-900/40 flex items-center justify-center text-xs font-bold text-indigo-400">3</div>
            <p class="text-sm text-slate-400">
              <strong class="text-slate-200">Atualização de Ciclo:</strong> Programar a renovação contratual ou aquisições futuras considerando o vencimento programado das garantias registradas.
            </p>
          </div>
        </div>
        
        <div class="mt-12 flex gap-4">
          <button onclick="setView('report')" class="px-6 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-950/20">
            Visualizar Relatório de Impressão Completo
          </button>
        </div>
      </div>
    </div>

    <!-- Slide Navigation Footer -->
    <div class="no-print border-t border-slate-900 pt-6 mt-8 flex justify-between items-center text-xs text-slate-500">
      <div class="flex items-center gap-2">
        <button onclick="prevSlide()" class="p-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 text-slate-300 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <span id="slide-indicator" class="font-semibold px-2">1 / 6</span>
        <button onclick="nextSlide()" class="p-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 text-slate-300 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
      <div class="hidden sm:block text-slate-500">
        Dica: Use as teclas <span class="bg-slate-900 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-800">←</span> e <span class="bg-slate-900 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-800">→</span> ou <span class="bg-slate-900 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-800">Espaço</span> para navegar.
      </div>
    </div>
    
  </div>

  <!-- DETAILED REPORT CONTAINER -->
  <div id="report-container" class="hidden flex-1 px-6 py-10 md:px-12 max-w-6xl mx-auto w-full space-y-10">
    <div class="border-b border-slate-800 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
      <div>
        <h2 class="text-3xl font-extrabold tracking-tight text-white">Relatório Executivo de Inventário</h2>
        <p class="text-sm text-slate-400 mt-2">Visão analítica completa dos ativos de infraestrutura tecnológica.</p>
      </div>
      <div class="text-xs text-slate-500 md:text-right">
        <div>Gerado em: <strong>${reportDate}</strong></div>
        <div>Responsável: <strong>Administração de TI</strong></div>
        <div>Ativos na Amostra: <strong>${totalAssets}</strong></div>
      </div>
    </div>

    <!-- Metric Cards Grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
      <div class="print-card bg-slate-900/50 border border-slate-800 p-5 rounded-2xl">
        <span class="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Qtd. Ativos</span>
        <span class="text-3xl font-extrabold text-white">${totalAssets}</span>
      </div>
      <div class="print-card bg-slate-900/50 border border-slate-850 p-5 rounded-2xl">
        <span class="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Valor Total</span>
        <span class="text-2xl font-extrabold text-indigo-400">${formatBRL(totalValue)}</span>
      </div>
      <div class="print-card bg-slate-900/50 border border-slate-850 p-5 rounded-2xl">
        <span class="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Valor Médio</span>
        <span class="text-2xl font-extrabold text-purple-400">${formatBRL(avgValue)}</span>
      </div>
      <div class="print-card bg-slate-900/50 border border-slate-850 p-5 rounded-2xl">
        <span class="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Em Uso</span>
        <span class="text-3xl font-extrabold text-emerald-400">${
          statusList.find(s => s.name === 'Em Uso')?.count || 0
        }</span>
      </div>
    </div>

    <!-- Charts / Breakdown grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 page-break">
      <div class="print-card bg-slate-900/30 border border-slate-805 p-6 rounded-2xl">
        <h3 class="text-sm font-bold text-white mb-4 uppercase tracking-wider">Distribuição por Categoria</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          ${categoriesCardsHTML}
        </div>
      </div>

      <div class="print-card bg-slate-900/30 border border-slate-805 p-6 rounded-2xl space-y-6">
        <div>
          <h3 class="text-sm font-bold text-white mb-4 uppercase tracking-wider">Status Geral</h3>
          <div class="space-y-4">
            ${statusChartRowsHTML}
          </div>
        </div>
        
        <div class="pt-6 border-t border-slate-800/80">
          <h3 class="text-sm font-bold text-white mb-4 uppercase tracking-wider">Distribuição por Filial / Polo</h3>
          <div class="space-y-4">
            ${unitsChartRowsHTML}
          </div>
        </div>
      </div>
    </div>

    <!-- Table details -->
    <div class="print-card bg-slate-900/30 border border-slate-805 rounded-2xl overflow-hidden page-break">
      <div class="p-6 border-b border-slate-800">
        <h3 class="text-sm font-bold text-white uppercase tracking-wider">Detalhamento dos Ativos Cadastrados</h3>
        <p class="text-xs text-slate-500 mt-1">Lista completa contendo as especificações básicas de cada ativo filtrado na amostra.</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-900 text-slate-400 border-b border-slate-800 text-xs font-bold uppercase">
              <th class="px-4 py-3">ID Interno</th>
              <th class="px-4 py-3">Nome</th>
              <th class="px-4 py-3">Patrimônio</th>
              <th class="px-4 py-3">Categoria</th>
              <th class="px-4 py-3">Modelo</th>
              <th class="px-4 py-3">Filial</th>
              <th class="px-4 py-3">Responsável</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${assetsTableRows}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- JAVASCRIPT LOGIC -->
  <script>
    let currentSlide = 0;
    const slides = document.querySelectorAll('.slide');

    function showSlide(index) {
      if (index < 0 || index >= slides.length) return;
      slides.forEach(s => s.classList.remove('active'));
      slides[index].classList.add('active');
      currentSlide = index;
      document.getElementById('slide-indicator').innerText = (currentSlide + 1) + ' / ' + slides.length;
    }

    function nextSlide() {
      if (currentSlide < slides.length - 1) {
        showSlide(currentSlide + 1);
      }
    }

    function prevSlide() {
      if (currentSlide > 0) {
        showSlide(currentSlide - 1);
      }
    }

    // Keybindings for PowerPoint experience
    document.addEventListener('keydown', (e) => {
      const isSlidesVisible = !document.getElementById('slides-container').classList.contains('hidden');
      if (!isSlidesVisible) return;

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prevSlide();
      }
    });

    function setView(mode) {
      const slidesContainer = document.getElementById('slides-container');
      const reportContainer = document.getElementById('report-container');
      
      const btnSlides = document.getElementById('btn-view-slides');
      const btnReport = document.getElementById('btn-view-report');

      if (mode === 'slides') {
        slidesContainer.classList.remove('hidden');
        reportContainer.classList.add('hidden');
        
        btnSlides.className = "px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 transition-all flex items-center gap-1.5";
        btnReport.className = "px-4 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1.5";
      } else {
        slidesContainer.classList.add('hidden');
        reportContainer.classList.remove('hidden');
        
        btnReport.className = "px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 transition-all flex items-center gap-1.5";
        btnSlides.className = "px-4 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1.5";
      }
    }

    function toggleTheme() {
      const html = document.documentElement;
      const sunIcon = document.getElementById('theme-icon-sun');
      const moonIcon = document.getElementById('theme-icon-moon');
      
      if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        html.classList.add('light');
        document.body.className = "bg-slate-50 text-slate-900 min-h-screen flex flex-col font-sans transition-colors duration-200";
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
      } else {
        html.classList.remove('light');
        html.classList.add('dark');
        document.body.className = "bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans transition-colors duration-200";
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
      }
    }
  </script>
</body>
</html>
    `;

    const reportWindow = window.open("", "_blank");
    if (reportWindow) {
      reportWindow.document.write(htmlContent);
      reportWindow.document.close();
    } else {
      alert("O bloqueador de pop-ups impediu a abertura do relatório. Por favor, permita pop-ups para este site.");
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      if (lines.length < 2) {
        alert("O arquivo CSV selecionado está vazio ou não possui cabeçalho.");
        return;
      }

      const separator = lines[0].includes(';') ? ';' : ',';
      const importedAssets: Asset[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let charIndex = 0; charIndex < line.length; charIndex++) {
          const char = line[charIndex];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === separator && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());

        if (values.length < 5) continue;

        const randomIDNum = Math.floor(1000 + Math.random() * 9000);
        const name = values[1] || `Ativo Importado ${randomIDNum}`;
        const patrimonio = values[2] || `#PAT-${randomIDNum}`;
        const category = values[3] || 'Notebooks';
        const model = values[4] || 'Modelo Genérico';
        const serialNumber = values[5] || `SN-${randomIDNum}-X`;
        const unit = values[6] || 'Matriz - São Paulo';
        const location = values[7] || 'Escritório Geral';
        const responsibleName = values[8] || 'Administrador';
        const status = (values[9] || 'Em Uso') as AssetStatus;
        const value = parseFloat(values[10]) || 1500.00;
        const acquisitionDate = values[11] || new Date().toISOString().split('T')[0];
        const warrantyExpiry = values[12] || new Date(Date.now() + 365*2*24*60*60*1000).toISOString().split('T')[0];

        const newAsset: Asset = {
          id: values[0] || `KINETIC-${randomIDNum}`,
          patrimonio,
          name,
          category,
          model,
          serialNumber,
          unit,
          location,
          currentFloor: category === 'Hardware de Rede' ? 'cpd' : 'office',
          mapCoordinates: { x: Math.floor(15 + Math.random() * 70), y: Math.floor(15 + Math.random() * 70) },
          responsible: {
            name: responsibleName,
            initials: responsibleName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          },
          status,
          value,
          acquisitionDate,
          warrantyExpiry,
          specifications: {
            "Sistema Operacional": "Homologado Corporativo"
          },
          history: [
            {
              id: `hist-import-${Date.now()}-${i}`,
              title: "Ativo Importado via CSV",
              responsible: "Sistema",
              date: new Date().toISOString().split('T')[0],
              time: new Date().toTimeString().slice(0, 5),
              type: "creation",
              description: `Ativo importado com sucesso no almoxarifado de ${unit}.`
            }
          ],
          imageUrl: category === 'Notebooks' 
            ? "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=800"
            : "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=800"
        };
        importedAssets.push(newAsset);
      }

      if (importedAssets.length === 0) {
        alert("Nenhum ativo válido foi encontrado no CSV.");
        return;
      }

      const { error } = await supabase.from('assets').insert(importedAssets);
      if (error) {
        alert("Erro ao salvar ativos importados no banco: " + error.message);
        return;
      }

      setAssets(prev => [...importedAssets, ...prev]);

      onAddActivity({
        type: "creation",
        title: "Importação via CSV",
        details: `${importedAssets.length} novos ativos importados com sucesso.`,
        by: "Administrador",
        icon: "add_circle",
        badgeColor: "bg-indigo-600"
      });

      alert(`${importedAssets.length} ativos importados com sucesso!`);
    };
    reader.readAsText(file);
  };

  // Filters state
  const [selectedUnit, setSelectedUnit] = useState('Todas as Unidades');
  const [selectedCategory, setSelectedCategory] = useState('Todas Categorias');
  const [selectedStatus, setSelectedStatus] = useState('Qualquer Status');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
    storage: '',
    connectedTo: '',
    imageUrl: ''
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

  const statusesList = ['Qualquer Status', 'Em Uso', 'Manutenção', 'Armazenado', 'Extraviado', 'Obsoleto'];

  // Photo upload state
  const [assetImageFile, setAssetImageFile] = useState<File | null>(null);
  const [assetImagePreview, setAssetImagePreview] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [scanningField, setScanningField] = useState<'patrimonio' | 'serialNumber' | null>(null);

  React.useEffect(() => {
    if (!scanningField) return;

    let html5QrCode: Html5Qrcode | null = null;
    let isComponentMounted = true;
    let isStarting = false;

    function onScanSuccess(decodedText: string) {
      if (!isComponentMounted || !html5QrCode) return;
      
      setNewAssetForm(prev => ({ ...prev, [scanningField as string]: decodedText }));
      
      if (html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
          setScanningField(null);
        }).catch(err => console.log("Stop error", err));
      } else {
        setScanningField(null);
      }
    }

    function onScanFailure() {}

    async function initScanner() {
      if (!isComponentMounted) return;
      isStarting = true;
      try {
        html5QrCode = new Html5Qrcode("new-asset-reader", {
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
            qrbox: { width: 250, height: 100 }
          },
          onScanSuccess,
          onScanFailure
        );
      } catch (err) {
        console.error("Camera start failed", err);
        const manual = prompt(`Não foi possível acessar a câmera.\nDigite o código manualmente para ${scanningField === 'patrimonio' ? 'Patrimônio' : 'Nº de Série'}:`);
        if (manual) setNewAssetForm(prev => ({ ...prev, [scanningField]: manual }));
        setScanningField(null);
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
  }, [scanningField]);

  // Barcode scanner handler
  const handleBarcodeScan = (targetField: 'patrimonio' | 'serialNumber') => {
    setScanningField(targetField);
  };

  // Handle photo selection (from file picker or camera)
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAssetImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAssetImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload image to Supabase Storage and return public URL
  const uploadAssetImage = async (file: File, assetId: string): Promise<string> => {
    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `assets/${assetId}.${ext}`;
    const { error } = await supabase.storage.from('asset-images').upload(filePath, file, { upsert: true });
    if (error) {
      console.error('Upload error:', error);
      // Fallback: return a data URL
      return assetImagePreview;
    }
    const { data: urlData } = supabase.storage.from('asset-images').getPublicUrl(filePath);
    return urlData?.publicUrl || assetImagePreview;
  };

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

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedUnit, selectedCategory, selectedStatus, startDate, endDate]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / itemsPerPage));
  const paginatedAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAssets.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAssets, currentPage, itemsPerPage]);

  const safeCurrentPage = Math.min(currentPage, totalPages);
  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages]);

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
    } else if (status === 'Obsoleto') {
      classes = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50';
      dotColor = 'bg-purple-500';
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
  const handleCreateAssetSubmit = async (e: React.FormEvent) => {
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
        ...(newAssetForm.connectedTo ? { "Host": newAssetForm.connectedTo } : {}),
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
      imageUrl: ''
    };

    // Upload photo if selected
    if (assetImageFile) {
      setIsUploadingImage(true);
      try {
        const imageUrl = await uploadAssetImage(assetImageFile, newID);
        newAsset.imageUrl = imageUrl;
      } catch (err) {
        console.error('Erro no upload da foto:', err);
      }
      setIsUploadingImage(false);
    }

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
      storage: '',
      connectedTo: '',
      imageUrl: ''
    });
    setAssetImageFile(null);
    setAssetImagePreview('');

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
          description: `Fase operacional actualizada em lote para: ${bulkTargetStatus}.`
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
      <input 
        type="file" 
        id="csv-file-import-input" 
        accept=".csv" 
        onChange={handleImportCSV} 
        style={{ display: 'none' }} 
      />
      {/* Header action menu */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Gestão de Ativos</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Visualize, filtre e gerencie o ciclo de vida completo de seus ativos de TI e mobiliário corporativos.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 flex-nowrap hide-scrollbar">
          <button 
            id="btn-import-assets"
            onClick={() => document.getElementById('csv-file-import-input')?.click()}
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm cursor-pointer shrink-0"
          >
            <Upload size={14} />
            Importar CSV
          </button>

          <button 
            id="btn-export-all-assets"
            onClick={handleExportCSV}
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm cursor-pointer shrink-0"
          >
            <Download size={14} />
            Exportar XLS
          </button>

          <button 
            id="btn-board-report"
            onClick={handleGenerateBoardReport}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer active:scale-95 shrink-0"
          >
            <FileText size={14} />
            Apresentação Diretoria
          </button>

          <button 
            id="btn-add-asset-trigger"
            onClick={() => setIsNewAssetOpen(true)}
            className="bg-indigo-700 hover:bg-indigo-800 text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow transition-transform active:scale-95 shrink-0"
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
                    checked={paginatedAssets.length > 0 && selectedIds.length === filteredAssets.length}
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
              {paginatedAssets.length === 0 ? (
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
                paginatedAssets.map((asset) => {
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
        <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-xs gap-3">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 dark:text-slate-400 font-semibold select-none">
              Mostrando <span className="text-slate-900 dark:text-white">{((safeCurrentPage - 1) * itemsPerPage) + 1}–{Math.min(safeCurrentPage * itemsPerPage, filteredAssets.length)}</span> de <span className="text-slate-900 dark:text-white">{filteredAssets.length}</span> resultados ({assets.length} ativos totais)
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value={10}>10 por página</option>
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
              <option value={100}>100 por página</option>
            </select>
          </div>
          <div className="flex items-center gap-1 select-none">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage <= 1}
              className="w-7 h-7 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
            >«</button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
              className="w-7 h-7 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
            >‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
              .reduce<(number | string)[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 dark:text-slate-500">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setCurrentPage(item as number)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                      safeCurrentPage === item
                        ? 'bg-indigo-700 text-white shadow-sm'
                        : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {item}
                  </button>
                )
              )
            }
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
              className="w-7 h-7 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
            >›</button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage >= totalPages}
              className="w-7 h-7 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
            >»</button>
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
            {scanningField ? (
              <div className="flex-1 p-6 flex flex-col items-center justify-center bg-slate-900 overflow-hidden">
                <div className="text-center mb-6">
                  <h4 className="text-white font-extrabold text-xl tracking-tight flex items-center justify-center gap-2">
                    <QrCode size={24} className="text-indigo-400" />
                    Leitor Automático
                  </h4>
                  <p className="text-slate-400 text-sm mt-1">
                    Aponte a câmera para o {scanningField === 'patrimonio' ? 'Patrimônio' : 'Nº de Série'}
                  </p>
                </div>
                <div id="new-asset-reader" className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl bg-black border-4 border-indigo-500"></div>
                <button 
                  type="button" 
                  onClick={() => setScanningField(null)}
                  className="mt-8 px-8 py-3 bg-slate-800 hover:bg-rose-600 text-white rounded-xl font-bold transition shadow"
                >
                  Cancelar Leitura
                </button>
              </div>
            ) : (
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Número de Patrimônio (Opcional)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      id="form-patrimonio"
                      placeholder="Ex: #PAT-004452" 
                      value={newAssetForm.patrimonio}
                      onChange={(e) => setNewAssetForm(prev => ({ ...prev, patrimonio: e.target.value }))}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleBarcodeScan('patrimonio')}
                      className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-700 dark:text-indigo-400 transition-colors"
                      title="Escanear Código de Barras/QR"
                    >
                      <QrCode size={16} />
                    </button>
                  </div>
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
                        <option>Periféricos (Mouse/Teclado)</option>
                        <option>Switches</option>
                        <option>Hardware de Rede</option>
                        <option>Mobiliário</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Vínculo de Dispositivo Pai para Periféricos e Monitores */}
              <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                <label className="block text-xs font-bold text-indigo-900 mb-1.5">Conectado A (Dispositivo Pai) - Opcional</label>
                <select 
                  value={newAssetForm.connectedTo}
                  onChange={(e) => setNewAssetForm(prev => ({ ...prev, connectedTo: e.target.value }))}
                  className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-600 outline-none cursor-pointer text-slate-700"
                >
                  <option value="">-- Selecione o Computador Pai --</option>
                  {assets.filter(a => (a.category === 'Notebooks' || a.category === 'Desktops' || a.model.toLowerCase().includes('pc')) && (!newAssetForm.unit || a.unit === newAssetForm.unit)).map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                  ))}
                </select>
                <p className="text-[10px] text-indigo-600 mt-1">Ao vincular, este ativo aparecerá na ficha técnica do dispositivo pai.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      id="form-serial"
                      placeholder="Ex: LNV-88339281-Z" 
                      value={newAssetForm.serialNumber}
                      onChange={(e) => setNewAssetForm(prev => ({ ...prev, serialNumber: e.target.value }))}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleBarcodeScan('serialNumber')}
                      className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-700 dark:text-indigo-400 transition-colors"
                      title="Escanear Código de Barras/QR"
                    >
                      <QrCode size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <option>Extraviado</option>
                    <option>Obsoleto</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

              {/* Foto do Ativo */}
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest block mb-3">Foto do Ativo</span>
                
                {assetImagePreview ? (
                  <div className="relative">
                    <img 
                      src={assetImagePreview} 
                      alt="Preview" 
                      className="w-full h-48 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => { setAssetImageFile(null); setAssetImagePreview(''); }}
                      className="absolute top-2 right-2 bg-rose-600 text-white p-1 rounded-lg hover:bg-rose-700 transition-colors shadow-sm"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    {/* Upload from gallery */}
                    <label className="flex-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors">
                      <ImagePlus size={24} className="text-slate-400" />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">Selecionar Imagem</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoSelect}
                        className="hidden" 
                      />
                    </label>
                    {/* Capture from camera */}
                    <label className="flex-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors">
                      <Camera size={24} className="text-slate-400" />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">Tirar Foto</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        onChange={handlePhotoSelect}
                        className="hidden" 
                      />
                    </label>
                  </div>
                )}
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
            )}
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
                <option>Obsoleto</option>
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
