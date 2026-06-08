/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  LayoutDashboard, 
  Boxes, 
  MapPin, 
  Tags, 
  FileSpreadsheet, 
  Settings, 
  HelpCircle, 
  LogOut,
  QrCode,
  UserCheck,
  Activity
} from 'lucide-react';
import { ActiveScreen } from '../types';
import { supabase } from '../lib/supabaseClient';

interface SidebarProps {
  activeScreen: ActiveScreen;
  setActiveScreen: (screen: ActiveScreen) => void;
  totalAssetsCount: number;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  userProfile?: any;
}

export default function Sidebar({ activeScreen, setActiveScreen, totalAssetsCount, isCollapsed, setIsCollapsed, userProfile }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventário', icon: Boxes },
    { id: 'units', label: 'Unidades', icon: MapPin },
    { id: 'categories', label: 'Categorias', icon: Tags },
    { id: 'reports', label: 'Relatórios', icon: FileSpreadsheet },
    { id: 'monitoring', label: 'Monitoramento', icon: Activity },
    ...(userProfile?.role?.toLowerCase().includes('admin') ? [
      { id: 'settings', label: 'Configurações', icon: Settings },
      { id: 'users', label: 'Gestão de Usuários', icon: UserCheck }
    ] : [])
  ];

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && userProfile?.id) {
      const file = e.target.files[0];
      try {
        const fileName = `avatars/${userProfile.id}_${Date.now()}`;
        const { error } = await supabase.storage.from('ativos_arquivos').upload(fileName, file);
        if (error) throw error;
        
        const { data: urlData } = supabase.storage.from('ativos_arquivos').getPublicUrl(fileName);
        
        await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', userProfile.id);
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert("Erro ao enviar foto. Tente novamente mais tarde.");
      }
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {!isCollapsed && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setIsCollapsed(true)}
        />
      )}
      
      <aside 
        id="side-bar"
        className={`${
          isCollapsed ? '-translate-x-full md:translate-x-0 md:w-20' : 'translate-x-0 w-64 md:w-64'
        } fixed left-0 md:sticky md:left-auto top-16 md:top-16 z-50 md:z-0 flex flex-col bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-[calc(100vh-64px)] shrink-0 justify-between select-none transition-all duration-300`}
      >
      <div className="flex-1 flex flex-col pt-6 overflow-y-auto">
        {/* User Card */}
        <div className={`mb-6 transition-all ${isCollapsed ? 'px-2' : 'px-6'}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center p-2' : 'gap-3 p-3'} bg-white border border-slate-200 rounded-xl shadow-sm`}>
            <label className="relative cursor-pointer group">
              <img 
                src={userProfile?.avatar_url || "https://lh3.googleusercontent.com/aida/AP1WRLsBYYnnV-luFdNkqjmViVKgBL_wnBHD1mm0U_1MBJNBc0Nq2Ta13pem3-6e70vJuGD9K7KMYM-NjXowD6knnAkEbc7KveeBYKI-AIJxM1shD7XyOPQ9sOMz-qiauEObw7rtu7DybOldDRMRMion_3zk4LjzGAUsr2nUQ-p1vG-QG6yrwNBDvVhZlmmcy-bWfQ6-Sd24IOrs_-tDGvp39-kSVYDMJEf0jfDLv33a_N3xFAf3wwaZMFW3IA"} 
                alt="Foto de Perfil Administrativo" 
                className="w-10 h-10 rounded-xl object-cover border-2 border-indigo-600 shadow group-hover:border-indigo-400 transition-all"
                title="Alterar Foto de Perfil"
              />
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
            {!isCollapsed && (
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-0.5 truncate">{userProfile?.full_name || 'Usuário do Sistema'}</h3>
                <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Atendimento Ativo
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Nav link Items */}
        <nav className={`space-y-1 ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isSelected = activeScreen === item.id || (item.id === 'inventory' && activeScreen === 'detail');
            return (
              <button 
                key={item.id}
                id={`side-nav-btn-${item.id}`}
                onClick={() => {
                  setActiveScreen(item.id as ActiveScreen);
                  if (window.innerWidth < 768) setIsCollapsed(true);
                }}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-2xl transition-all duration-200 mb-1 font-bold ${
                  isSelected 
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <IconComponent 
                    size={18} 
                    className={`transition-colors ${isSelected ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-400'}`} 
                  />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>
                {!isCollapsed && item.id === 'inventory' && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-indigo-200 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {totalAssetsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Support & Logout Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-1 bg-slate-50 dark:bg-slate-900">
        <button 
          id="side-nav-btn-support"
          onClick={() => setActiveScreen('scanner')}
          title={isCollapsed ? "Leitor QR Rápido" : undefined}
          className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 w-full'} px-4 py-3 rounded-lg text-sm font-medium transition-all group ${
            activeScreen === 'scanner'
              ? 'bg-indigo-50 dark:bg-indigo-900/30 border-r-4 border-indigo-700 text-indigo-700 dark:text-indigo-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <QrCode size={18} className={activeScreen === 'scanner' ? 'text-indigo-700' : 'text-slate-400'} />
          {!isCollapsed && <span>Leitor QR Rápido</span>}
        </button>

        <a 
          id="side-nav-btn-help"
          href="#help"
          onClick={(e) => { e.preventDefault(); alert("Central de Suporte: Ligue para o ramal 4004 ou envie um e-mail para suporte@ativosapoio.com.br"); }}
          title={isCollapsed ? "Suporte Técnico" : undefined}
          className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 w-full'} px-4 py-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all group`}
        >
          <HelpCircle size={18} className="text-slate-400" />
          {!isCollapsed && <span>Suporte Técnico</span>}
        </a>

        <button 
          id="side-nav-btn-logout"
          onClick={async () => { 
            if(confirm("Deseja realmente sair do Ativos Apoio?")) {
              await supabase.auth.signOut();
            } 
          }}
          title={isCollapsed ? "Sair" : undefined}
          className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 w-full'} px-4 py-3 text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 rounded-2xl transition-colors text-sm font-bold`}
        >
          <LogOut size={18} />
          {!isCollapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
    </>
  );
}
