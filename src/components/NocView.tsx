import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Asset } from '../types';
import { 
  Activity, 
  Server, 
  Cpu, 
  HardDrive, 
  Clock, 
  LogOut, 
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  Search,
  SlidersHorizontal
} from 'lucide-react';

interface DeviceHealth {
  id: string;
  asset_id: string;
  unit_id: string;
  cpu_usage: number;
  ram_total: number;
  ram_used: number;
  disk_total: number;
  disk_used: number;
  os_info: string;
  last_ping: string;
  uptime_seconds?: number;
  custom_name?: string;
  sector?: string;
}

interface NocViewProps {
  assets: Asset[];
}

export default function NocView({ assets }: NocViewProps) {
  const [devices, setDevices] = useState<DeviceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'critical'>('all');

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices_health')
        .select('*')
        .order('last_ping', { ascending: false });

      if (error) throw error;
      if (data) setDevices(data as DeviceHealth[]);
    } catch (err) {
      console.error("Erro ao carregar telemetria no NOC:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();

    // Live subscription to telemetry changes
    const subscription = supabase
      .channel('noc_devices_health_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices_health' }, (payload) => {
        setDevices((currentDevices) => {
          if (payload.eventType === 'DELETE') {
            return currentDevices.filter(d => d.id !== payload.old.id);
          }
          
          const newDevice = payload.new as DeviceHealth;
          const index = currentDevices.findIndex(d => d.asset_id === newDevice.asset_id);
          
          if (index > -1) {
            const updated = [...currentDevices];
            updated[index] = newDevice;
            return updated;
          } else {
            return [newDevice, ...currentDevices];
          }
        });
      })
      .subscribe();

    // Clock update interval for live display
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      supabase.removeChannel(subscription);
      clearInterval(timer);
    };
  }, []);

  const handleLogout = async () => {
    if (window.confirm("Deseja realmente sair da conta operacional NOC?")) {
      await supabase.auth.signOut();
    }
  };

  const getDeviceStatus = (device: DeviceHealth) => {
    const isOffline = Date.now() - new Date(device.last_ping).getTime() > 240000;
    if (isOffline) return 'offline';

    const ramPerc = (device.ram_used / device.ram_total) * 100;
    const diskPerc = (device.disk_used / device.disk_total) * 100;
    if (device.cpu_usage > 90 || ramPerc > 90 || diskPerc > 90) {
      return 'critical';
    }
    return 'online';
  };

  const getAssetName = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId || a.name === assetId);
    return asset ? asset.name : null;
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return 'N/A';
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // Stats calculation
  const totalCount = devices.length;
  const onlineCount = devices.filter(d => getDeviceStatus(d) === 'online').length;
  const offlineCount = devices.filter(d => getDeviceStatus(d) === 'offline').length;
  const criticalCount = devices.filter(d => getDeviceStatus(d) === 'critical').length;

  // Alerts logic
  const criticalAlerts = devices.filter(d => {
    const status = getDeviceStatus(d);
    return status === 'critical' || status === 'offline';
  });

  const filteredDevices = devices.filter(device => {
    const matchesSearch = 
      (device.custom_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (device.asset_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (device.sector || '').toLowerCase().includes(searchTerm.toLowerCase());

    const status = getDeviceStatus(device);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-hidden selection:bg-indigo-600 selection:text-white">
      {/* Top NOC Glowing Navbar */}
      <header className="border-b border-slate-900 bg-slate-900/40 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-4 w-4 rounded-full bg-indigo-500 opacity-30 animate-ping" />
            <Activity className="text-indigo-500 relative" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
              Centro de Operações de Rede <span className="text-indigo-500 text-xs px-2 py-0.5 rounded border border-indigo-900/50 bg-indigo-950/40 font-bold">Painel NOC</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">
              Sistema de Monitoramento e Telemetria Operacional
            </p>
          </div>
        </div>

        {/* Live status indicators & clocks */}
        <div className="flex items-center gap-6">
          <div className="text-right shrink-0">
            <p className="text-sm font-mono font-bold tracking-widest text-slate-200">
              {currentTime.toLocaleTimeString()}
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold mt-0.5">
              {currentTime.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
            </p>
          </div>

          <div className="h-8 w-px bg-slate-900" />

          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-rose-400 hover:bg-rose-950/20 hover:border-rose-900/50 transition cursor-pointer"
            title="Encerrar Sessão Operacional"
          >
            <LogOut size={14} />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Main dashboard body */}
      <main className="flex-1 p-6 space-y-6 max-w-8xl mx-auto w-full relative z-10">
        
        {/* Row 1: High Fidelity KPI Metrics */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4.5 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider">Total de Máquinas</p>
              <h3 className="text-3xl font-black text-slate-100 tracking-tight mt-1">{totalCount}</h3>
            </div>
            <Server className="text-slate-700" size={32} />
          </div>

          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4.5 flex items-center justify-between shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
            <div>
              <p className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider">Dispositivos Online</p>
              <h3 className="text-3xl font-black text-emerald-400 tracking-tight mt-1">{onlineCount}</h3>
            </div>
            <CheckCircle2 className="text-emerald-950/60 group-hover:scale-105 duration-300" size={32} />
          </div>

          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4.5 flex items-center justify-between shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-600" />
            <div>
              <p className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider">Offline (Alerta)</p>
              <h3 className="text-3xl font-black text-rose-500 tracking-tight mt-1">{offlineCount}</h3>
            </div>
            <AlertOctagon className="text-rose-950/60 group-hover:scale-105 duration-300" size={32} />
          </div>

          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4.5 flex items-center justify-between shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
            <div>
              <p className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider">Carga Crítica</p>
              <h3 className="text-3xl font-black text-amber-500 tracking-tight mt-1">{criticalCount}</h3>
            </div>
            <AlertTriangle className="text-amber-950/60 group-hover:scale-105 duration-300" size={32} />
          </div>
        </section>

        {/* Row 2: NOC Critical Alert Feed (Always Visible if active) */}
        {criticalAlerts.length > 0 && (
          <section className="bg-rose-950/15 border border-rose-900/60 rounded-3xl p-5 shadow-sm">
            <h3 className="text-xs font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5 mb-4">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Incidentes Críticos Ativos ({criticalAlerts.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {criticalAlerts.map(alertDevice => {
                const status = getDeviceStatus(alertDevice);
                const assetName = getAssetName(alertDevice.asset_id);
                return (
                  <div 
                    key={alertDevice.id} 
                    className="bg-slate-950/90 border border-rose-900/40 rounded-xl p-3.5 flex items-start gap-3"
                  >
                    <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-extrabold text-slate-200 truncate">
                        {alertDevice.custom_name || assetName || alertDevice.asset_id}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">Polo: {alertDevice.unit_id} {alertDevice.sector ? `| ${alertDevice.sector}` : ''}</p>
                      <p className="text-[10px] text-rose-400 mt-2 font-bold flex items-center gap-1">
                        {status === 'offline' ? (
                          <span>Conexão perdida há mais de 30 segundos</span>
                        ) : (
                          <span>Sobrecarga crítica detectada</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Filters and search section */}
        <section className="bg-slate-900/20 border border-slate-900 rounded-3xl p-5 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
              <Search size={16} />
            </span>
            <input 
              type="text" 
              placeholder="Pesquisar por Hostname, Nome ou Setor..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-800 rounded-2xl pl-10 pr-4 py-2 text-sm outline-none text-slate-200 transition-colors"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button 
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                statusFilter === 'all' 
                  ? 'bg-indigo-600 border-indigo-500 text-white' 
                  : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos ({totalCount})
            </button>
            <button 
              onClick={() => setStatusFilter('online')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                statusFilter === 'online' 
                  ? 'bg-emerald-600 border-emerald-500 text-white' 
                  : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              Saudáveis ({onlineCount})
            </button>
            <button 
              onClick={() => setStatusFilter('critical')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                statusFilter === 'critical' 
                  ? 'bg-amber-600 border-amber-500 text-white' 
                  : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              Críticos ({criticalCount})
            </button>
            <button 
              onClick={() => setStatusFilter('offline')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                statusFilter === 'offline' 
                  ? 'bg-rose-600 border-rose-500 text-white' 
                  : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              Offline ({offlineCount})
            </button>
            
            <button 
              onClick={fetchDevices}
              className="p-2 bg-slate-950 border border-slate-900 rounded-xl hover:border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Atualizar Dados"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </section>

        {/* Grid containing monitored devices */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="animate-spin text-indigo-500" size={32} />
              <p className="text-slate-500 text-sm">Carregando painel de monitoramento NOC...</p>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-500">
              Nenhuma máquina encontrada.
            </div>
          ) : (
            filteredDevices.map(device => {
              const status = getDeviceStatus(device);
              const assetName = getAssetName(device.asset_id);
              const isOffline = status === 'offline';
              const ramPerc = (device.ram_used / device.ram_total) * 100;
              const diskPerc = (device.disk_used / device.disk_total) * 100;
              
              const isCriticalCpu = device.cpu_usage > 90;
              const isCriticalRam = ramPerc > 90;
              const isCriticalDisk = diskPerc > 90;

              return (
                <div 
                  key={device.id} 
                  className={`bg-slate-900/20 border border-slate-900 rounded-3xl p-5 shadow-sm transition-all duration-300 ${
                    status === 'offline' ? 'border-rose-950/60 bg-rose-950/5 opacity-55' :
                    status === 'critical' ? 'border-amber-900/60 bg-amber-900/5 shadow-amber-950/10' :
                    'border-slate-900 hover:border-indigo-950'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-extrabold text-slate-100 flex items-center gap-1.5 truncate">
                        <Server size={14} className="text-slate-500 shrink-0" />
                        {device.custom_name || assetName || device.asset_id}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-semibold truncate mt-0.5">
                        Polo: {device.unit_id} {device.sector ? `| Setor: ${device.sector}` : ''}
                      </p>
                      {device.custom_name && (
                        <p className="text-[9px] text-slate-600 font-mono tracking-tight mt-0.5">Host: {device.asset_id}</p>
                      )}
                    </div>
                    
                    {/* Status Badge */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border shrink-0 flex items-center gap-1 ${
                      isOffline ? 'bg-rose-950/50 border-rose-900/50 text-rose-400' :
                      status === 'critical' ? 'bg-amber-950/50 border-amber-900/40 text-amber-400' :
                      'bg-emerald-950/50 border-emerald-900/40 text-emerald-400'
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${
                        isOffline ? 'bg-rose-500 animate-pulse' :
                        status === 'critical' ? 'bg-amber-500 animate-pulse' :
                        'bg-emerald-500 animate-pulse'
                      }`} />
                      {status}
                    </span>
                  </div>

                  {/* Telemetry charts */}
                  <div className="space-y-4 pt-2">
                    {/* CPU Progress */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-slate-500 flex items-center gap-1"><Cpu size={12}/> Processador</span>
                        <span className={`font-bold font-mono ${isCriticalCpu ? 'text-rose-500' : 'text-slate-300'}`}>{device.cpu_usage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-950 border border-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${isCriticalCpu ? 'bg-rose-500' : 'bg-indigo-500'}`} 
                          style={{ width: `${isOffline ? 0 : device.cpu_usage}%` }}
                        />
                      </div>
                    </div>

                    {/* RAM Progress */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-slate-500 flex items-center gap-1"><Activity size={12}/> Memória RAM</span>
                        <span className={`font-bold font-mono ${isCriticalRam ? 'text-rose-500' : 'text-slate-300'}`}>
                          {isOffline ? '0.0 GB' : (device.ram_used / 1024 / 1024 / 1024).toFixed(1)} / {(device.ram_total / 1024 / 1024 / 1024).toFixed(1)} GB
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 border border-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${isCriticalRam ? 'bg-rose-500' : 'bg-indigo-400'}`} 
                          style={{ width: `${isOffline ? 0 : ramPerc}%` }}
                        />
                      </div>
                    </div>

                    {/* Disk Progress */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-slate-500 flex items-center gap-1"><HardDrive size={12}/> Armazenamento</span>
                        <span className={`font-bold font-mono ${isCriticalDisk ? 'text-rose-500' : 'text-slate-300'}`}>
                          {isOffline ? '0 GB' : (device.disk_used / 1024 / 1024 / 1024).toFixed(0)} / {(device.disk_total / 1024 / 1024 / 1024).toFixed(0)} GB
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 border border-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-slate-700 transition-all duration-500" 
                          style={{ width: `${isOffline ? 0 : diskPerc}%` }}
                        />
                      </div>
                    </div>

                    {/* Uptime info */}
                    <div className="flex justify-between text-xs border-t border-slate-900 pt-3 text-slate-500">
                      <span className="flex items-center gap-1"><Clock size={12}/> Uptime</span>
                      <span className="font-bold text-slate-400">{isOffline ? 'N/A' : formatUptime(device.uptime_seconds)}</span>
                    </div>
                  </div>

                  {/* Card Footer details */}
                  <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-[9px] font-semibold text-slate-600">
                    <span className="truncate max-w-[130px]">{device.os_info}</span>
                    <span className="font-mono">Ping: {new Date(device.last_ping).toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
