import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Activity, Server, Cpu, HardDrive, Clock } from 'lucide-react';

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
}

export default function MonitoringView() {
  const [devices, setDevices] = useState<DeviceHealth[]>([]);
  const [loading, setLoading] = useState(true);

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
    
    // Se o ping foi há mais de 30 segundos, considera offline
    if (diffSeconds > 30) return 'offline';
    return 'online';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-slate-500 animate-pulse">Carregando telemetria...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-slate-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Telemetria em Tempo Real</h1>
            <p className="text-slate-500 mt-1">Monitoramento de saúde dos ativos com o agente instalado.</p>
          </div>
        </div>

        {devices.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center shadow-sm">
            <Server size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-800">Nenhum ativo transmitindo</h3>
            <p className="text-slate-500 mt-2">Instale o agente em uma máquina e comece a receber os dados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.map(device => {
              const status = getStatus(device.last_ping);
              const ramPerc = (device.ram_used / device.ram_total) * 100;
              const diskPerc = (device.disk_used / device.disk_total) * 100;

              return (
                <div key={device.id} className={`bg-white rounded-xl border ${status === 'online' ? 'border-emerald-200 shadow-emerald-100' : 'border-slate-200'} p-5 shadow-sm transition-all`}>
                  
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Server size={16} className="text-slate-400" />
                        {device.asset_id}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">Unidade: {device.unit_id}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      <span className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                      {status === 'online' ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* CPU */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600 flex items-center gap-1"><Cpu size={14}/> CPU</span>
                        <span className="font-medium text-slate-800">{device.cpu_usage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${device.cpu_usage > 85 ? 'bg-rose-500' : device.cpu_usage > 60 ? 'bg-amber-400' : 'bg-indigo-500'}`} style={{ width: `${device.cpu_usage}%` }}></div>
                      </div>
                    </div>

                    {/* RAM */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600 flex items-center gap-1"><Activity size={14}/> RAM</span>
                        <span className="font-medium text-slate-800">{formatBytes(device.ram_used)} / {formatBytes(device.ram_total)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${ramPerc > 85 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${ramPerc}%` }}></div>
                      </div>
                    </div>
                    
                    {/* Disk */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600 flex items-center gap-1"><HardDrive size={14}/> Disco Primário</span>
                        <span className="font-medium text-slate-800">{formatBytes(device.disk_used)} / {formatBytes(device.disk_total)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${diskPerc}%` }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Clock size={12} /> Último ping:</span>
                    <span>{new Date(device.last_ping).toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
