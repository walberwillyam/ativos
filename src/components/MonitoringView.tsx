import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Activity, Server, Cpu, HardDrive, Clock, Edit2, X } from 'lucide-react';

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
  custom_name?: string;
  sector?: string;
}

export default function MonitoringView() {
  const [devices, setDevices] = useState<DeviceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDevice, setEditingDevice] = useState<DeviceHealth | null>(null);
  const [editFormData, setEditFormData] = useState({ custom_name: '', sector: '' });

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
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <Server size={16} className="text-slate-400" />
                          {device.custom_name || device.asset_id}
                        </h3>
                        <button 
                          onClick={() => {
                            setEditingDevice(device);
                            setEditFormData({ custom_name: device.custom_name || '', sector: device.sector || '' });
                          }}
                          className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                          title="Editar Nome e Setor"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Unidade: {device.unit_id} {device.sector ? `| Setor: ${device.sector}` : ''}
                      </p>
                      {device.custom_name && (
                        <p className="text-[10px] text-slate-400">Hostname: {device.asset_id}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-medium inline-flex items-center gap-1 ${status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
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

      {/* Modal de Edição */}
      {editingDevice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Editar Ativo de Monitoramento</h3>
              <button onClick={() => setEditingDevice(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hostname (Fixo)</label>
                <input 
                  type="text" 
                  value={editingDevice.asset_id} 
                  disabled 
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Apelido (Nome Customizado)</label>
                <input 
                  type="text" 
                  value={editFormData.custom_name}
                  onChange={e => setEditFormData({...editFormData, custom_name: e.target.value})}
                  placeholder="Ex: PC Recepção"
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Setor</label>
                <input 
                  type="text" 
                  value={editFormData.sector}
                  onChange={e => setEditFormData({...editFormData, sector: e.target.value})}
                  placeholder="Ex: Administrativo, Operacional..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setEditingDevice(null)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveEdit}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-md"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
