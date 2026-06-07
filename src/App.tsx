/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
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
  FileSpreadsheet
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

    // Monitor hardware changes to push top-bar notifications
    const assetsSubscription = supabase
      .channel('assets_alerts')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'assets' }, (payload) => {
        const newAsset = payload.new as Asset;
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
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(assetsSubscription);
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
          <button 
            onClick={handleExportCSV}
            className="bg-indigo-700 hover:bg-indigo-800 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow inline-flex items-center gap-2 transition cursor-pointer"
          >
            Gerar Planilha Geral
          </button>
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
          userRole={userProfile?.role || 'employee'}
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
