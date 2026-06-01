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

import { ActiveScreen, Asset } from './types';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import DashboardView from './components/DashboardView';
import InventoryView from './components/InventoryView';
import ActiveMapView from './components/ActiveMapView';
import AssetDetailView from './components/AssetDetailView';
import ScannerMobileView from './components/ScannerMobileView';
import MonitoringView from './components/MonitoringView';
import AuthScreen from './components/AuthScreen';
import { supabase } from './lib/supabaseClient';

import { INITIAL_ASSETS, INITIAL_NOTIFICATIONS, INITIAL_ACTIVITIES } from './data/initialData';

export default function App() {
  // Collection States
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  // Auth State
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // List of physical location units state
  const [units, setUnits] = useState([
    { 
      id: 'unit-sp', 
      name: 'Matriz - São Paulo', 
      city: 'São Paulo / SP', 
      address: 'Av. Paulista, 1000 - Bela Vista', 
      manager: 'Amanda Santos', 
      email: 'sp.matriz@ativosapoio.com.br',
      partitions: [
        { id: 'office', label: 'Escritório', layout: 'office' },
        { id: 'cpd', label: 'CPD / Datacenter', layout: 'cpd' },
        { id: 'pista', label: 'Pista Operacional', layout: 'pista' },
        { id: 'loja', label: 'Loja / Estoque', layout: 'loja' }
      ]
    },
    { 
      id: 'unit-rj', 
      name: 'Filial - Rio de Janeiro', 
      city: 'Rio de Janeiro / RJ', 
      address: 'Av. Atlântica, 400 - Copacabana', 
      manager: 'Bruno Souza', 
      email: 'rj.filial@ativosapoio.com.br',
      partitions: [
        { id: 'office', label: 'Escritório', layout: 'office' },
        { id: 'cpd', label: 'CPD / Datacenter', layout: 'cpd' },
        { id: 'loja', label: 'Loja / Estoque', layout: 'loja' }
      ]
    },
    { 
      id: 'unit-pr', 
      name: 'Depósito - Paraná', 
      city: 'Curitiba / PR', 
      address: 'Rua das Flores, 88 - Centro', 
      manager: 'Carla Dias', 
      email: 'pr.deposito@ativosapoio.com.br',
      partitions: [
        { id: 'loja', label: 'Armazém / Estoque', layout: 'loja' },
        { id: 'pista', label: 'Pista de Cargas', layout: 'pista' }
      ]
    },
    { 
      id: 'unit-cd', 
      name: 'CD Logístico', 
      city: 'Guarulhos / SP', 
      address: 'Rodovia Presidente Dutra, Km 210', 
      manager: 'Diego Silva', 
      email: 'cd.logistica@ativosapoio.com.br',
      partitions: [
        { id: 'pista', label: 'Piso Logístico', layout: 'pista' },
        { id: 'office', label: 'Administração CD', layout: 'office' },
        { id: 'loja', label: 'Estoque / Docas', layout: 'loja' }
      ]
    }
  ]);

  // Active view constraints
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('dashboard');
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
    setAssets(prev => prev.map(a => a.id === updatedAsset.id ? updatedAsset : a));
    setSelectedAsset(updatedAsset);
  };

  // Quick navigation handlers
  const handleGoBackFromDetails = () => {
    setSelectedAsset(null);
    setActiveScreen('inventory');
  };

  const handleNotificationsClear = () => {
    setNotifications([]);
  };

  // Quick custom category screen list layout
  const renderCategoriesScreen = () => {
    // Dynamically compute counts and valuations of our live assets list
    const categoryStats = [
      { id: "Notebooks", label: "Notebooks e Laptops", desc: "Equipamentos corporativos de uso flexível", baseVal: 3200, icon: Laptop, color: "text-indigo-600 bg-indigo-50" },
      { id: "Monitores", label: "Monitores e Displays", desc: "Telas administrativas de alta resolução", baseVal: 2400, icon: Monitor, color: "text-emerald-600 bg-emerald-50" },
      { id: "Switches", label: "Switches e Redes", desc: "Hardware de infraestrutura e roteamento cpd", baseVal: 1100, icon: Cpu, color: "text-violet-600 bg-violet-50" },
      { id: "Impressoras", label: "Impressoras e Multifuncionais", desc: "Outlines de impressão e cópia patrimoniais", baseVal: 400, icon: Printer, color: "text-slate-600 bg-slate-100" },
    ];

    return (
      <div id="categories-section" className="space-y-6 max-w-7xl mx-auto pb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Tags className="text-indigo-700" size={28} />
            Categorias de Inventário
          </h2>
          <p className="text-slate-500 mt-1">Níveis e divisórios corporativos regulados para depreciação fiscal.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {categoryStats.map((item) => {
            const Icon = item.icon;
            // Compute real counts dynamically
            const liveCount = assets.filter(a => a.category === item.id).length;
            const displayTotal = item.baseVal + liveCount;
            // Simulated valuation
            const totalValuation = displayTotal * 3450;

            return (
              <div key={item.id} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
                <div>
                  <span className={`p-3 rounded-xl inline-block ${item.color}`}>
                    <Icon size={20} />
                  </span>
                  <h4 className="text-lg font-bold text-slate-800 mt-4 leading-tight">{item.label}</h4>
                  <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-end">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 select-none block">Qtd. Ativos</span>
                    <span className="text-2xl font-black text-slate-900 mt-0.5 block">{displayTotal.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400 select-none block">Avaliação</span>
                    <span className="text-xs font-mono font-bold text-indigo-700 mt-1 block">R$ {(totalValuation/1000).toLocaleString('pt-BR', {maximumFractionDigits:0})}k</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Quick custom reports dashboard layout view
  const renderReportsScreen = () => {
    const reportTemplates = [
      { id: "rep-1", title: "Inventário Geral Físico Anual", desc: "Listagem unificada contendo termos de depreciação e responsabilidades técnicas no ano de 2026.", format: "XLSX / PDF • 1.4 MB", update: "Gerado ontem" },
      { id: "rep-2", title: "Termos de Responsabilidade Pendentes", desc: "Fichas técnicas em circulação que necessitam de assinatura eletrônica dos colaboradores.", format: "PDF • 650 KB", update: "Atualizado em tempo real" },
      { id: "rep-3", title: "SLA Operacional de Manuteção TI", desc: "Indicadores qualitativos detalhados de tempos de reparo de hardware.", format: "CSV / XLSX • 4.2 MB", update: "Agendado semanal" },
    ];

    return (
      <div id="reports-section" className="space-y-6 max-w-7xl mx-auto pb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="text-indigo-700" size={28} />
            Relatórios Consolidados
          </h2>
          <p className="text-slate-500 mt-1">Exportação e auditoria legal da carga de ativos patrimoniais para controladoria.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {reportTemplates.map((rep) => (
            <div key={rep.id} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
              <div>
                <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                  Auditoria Regulada
                </span>
                <h4 className="text-lg font-bold text-slate-800 mt-4 leading-tight">{rep.title}</h4>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{rep.desc}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
                <div>
                  <p className="text-slate-400 font-medium select-none">{rep.format}</p>
                  <p className="text-[10px] text-indigo-600 font-bold mt-1 uppercase">{rep.update}</p>
                </div>
                <button 
                  onClick={() => alert(`Documento '${rep.title}' preparado para download!`)}
                  className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl font-bold text-xs shadow"
                >
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Quick Settings View Screen
  const renderSettingsView = () => {
    return (
      <div id="settings-section" className="space-y-6 max-w-2xl mx-auto pb-10 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-1.5">
            <SettingsIcon size={24} className="text-indigo-700" />
            Configurações do Sistema
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">Ajustes gerais do barramento físico RFID e API do Ativos Apoio.</p>
        </div>

        <div className="space-y-5 pt-3 divider-y divider-slate-100">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">Responsável Administrativo Titular</label>
            <input 
              type="text" 
              defaultValue="Admin Geral (Walber Binho)" 
              disabled
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-500 font-bold select-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">Frequência de Envio Syslog RFID</label>
            <select className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-600 cursor-pointer">
              <option>Padrão: A cada 12 horas</option>
              <option>Alta Frequência: Tempo real (Ronda contínua)</option>
              <option>Baixa Frequência: Manual diário</option>
            </select>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-black text-slate-700 uppercase tracking-wider">Integrações do Barramento</span>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="bg-indigo-100 text-indigo-700 p-2.5 rounded-xl block">
                  <Sparkles size={16} />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Google Workspace Cloud Integration</h4>
                  <p className="text-[10px] text-slate-400">Automatiza criação de termos em PDF no Google Drive corporativo.</p>
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
              className="px-4 py-2 hover:bg-slate-50 rounded-xl border border-slate-200 text-slate-600"
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

  return (
    <div id="app-root-container" className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Universal Top Header bar of the high fidelity application */}
      <Navbar 
        setActiveScreen={setActiveScreen} 
        notifications={notifications} 
        handleNotificationsClear={handleNotificationsClear} 
        userEmail={session.user.email}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex relative">
        
        {/* Dynamic Nav Sidebar component layout */}
        <Sidebar 
          activeScreen={activeScreen} 
          setActiveScreen={setActiveScreen} 
          totalAssetsCount={12476 + assets.length} 
        />

        {/* Dynamic content rendering with loading animations */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-[calc(100vw-256px)] select-text">
          
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
            />
          )}

          {/* Asset Ficha do Ativo Detail Sheet view */}
          {activeScreen === 'detail' && selectedAsset && (
            <AssetDetailView 
              asset={selectedAsset} 
              onGoBack={handleGoBackFromDetails} 
              onUpdateAsset={handleUpdateAsset} 
              onAddActivity={handleAddLiveActivity}
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
          {activeScreen === 'monitoring' && <MonitoringView />}

          {/* Dynamic Mock views resolved safely */}
          {activeScreen === 'categories' && renderCategoriesScreen()}
          {activeScreen === 'reports' && renderReportsScreen()}
          {activeScreen === 'settings' && renderSettingsView()}
        </main>
      </div>
    </div>
  );
}
