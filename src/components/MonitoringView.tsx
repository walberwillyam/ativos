import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Activity, Server, Cpu, HardDrive, Clock, Edit2, X, Search, Filter } from 'lucide-react';

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

const formatUptime = (seconds?: number) => {
  if (seconds === undefined || seconds === null) return 'N/A';
  const d = Math.floor(seconds / (3600*24));
  const h = Math.floor(seconds % (3600*24) / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export default function MonitoringView() {
  const [devices, setDevices] = useState<DeviceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDevice, setEditingDevice] = useState<DeviceHealth | null>(null);
  const [editFormData, setEditFormData] = useState({ custom_name: '', sector: '' });
  const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem('noc_search') || '');
  const [filterUnit, setFilterUnit] = useState(() => localStorage.getItem('noc_unit') || '');
  const [filterIsServer, setFilterIsServer] = useState(() => localStorage.getItem('noc_isServer') === 'true');

  useEffect(() => {
    localStorage.setItem('noc_search', searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    localStorage.setItem('noc_unit', filterUnit);
  }, [filterUnit]);

  useEffect(() => {
    localStorage.setItem('noc_isServer', filterIsServer.toString());
  }, [filterIsServer]);

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices_health')
        .select('*')
        .order('last_ping', { ascending: false });

      if (error) throw error;
      if (data) setDevices(data);
    } catch (err) {
      console.error("Erro ao buscar devices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();

    // Inicia a subscription em realtime
    const subscription = supabase
      .channel('devices_health_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices_health' }, (payload) => {
        // Atualiza a lista quando houver mudança
        setDevices((currentDevices) => {
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

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const getStatus = (lastPing: string) => {
    const pingTime = new Date(lastPing).getTime();
    const now = new Date().getTime();
    const diffSeconds = (now - pingTime) / 1000;
    
    // Se o ping foi há mais de 240 segundos (4 min), considera offline
    if (diffSeconds > 240) return 'offline';
    return 'online';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSaveEdit = async () => {
    if (!editingDevice) return;
    try {
      const { error } = await supabase
        .from('devices_health')
        .update({
          custom_name: editFormData.custom_name,
          sector: editFormData.sector
        })
        .eq('id', editingDevice.id);

      if (error) throw error;
      
      // Update local state optimisticly (Realtime might also catch it)
      setDevices(prev => prev.map(d => d.id === editingDevice.id ? { ...d, custom_name: editFormData.custom_name, sector: editFormData.sector } : d));
      setEditingDevice(null);
    } catch (err) {
      console.error("Erro ao salvar:", err);
      alert("Falha ao salvar. Verifique se as novas colunas foram criadas no banco.");
    }
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch = searchQuery === '' || 
      device.asset_id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (device.custom_name && device.custom_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (device.sector && device.sector.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesUnit = filterUnit === '' || device.unit_id === filterUnit;
    
    const matchesServer = !filterIsServer || 
      (device.os_info && device.os_info.toLowerCase().includes('server')) || 
      (device.custom_name && (device.custom_name.toLowerCase().includes('server') || device.custom_name.toLowerCase().includes('servidor'))) ||
      (device.asset_id && (device.asset_id.toLowerCase().includes('server') || device.asset_id.toLowerCase().includes('srv') || device.asset_id.toLowerCase().includes('servidor')));

    return matchesSearch && matchesUnit && matchesServer;
  });

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-slate-500 dark:text-slate-400 dark:text-slate-500 animate-pulse">Carregando telemetria...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-slate-50 dark:bg-slate-800 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Telemetria em Tempo Real</h1>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Monitoramento de saúde dos ativos com o agente instalado.</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome, setor ou hostname..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-600 outline-none dark:text-white"
            />
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-48">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select 
                value={filterUnit}
                onChange={(e) => setFilterUnit(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-600 outline-none dark:text-white appearance-none"
              >
                <option value="">Todas as Unidades</option>
                {Array.from(new Set(devices.map(d => d.unit_id))).filter(Boolean).map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
            
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl whitespace-nowrap">
              <input 
                type="checkbox" 
                checked={filterIsServer}
                onChange={(e) => setFilterIsServer(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
              />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Apenas Servidores</span>
            </label>
          </div>
        </div>

        {devices.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-700 text-center shadow-sm">
            <Server size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Nenhum ativo transmitindo</h3>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2">Instale o agente em uma máquina e comece a receber os dados.</p>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-700 text-center shadow-sm">
            <Server size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Nenhum ativo encontrado</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Nenhum ativo corresponde aos filtros atuais.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDevices.map(device => {
              const isOffline = Date.now() - new Date(device.last_ping).getTime() > 240000;
              const isCriticalCpu = device.cpu_usage > 90;
              const ramPerc = (device.ram_used / device.ram_total) * 100;
              const isCriticalRam = ramPerc > 90;
              const diskPerc = (device.disk_used / device.disk_total) * 100;
              const isCriticalDisk = diskPerc > 90;

              return (
                <div key={device.id} className={`bg-white dark:bg-slate-800 rounded-xl border ${!isOffline ? 'border-emerald-200 dark:border-emerald-900/50 shadow-emerald-100/50' : 'border-slate-200 dark:border-slate-700 opacity-60'} p-5 shadow-sm transition-all`}>
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                          <Server size={16} className="text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500" />
                          {device.custom_name || device.asset_id}
                        </h3>
                        <button 
                          onClick={() => {
                            setEditingDevice(device);
                            setEditFormData({ custom_name: device.custom_name || '', sector: device.sector || '' });
                          }}
                          className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1"
                          title="Editar Nome e Setor"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">
                        Unidade: {device.unit_id} {device.sector ? `| Setor: ${device.sector}` : ''}
                      </p>
                      {device.custom_name && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-0.5">Hostname: {device.asset_id}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg w-max">
                      <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-slate-300 dark:bg-slate-600' : 'bg-emerald-500 animate-pulse'}`} />
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {isOffline ? 'Offline' : 'Online'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-1">
                          <Cpu size={12} /> CPU Usage
                        </span>
                        <span className={`font-bold ${isCriticalCpu ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {device.cpu_usage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                        <div className={`${isCriticalCpu ? 'bg-rose-500' : 'bg-indigo-500'} h-2 rounded-full transition-all duration-500`} style={{ width: `${device.cpu_usage}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-1">
                          <Activity size={12} /> RAM Usage
                        </span>
                        <span className={`font-bold ${isCriticalRam ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {(device.ram_used / 1024 / 1024 / 1024).toFixed(1)} / {(device.ram_total / 1024 / 1024 / 1024).toFixed(1)} GB
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                        <div className={`${isCriticalRam ? 'bg-rose-500' : 'bg-emerald-500'} h-2 rounded-full transition-all duration-500`} style={{ width: `${ramPerc}%` }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-1">
                          <HardDrive size={12} /> Disk Primary
                        </span>
                        <span className={`font-bold ${isCriticalDisk ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {(device.disk_used / 1024 / 1024 / 1024).toFixed(0)} / {(device.disk_total / 1024 / 1024 / 1024).toFixed(0)} GB
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                        <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${diskPerc}%` }}></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-1">
                        <Clock size={12} /> Uptime
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {formatUptime(device.uptime_seconds)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    <span className="truncate flex-1" title={device.os_info}>{device.os_info}</span>
                    <span className="ml-2 font-mono text-[10px]">Ping: {new Date(device.last_ping).toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingDevice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-white">Editar Ativo</h3>
              <button onClick={() => setEditingDevice(null)} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Hostname (Fixo)</label>
                <input 
                  type="text" 
                  value={editingDevice.asset_id} 
                  disabled 
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Nome Legível</label>
                <input 
                  type="text" 
                  value={editFormData.custom_name}
                  onChange={e => setEditFormData(prev => ({ ...prev, custom_name: e.target.value }))}
                  placeholder="Ex: PC-Recepção"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:focus:bg-slate-800 outline-none dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Setor/Departamento</label>
                <input 
                  type="text" 
                  value={editFormData.sector}
                  onChange={e => setEditFormData(prev => ({ ...prev, sector: e.target.value }))}
                  placeholder="Ex: Atendimento"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:focus:bg-slate-800 outline-none dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-2.5 p-5 border-t border-slate-100 dark:border-slate-700">
              <button 
                onClick={() => setEditingDevice(null)}
                className="w-1/2 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveEdit}
                className="w-1/2 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-sm"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
