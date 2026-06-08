/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  MapPin, 
  Search, 
  QrCode, 
  Settings as SettingsIcon, 
  HelpCircle,
  Briefcase,
  Layers,
  Heart,
  User,
  Monitor,
  Printer,
  Cpu,
  Laptop,
  CheckCircle,
  Sparkles,
  RefreshCw,
  Tags,
  FileSpreadsheet,
  FileText
} from 'lucide-react';

import { ActiveScreen, Asset, TimelineStep, Category } from './types';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import DashboardView from './components/DashboardView';
import InventoryView from './components/InventoryView';
import ActiveMapView from './components/ActiveMapView';
import AssetDetailView from './components/AssetDetailView';
import ScannerMobileView from './components/ScannerMobileView';
import MonitoringView from './components/MonitoringView';
import CategoriesView from './components/CategoriesView';
import AuthScreen from './components/AuthScreen';
import UserManagementView from './components/UserManagementView';
import NocView from './components/NocView';
import { supabase } from './lib/supabaseClient';

import { INITIAL_NOTIFICATIONS } from './data/initialData';

export default function App() {
  // Collection States
  const [assets, setAssets] = useState<Asset[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [activities, setActivities] = useState<TimelineStep[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  // Auth State
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Track notified offline devices to avoid duplicate alerts
  const notifiedOffline = useRef<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
    });

    const fetchUserProfile = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) setUserProfile(data);
    };

    // Fetch all real data
    const fetchAllData = async () => {
      const [{ data: assetsData }, { data: unitsData }, { data: activitiesData }, { data: categoriesData }] = await Promise.all([
        supabase.from('assets').select('*'),
        supabase.from('units').select('*'),
        supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('categories').select('*').order('name', { ascending: true })
      ]);

      if (unitsData) setUnits(unitsData);
      if (categoriesData) setCategories(categoriesData);
      if (assetsData) setAssets(assetsData);
      if (activitiesData) setActivities(activitiesData);
    };

    fetchAllData();

    // Monitor hardware changes to push top-bar notifications and sync state in real-time
    const assetsSubscription = supabase
      .channel('assets_alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newAsset = payload.new as Asset;
          setAssets(prev => {
            if (prev.some(a => a.id === newAsset.id)) return prev;
            return [...prev, newAsset];
          });
        } else if (payload.eventType === 'UPDATE') {
          const newAsset = payload.new as Asset;
          setAssets(prev => prev.map(a => a.id === newAsset.id ? newAsset : a));
          
          if (newAsset.history && Array.isArray(newAsset.history) && newAsset.history.length > 0) {
            const latestStep = newAsset.history[0];
            if (latestStep.title === "Alteração de Hardware Detectada (Agente)") {
              setNotifications(prev => {
                const alreadyNotified = prev.some(n => n.id === latestStep.id);
                if (alreadyNotified) return prev;
                
                const newNotif = {
                  id: latestStep.id,
                  title: "Aviso de Hardware",
                  description: `Ativo ${newAsset.name || newAsset.id}: ${latestStep.description}`,
                  time: "Agora mesmo",
                  read: false
                };
                return [newNotif, ...prev];
              });
            }
          }
        } else if (payload.eventType === 'DELETE') {
          const oldAsset = payload.old as { id: string };
          setAssets(prev => prev.filter(a => a.id !== oldAsset.id));
        }
      })
      .subscribe();

    // Check for offline computers every minute
    const checkOfflineDevices = async () => {
      const { data } = await supabase.from('devices_health').select('asset_id, last_ping');
      if (data) {
        const now = new Date();
        data.forEach(device => {
          const pingDate = new Date(device.last_ping);
          const diffMinutes = (now.getTime() - pingDate.getTime()) / 60000;
          
          if (diffMinutes > 4) { // Agent pings every 3 min; >4 min means it's late/offline
            if (!notifiedOffline.current.has(device.asset_id)) {
              notifiedOffline.current.add(device.asset_id);
              setNotifications(prev => {
                const newNotif = {
                  id: `offline-${device.asset_id}-${Date.now()}`,
                  title: "Computador Offline",
                  description: `O dispositivo ${device.asset_id} parou de enviar telemetria e parece estar offline.`,
                  time: "Agora mesmo",
                  read: false
                };
                return [newNotif, ...prev];
              });
            }
          } else {
            // Remove from the set if it's back online so we can alert again if it goes offline later
            if (notifiedOffline.current.has(device.asset_id)) {
              notifiedOffline.current.delete(device.asset_id);
            }
          }
        });
      }
    };

    const offlineIntervalId = setInterval(checkOfflineDevices, 60000);
    checkOfflineDevices();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(assetsSubscription);
      clearInterval(offlineIntervalId);
    };
  }, []);

  // Active view constraints
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>(() => {
    const saved = localStorage.getItem('ativos_active_screen');
    return (saved as ActiveScreen) || 'dashboard';
  });

  // Override active screen if NOC
  useEffect(() => {
    if (userProfile?.role === 'noc' && activeScreen !== 'noc') {
      setActiveScreen('noc');
    }
  }, [userProfile?.role, activeScreen]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('ativos_sidebar_collapsed');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('ativos_active_screen', activeScreen);
  }, [activeScreen]);

  useEffect(() => {
    localStorage.setItem('ativos_sidebar_collapsed', JSON.stringify(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Register dynamic unit addition
  const handleAddUnit = (newUnit: { id: string; name: string; city: string; address: string; manager: string; email: string }) => {
    const unitWithPartitions = {
      ...newUnit,
      partitions: [
        { id: 'office', label: 'Escritório', layout: 'office' },
        { id: 'cpd', label: 'CPD / Datacenter', layout: 'cpd' },
        { id: 'pista', label: 'Pista Operacional', layout: 'pista' },
        { id: 'loja', label: 'Loja / Estoque', layout: 'loja' }
      ]
    };
    setUnits(prev => [...prev, unitWithPartitions]);
    
    // Save to DB
    supabase.from('units').insert([unitWithPartitions]).then();

    // Log unit creation activity log
    handleAddLiveActivity({
      type: "creation",
      title: "Nova Unidade Cadastrada",
      details: `Polo administrativo "${newUnit.name}" adicionado com sucesso em ${newUnit.city}.`,
      by: newUnit.manager,
      icon: "map_pin",
      badgeColor: "bg-emerald-600"
    });
  };

  // Update dynamic unit partitions list
  const handleUpdateUnitPartitions = (unitId: string, updatedPartitions: Array<{ id: string; label: string; layout: string }>) => {
    setUnits(prev => prev.map(u => u.id === unitId ? { ...u, partitions: updatedPartitions } : u));
    
    // Save to DB
    supabase.from('units').update({ partitions: updatedPartitions }).eq('id', unitId).then();

    const targetUnit = units.find(u => u.id === unitId);
    if (targetUnit) {
      handleAddLiveActivity({
        type: "creation",
        title: "Partições Atualizadas",
        details: `Setores da unidade "${targetUnit.name}" reconfigurados com sucesso. Total atual: ${updatedPartitions.length}.`,
        by: targetUnit.manager || "Gestor de TI",
        icon: "add_circle",
        badgeColor: "bg-indigo-600"
      });
    }
  };

  // Update existing unit data
  const handleUpdateUnit = (updatedUnit: { id: string; name: string; city: string; address: string; manager: string; email: string }) => {
    setUnits(prev => prev.map(u => u.id === updatedUnit.id ? { ...u, ...updatedUnit } : u));
    
    // Save to DB
    supabase.from('units').update(updatedUnit).eq('id', updatedUnit.id).then();

    handleAddLiveActivity({
      type: "update",
      title: "Unidade Atualizada",
      details: `Dados da unidade "${updatedUnit.name}" foram atualizados com sucesso.`,
      by: updatedUnit.manager || "Gestor de TI",
      icon: "edit",
      badgeColor: "bg-indigo-600"
    });
  };

  // Helper routine to append new activities dynamically
  const handleAddLiveActivity = (newAct: {
    type: string;
    title: string;
    details: string;
    by: string;
    icon: string;
    badgeColor: string;
  }) => {
    const rawStep = {
      id: `act-live-${Date.now()}`,
      ...newAct,
      time: "Agora mesmo"
    };
    
    // Save to DB
    const dbStep = {
      id: rawStep.id,
      type: rawStep.type,
      title: rawStep.title,
      details: rawStep.details,
      by_user: rawStep.by,
      icon: rawStep.icon,
      badgeColor: rawStep.badgeColor,
      time: rawStep.time
    };
    supabase.from('activities').insert([dbStep]).then();
    
    setActivities(prev => [rawStep, ...prev]);

    // Push standard alert notification
    const newNotif = {
      id: `live-notif-${Date.now()}`,
      title: newAct.title,
      description: newAct.details,
      time: "Agora mesmo",
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Select an asset specifically to view details sheet
  const handleSelectAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setActiveScreen('detail');
  };

  // Perform updates to individual assets (e.g. transfer, maintenance changes)
  const handleUpdateAsset = (updatedAsset: Asset) => {
    const oldAsset = assets.find(a => a.id === updatedAsset.id);
    let finalAsset = { ...updatedAsset };

    if (updatedAsset.status === 'Armazenado' && oldAsset?.handover_term && oldAsset.handover_term.status === 'signed') {
      const closedTerm = {
        ...oldAsset.handover_term,
        status: 'returned' as const,
        returnedAt: new Date().toISOString()
      };

      const returnStep: TimelineStep = {
        id: `step-term-return-${Date.now()}`,
        title: "Termo de Responsabilidade Finalizado",
        responsible: closedTerm.recipientName,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        type: "reception",
        description: `Equipamento retornado ao estoque como Armazenado. Termo assinado por Técnico: ${closedTerm.technicianName} e Recebedor: ${closedTerm.recipientName} finalizado e arquivado.`
      };

      finalAsset.handover_term = null;
      
      const currentPastTerms = oldAsset.specifications?.past_terms ? JSON.parse(oldAsset.specifications.past_terms) : [];
      finalAsset.specifications = {
        ...finalAsset.specifications,
        past_terms: JSON.stringify([closedTerm, ...currentPastTerms])
      };
      
      finalAsset.history = [returnStep, ...finalAsset.history];
    }

    setAssets(prev => prev.map(a => a.id === finalAsset.id ? finalAsset : a));
    setSelectedAsset(finalAsset);
    
    // Save to DB
    supabase.from('assets').update(finalAsset).eq('id', finalAsset.id).then();
  };

  // Category Handlers
  const handleCreateCategory = async (cat: Omit<Category, 'id'>) => {
    const { data, error } = await supabase.from('categories').insert([cat]).select().single();
    if (error) throw error;
    setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleUpdateCategory = async (cat: Category) => {
    const { data, error } = await supabase.from('categories').update(cat).eq('id', cat.id).select().single();
    if (error) throw error;
    setCategories(prev => prev.map(c => c.id === cat.id ? data : c).sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleDeleteCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  // Quick navigation handlers
  const handleGoBackFromDetails = () => {
    setSelectedAsset(null);
    setActiveScreen('inventory');
  };

  const handleNotificationsClear = () => {
    setNotifications([]);
  };

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
    if (assets.length === 0) {
      alert("Nenhum ativo disponível para gerar o relatório.");
      return;
    }

    const totalAssets = assets.length;
    const totalValue = assets.reduce((sum, a) => sum + (a.value || 0), 0);
    const avgValue = totalAssets > 0 ? totalValue / totalAssets : 0;

    const catCounts: Record<string, number> = {};
    const catValues: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    const unitCounts: Record<string, number> = {};

    assets.forEach(a => {
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

    const assetsTableRows = assets.map(a => `
      <tr class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
        <td class="px-4 py-3 text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">${a.id}</td>
        <td class="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">${a.name || '-'}</td>
        <td class="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">${a.patrimonio || '-'}</td>
        <td class="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 font-medium">${a.category || '-'}</td>
        <td class="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">${a.model || '-'}</td>
        <td class="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">${a.unit || '-'}</td>
        <td class="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">${a.responsible?.name || '-'}</td>
        <td class="px-4 py-3 text-xs">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-xs ${
            a.status === 'Em Uso' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
            a.status === 'Manutenção' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
            a.status === 'Extraviado' ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400' :
            'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
          }">
            ${a.status || 'Desconhecido'}
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
            s.name === 'Em Uso' ? 'bg-emerald-550' :
            s.name === 'Manutenção' ? 'bg-amber-550' :
            s.name === 'Extraviado' ? 'bg-rose-550' :
            'bg-slate-450'
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
          <div class="bg-indigo-550 h-full" style="width: ${u.percentage}%"></div>
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
      <div class="h-9 w-9 bg-gradient-to-tr from-indigo-600 to-violet-605 rounded-xl flex items-center justify-center text-white font-extrabold text-sm tracking-wider shadow-md shadow-indigo-500/20">
        KT
      </div>
      <div>
        <h1 class="text-sm font-bold tracking-tight text-white">KINETIC ATIVOS</h1>
        <p class="text-[11px] font-semibold text-slate-405 uppercase tracking-widest">Amostra Executiva para Diretoria</p>
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
        <svg id="theme-icon-sun" class="hidden" xmlns="http://www.w3.org/2050/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>
        <svg id="theme-icon-moon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
      </button>
      
      <button onclick="window.print()" class="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-650 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5">
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
            <span class="font-medium text-slate-350">${reportDate}</span>
          </div>
          <div>
            <span class="block uppercase tracking-wider font-semibold text-[10px] text-slate-600">Filtro Aplicado</span>
            <span class="font-medium text-slate-350">${totalAssets} ativos selecionados</span>
          </div>
          <div>
            <span class="block uppercase tracking-wider font-semibold text-[10px] text-slate-600">Autor</span>
            <span class="font-medium text-slate-350">Administrador de TI</span>
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
            <span class="text-xs uppercase font-bold tracking-wider text-slate-405">Valor de Mercado Estimado</span>
            <div class="my-2">
              <span class="text-3xl md:text-4xl font-extrabold text-indigo-405">${formatBRL(totalValue)}</span>
            </div>
            <p class="text-[11px] text-slate-500">Soma financeira do inventário, baseado no valor de aquisição.</p>
          </div>
          
          <div class="print-card bg-slate-900/50 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between h-40">
            <span class="text-xs uppercase font-bold tracking-wider text-slate-405">Custo Médio Unitário</span>
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
                  <span class="text-indigo-405">${c.count} unidades (${c.percentage}%)</span>
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
            
            <div class="text-[11px] text-slate-550 italic">
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
          <button onclick="setView('report')" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-950/20">
            Visualizar Relatório de Impressão Completo
          </button>
        </div>
      </div>
    </div>

    <!-- Slide Navigation Footer -->
    <div class="no-print border-t border-slate-900 pt-6 mt-8 flex justify-between items-center text-xs text-slate-500">
      <div class="flex items-center gap-2">
        <button onclick="prevSlide()" class="p-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 text-slate-300 transition-all">
          <svg xmlns="http://www.w3.org/2050/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
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
        <span class="text-[10px] uppercase font-bold tracking-wider text-slate-550 block mb-1">Valor Médio</span>
        <span class="text-2xl font-extrabold text-purple-400">${formatBRL(avgValue)}</span>
      </div>
      <div class="print-card bg-slate-900/50 border border-slate-850 p-5 rounded-2xl">
        <span class="text-[10px] uppercase font-bold tracking-wider text-slate-550 block mb-1">Em Uso</span>
        <span class="text-3xl font-extrabold text-emerald-400">${
          statusList.find(s => s.name === 'Em Uso')?.count || 0
        }</span>
      </div>
    </div>

    <!-- Charts / Breakdown grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 page-break">
      <div class="print-card bg-slate-900/30 border border-slate-800 p-6 rounded-2xl">
        <h3 class="text-sm font-bold text-white mb-4 uppercase tracking-wider">Distribuição por Categoria</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          ${categoriesCardsHTML}
        </div>
      </div>

      <div class="print-card bg-slate-900/30 border border-slate-800 p-6 rounded-2xl space-y-6">
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
    <div class="print-card bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden page-break">
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

  // Quick custom reports dashboard layout view
  const renderReportsScreen = () => {
    return (
      <div id="reports-section" className="space-y-6 max-w-7xl mx-auto pb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="text-indigo-700" size={28} />
            Relatórios Consolidados
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Exportação e auditoria legal da carga de ativos patrimoniais para controladoria.</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-8 rounded-3xl shadow-sm text-center">
          <FileSpreadsheet size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Relatórios Customizados</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-md mx-auto">
            Gere relatórios reais com base na sua base de dados atual. 
          </p>
          <div class="flex flex-wrap justify-center gap-4">
            <button 
              onClick={handleExportCSV}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 px-6 py-2.5 rounded-xl font-bold text-sm shadow inline-flex items-center gap-2 transition cursor-pointer"
            >
              <FileSpreadsheet size={16} />
              Gerar Planilha Geral
            </button>
            <button 
              onClick={handleGenerateBoardReport}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow inline-flex items-center gap-2 transition cursor-pointer active:scale-95"
            >
              <FileText size={16} />
              Gerar Apresentação Diretoria
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Quick Settings View Screen
  const renderSettingsView = () => {
    return (
      <div id="settings-section" className="space-y-6 max-w-2xl mx-auto pb-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-1.5">
            <SettingsIcon size={24} className="text-indigo-700" />
            Configurações do Sistema
          </h2>
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">Ajustes gerais do barramento físico RFID e API do Ativos Apoio.</p>
        </div>

        <div className="space-y-5 pt-3 divider-y divider-slate-100">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">Responsável Administrativo Titular</label>
            <input 
              type="text" 
              defaultValue="Admin Geral (Walber Binho)" 
              disabled
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold select-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">Frequência de Envio Syslog RFID</label>
            <select className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-600 cursor-pointer">
              <option>Padrão: A cada 12 horas</option>
              <option>Alta Frequência: Tempo real (Ronda contínua)</option>
              <option>Baixa Frequência: Manual diário</option>
            </select>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">Integrações do Barramento</span>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="bg-indigo-100 text-indigo-700 p-2.5 rounded-xl block">
                  <Sparkles size={16} />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Google Workspace Cloud Integration</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Automatiza criação de termos em PDF no Google Drive corporativo.</p>
                </div>
              </div>
              <span className="bg-indigo-100 text-indigo-800 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                CONECTADO
              </span>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 text-xs font-bold">
            <button 
              onClick={() => alert("Configurações padrão restauradas!")}
              className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            >
              Restaurar
            </button>
            <button 
              onClick={() => { alert("Configurações salvas com sucesso no armazenamento local!"); setActiveScreen('dashboard'); }}
              className="bg-indigo-700 hover:bg-indigo-800 text-white px-5 py-2 rounded-xl shadow"
            >
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!session) {
    return <AuthScreen />;
  }

  // If user is NOC, render full screen NOC view without Sidebar or Navbar
  if (userProfile?.role === 'noc') {
    return <NocView assets={assets} userProfile={userProfile} units={units} />;
  }

  return (
    <div id="app-root-container" className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200 flex flex-col font-sans overflow-x-hidden">
      {/* Universal Top Header bar of the high fidelity application */}
      <Navbar 
        setActiveScreen={setActiveScreen} 
        notifications={notifications} 
        handleNotificationsClear={handleNotificationsClear} 
        userEmail={session.user.email}
        userProfile={userProfile}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex relative">
        
        {/* Dynamic Nav Sidebar component layout */}
        <Sidebar 
          activeScreen={activeScreen} 
          setActiveScreen={setActiveScreen} 
          totalAssetsCount={assets.length}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          userProfile={userProfile}
        />

        {/* Dynamic content rendering with loading animations */}
        <main className={`flex-1 min-w-0 p-4 sm:p-6 lg:p-8 w-full ${isSidebarCollapsed ? 'md:max-w-[calc(100vw-80px)]' : 'md:max-w-[calc(100vw-256px)]'} select-text transition-all duration-300`}>
          
          {/* Dashboard (Visão Geral Executiva) View */}
          {activeScreen === 'dashboard' && (
            <DashboardView 
              assets={assets} 
              onSelectAsset={handleSelectAsset} 
              activities={activities}
            />
          )}

          {/* Inventory Spreadsheet Grid table View */}
          {activeScreen === 'inventory' && (
            <InventoryView 
              assets={assets} 
              setAssets={setAssets} 
              onSelectAsset={handleSelectAsset} 
              onAddActivity={handleAddLiveActivity}
              units={units}
              categories={categories}
            />
          )}

          {/* Unidades / Unit Map room viewer screen layout */}
          {activeScreen === 'units' && (
            <ActiveMapView 
              assets={assets} 
              onSelectAsset={handleSelectAsset} 
              units={units}
              onAddUnit={handleAddUnit}
              onUpdateUnitPartitions={handleUpdateUnitPartitions}
              onUpdateUnit={handleUpdateUnit}
              onUpdateAsset={handleUpdateAsset}
            />
          )}

          {/* Asset Ficha do Ativo Detail Sheet view */}
          {activeScreen === 'detail' && selectedAsset && (
            <AssetDetailView 
              asset={selectedAsset} 
              onGoBack={handleGoBackFromDetails} 
              onUpdateAsset={handleUpdateAsset} 
              onAddActivity={handleAddLiveActivity}
              units={units}
              categories={categories}
              userProfile={userProfile}
            />
          )}

          {/* Fast QR Mobile simulation laser scanner view layout */}
          {activeScreen === 'scanner' && (
            <ScannerMobileView 
              assets={assets}
              onUpdateAsset={handleUpdateAsset}
              onAddActivity={handleAddLiveActivity}
              onOpenNewAssetForm={() => {
                setActiveScreen('inventory');
                setTimeout(() => {
                  const trigger = document.getElementById('btn-add-asset-trigger');
                  if (trigger) trigger.click();
                }, 100);
              }}
            />
          )}

          {/* Monitoring Dashboard View */}
          {activeScreen === 'monitoring' && <MonitoringView units={units} />}

          {/* Dynamic Mock views resolved safely */}
          {activeScreen === 'categories' && (
            <CategoriesView
              categories={categories}
              assets={assets}
              onCreateCategory={handleCreateCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          )}
          {activeScreen === 'reports' && renderReportsScreen()}
          {activeScreen === 'settings' && userProfile?.role === 'admin' && renderSettingsView()}
          {activeScreen === 'users' && userProfile?.role === 'admin' && <UserManagementView units={units} />}
        </main>
      </div>
    </div>
  );
}
