import React, { useState } from 'react';
import { 
  Bell, 
  Search, 
  QrCode, 
  Briefcase,
  LogOut,
  Moon,
  Sun,
  Menu
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { ActiveScreen } from '../types';

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
}

interface NavbarProps {
  setActiveScreen: (screen: ActiveScreen) => void;
  notifications: Notification[];
  handleNotificationsClear: () => void;
  userEmail?: string;
  userProfile?: any;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
}

export default function Navbar({ setActiveScreen, notifications, handleNotificationsClear, userEmail, userProfile, isSidebarCollapsed, setIsSidebarCollapsed }: NavbarProps) {
  const [globalSearch, setGlobalSearch] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && userProfile?.id) {
      const file = e.target.files[0];
      try {
        const safeName = file.name.replace(/\s+/g, '_');
        const fileName = `avatars/${userProfile.id}_${Date.now()}_${safeName}`;
        const { error } = await supabase.storage.from('ativos_arquivos').upload(fileName, file, { upsert: true });
        if (error) throw error;
        
        const { data: urlData } = supabase.storage.from('ativos_arquivos').getPublicUrl(fileName);
        
        await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', userProfile.id);
        window.location.reload();
      } catch (err: any) {
        console.error("Upload Error:", err);
        alert(`Erro ao enviar foto: ${err.message || "Tente novamente mais tarde."}`);
      }
    }
  };

  return (
    <header className="h-16 border-b border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-40 select-none flex items-center justify-between px-6 shadow-xs leading-none transition-colors duration-200">
      
      {/* Brand visual header logos matching mockups exactly */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl transition duration-150 active:scale-90"
          title="Alternar Menu"
        >
          <Menu size={20} />
        </button>
        <div 
          onClick={() => setActiveScreen('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 active:scale-95 transition-all text-slate-900"
        >
          <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
            <img src="/logo.png" alt="Gestão de Ativos Logo" className="w-full h-full object-contain" />
          </span>
          <div>
            <h1 className="text-[17px] font-black tracking-tight text-slate-950 dark:text-white">Ativos Apoio</h1>
            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mt-0.5">Controladoria Técnica</p>
          </div>
        </div>
      </div>

      {/* Global Instant Search input overlay toolbar */}
      <div className="hidden md:flex relative w-full max-w-sm mx-8">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input 
          type="text"
          id="global-header-search"
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && globalSearch) {
              setActiveScreen('inventory');
              alert(`Buscando por '${globalSearch}' no inventário geral...`);
            }
          }}
          placeholder="Pesquisa rápida global (Tecle Enter)..."
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-350 dark:hover:border-slate-600 focus:bg-white dark:focus:bg-slate-900 rounded-full pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 dark:text-white"
        />
      </div>

      {/* Context and notification alerts */}
      <div className="flex items-center gap-4">
        
        {/* Quick Scanner Launcher icon */}
        <button 
          id="header-scanner-launcher-btn"
          onClick={() => setActiveScreen('scanner')}
          title="Abrir Simulador de Leitor QR Rápido"
          className="text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl transition duration-150 flex items-center gap-1.5 active:scale-90"
        >
          <QrCode size={18} />
          <span className="hidden sm:inline text-xs font-bold text-slate-600 dark:text-slate-300">Scan Rápido</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="text-slate-400 hover:text-amber-500 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl transition duration-150 active:scale-90"
          title="Alternar Tema"
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Alerts count Notifications Popup */}
        <div className="relative">
          <button 
            id="header-notif-btn"
            onClick={() => setIsNotificationsOpen(prev => !prev)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl transition duration-150 relative active:scale-90"
          >
            <Bell size={18} />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute top-1 right-1 bg-rose-500 text-white w-2.5 h-2.5 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {/* Notifications panel dropdown sheet */}
          {isNotificationsOpen && (
            <div 
              id="header-notif-dropdown"
              className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden leading-normal text-left"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-widest leading-none">Novas Ocorrências</h3>
                <button 
                  onClick={() => {
                    handleNotificationsClear();
                    setIsNotificationsOpen(false);
                  }}
                  className="text-[10px] font-bold text-indigo-700 hover:underline bg-indigo-50 px-2 py-1 rounded"
                >
                  Marcar Lidas
                </button>
              </div>
              
              <div className="divide-y divide-slate-100/60 max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">Nenhum alerta pendente.</div>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{notif.title}</p>
                      <p className="text-[11px] text-slate-500 mt-1">{notif.description}</p>
                      <span className="text-[9px] text-slate-400 font-mono mt-1.5 block">{notif.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block" />

        {/* User profile capsule */}
        <div className="flex items-center gap-2.5">
          <label className="cursor-pointer relative group">
            <img 
              src={userProfile?.avatar_url || "https://lh3.googleusercontent.com/aida/AP1WRLsBYYnnV-luFdNkqjmViVKgBL_wnBHD1mm0U_1MBJNBc0Nq2Ta13pem3-6e70vJuGD9K7KMYM-NjXowD6knnAkEbc7KveeBYKI-AIJxM1shD7XyOPQ9sOMz-qiauEObw7rtu7DybOldDRMRMion_3zk4LjzGAUsr2nUQ-p1vG-QG6yrwNBDvVhZlmmcy-bWfQ6-Sd24IOrs_-tDGvp39-kSVYDMJEf0jfDLv33a_N3xFAf3wwaZMFW3IA"} 
              alt="Avatar" 
              className="w-8 h-8 rounded-full border border-slate-200 shadow-xs object-cover group-hover:ring-2 group-hover:ring-indigo-500 transition-all" 
              title="Alterar Foto de Perfil"
            />
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </label>
          <div className="hidden lg:block">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{userProfile?.full_name || 'Usuário do Sistema'}</p>
            <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">{userEmail || 'admin@ativosapoio.com.br'}</p>
          </div>
          
          <button 
            onClick={() => supabase.auth.signOut()}
            className="ml-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 p-2 rounded-xl transition duration-150 active:scale-90"
            title="Sair do sistema"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
