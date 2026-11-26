import { useEffect, useState, useMemo } from 'react';
import { supabase, supabaseAnon } from '../lib/supabaseClient';
import { Activity, Server, Cpu, HardDrive, Clock, Edit2, X, Search, Filter, Trash2, Download, Copy, Check, Terminal, Shield, Sparkles, RefreshCw } from 'lucide-react';

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

interface MonitoringViewProps {
  units?: any[];
  assets?: any[];
  onUpdateAsset?: (updatedAsset: any) => void;
}

export default function MonitoringView({ units = [], assets = [], onUpdateAsset }: MonitoringViewProps) {
  const [devices, setDevices] = useState<DeviceHealth[]>(() => {
    try {
      const cached = localStorage.getItem('ativos_cached_devices_health');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => devices.length === 0);
  const [editingDevice, setEditingDevice] = useState<DeviceHealth | null>(null);
  const [editFormData, setEditFormData] = useState({ custom_name: '', sector: '', unit_id: '' });
  const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem('noc_search') || '');
  const [filterUnit, setFilterUnit] = useState(() => localStorage.getItem('noc_unit') || '');
  const [filterIsServer, setFilterIsServer] = useState(() => localStorage.getItem('noc_isServer') === 'true');
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [selectedInstallUnit, setSelectedInstallUnit] = useState<string>('');
  const [installTab, setInstallTab] = useState<'powershell' | 'download' | 'nodejs'>('powershell');
  const [copiedCommand, setCopiedCommand] = useState(false);

  useEffect(() => {
    if (!selectedInstallUnit && units && units.length > 0) {
      setSelectedInstallUnit(units[0].name || units[0].id);
    }
  }, [units, selectedInstallUnit]);

  const effectiveUnit = selectedInstallUnit || (units[0]?.name || 'Central');
  const safeUnit = effectiveUnit.replace(/'/g, "''");

  const powerShellCommand = `[Net.ServicePointManager]::SecurityProtocol = 3072; $env:TARGET_UNIT='${safeUnit}'; iex (irm 'https://raw.githubusercontent.com/walberwillyam/ativos/main/agent-monitor/instalar_agente_nativo.ps1')`;

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(powerShellCommand);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 3000);
  };

  const handleDownloadBat = () => {
    const batContent = `@echo off
chcp 65001 >nul 2>&1
title Instalador Ativos Apoio - ${effectiveUnit}
color 0A

:: 1. Privilégios de Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Solicitando privilégios de Administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo ==========================================================
echo    INSTALADOR DO AGENTE ATIVOS APOIO - UNIDADE: ${effectiveUnit}
echo ==========================================================
echo Computador: %COMPUTERNAME%
echo.

:: 2. Executa instalação nativa via PowerShell
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = 3072; $env:TARGET_UNIT='${safeUnit}'; iex (irm 'https://raw.githubusercontent.com/walberwillyam/ativos/main/agent-monitor/instalar_agente_nativo.ps1')"

if %errorLevel% neq 0 (
    echo.
    echo [AVISO] Tentando modo de contingencia local...
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar_agente_nativo.ps1" -UnitName "${effectiveUnit}"
)

pause
`;
    const blob = new Blob([batContent], { type: 'application/bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `instalar_robo_${effectiveUnit.replace(/[^a-zA-Z0-9]/g, '_')}.bat`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
      let { data, error } = await supabase
        .from('devices_health')
        .select('*')
        .order('last_ping', { ascending: false })
        .limit(150);

      // Resiliência de leitura: se token autenticado sofrer restrição RLS, faz fallback com supabaseAnon
      if (error || !data || data.length === 0) {
        const { data: anonData, error: anonErr } = await supabaseAnon
          .from('devices_health')
          .select('*')
          .order('last_ping', { ascending: false })
          .limit(150);
        if (anonData && anonData.length > 0) {
          data = anonData;
          error = null;
        }
      }

      if (error) throw error;
      if (data) {
        // Remove duplicatas caso existam no banco devido a um bug antigo do agente
        const uniqueDevices = new Map<string, DeviceHealth>();
        for (const device of data as DeviceHealth[]) {
          if (!uniqueDevices.has(device.asset_id)) {
            uniqueDevices.set(device.asset_id, device);
          } else {
            const existing = uniqueDevices.get(device.asset_id)!;
            if (!existing.custom_name && device.custom_name) {
              uniqueDevices.set(device.asset_id, {
                ...existing,
                custom_name: device.custom_name,
                sector: existing.sector || device.sector,
                unit_id: existing.unit_id || device.unit_id
              });
            }
          }
        }
        const finalDevicesList = Array.from(uniqueDevices.values());
        if (finalDevicesList.length > 0) {
          setDevices(finalDevicesList);
          try {
            localStorage.setItem('ativos_cached_devices_health', JSON.stringify(finalDevicesList));
          } catch (e) {}
        }
      }
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
          if (payload.eventType === 'DELETE') {
            return currentDevices.filter(d => d.id !== payload.old?.id && d.asset_id !== payload.old?.asset_id);
          }

          const newDevice = payload.new as DeviceHealth;
          const index = currentDevices.findIndex(d => d.asset_id === newDevice.asset_id);
          
          if (index > -1) {
            const updated = [...currentDevices];
            updated[index] = {
              ...currentDevices[index],
              ...newDevice,
              custom_name: newDevice.custom_name || currentDevices[index].custom_name,
              sector: newDevice.sector || currentDevices[index].sector,
              unit_id: newDevice.unit_id || currentDevices[index].unit_id
            };
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

  const findTargetAsset = (device: DeviceHealth) => {
    const devId = (device.asset_id || '').trim().toLowerCase();
    if (!devId) return undefined;
    return assets.find(a => {
      const aId = (a.id || '').trim().toLowerCase();
      const aName = (a.name || '').trim().toLowerCase();
      const aSerial = (a.serialNumber || '').trim().toLowerCase();
      const aPatr = (a.patrimonio || '').trim().toLowerCase();
      const aHost = (a.specifications?.hostname || '').trim().toLowerCase();
      const aCompId = (a.specifications?.['ID do Computador'] || '').trim().toLowerCase();
      return aId === devId || aName === devId || aSerial === devId || aPatr === devId || aHost === devId || aCompId === devId;
    });
  };

  const getDeviceDisplayName = (device: DeviceHealth) => {
    const targetAsset = findTargetAsset(device);
    if (targetAsset && targetAsset.name && !targetAsset.name.startsWith('Computador - ')) {
      return targetAsset.name;
    }
    if (device.custom_name && device.custom_name.trim()) {
      return device.custom_name;
    }
    return device.asset_id;
  };

  const getDeviceSector = (device: DeviceHealth) => {
    if (device.sector && device.sector.trim()) return device.sector;
    const targetAsset = findTargetAsset(device);
    if (targetAsset && targetAsset.location && targetAsset.location !== 'Não definida') {
      return targetAsset.location;
    }
    return '';
  };

  const getDeviceUnit = (device: DeviceHealth) => {
    const targetAsset = findTargetAsset(device);
    // Prioridade máxima: unidade definida no cadastro do ativo no inventário
    if (targetAsset && targetAsset.unit && targetAsset.unit !== 'UNKNOWN_UNIT' && targetAsset.unit !== 'Não definida' && targetAsset.unit !== 'test-id') {
      const matchedUnit = units.find(u => u.id === targetAsset.unit || u.name === targetAsset.unit);
      return matchedUnit ? matchedUnit.name : targetAsset.unit;
    }

    // Se a telemetria tiver um unit_id válido (diferente de UNKNOWN_UNIT e test-id)
    if (device.unit_id && device.unit_id !== 'UNKNOWN_UNIT' && device.unit_id !== 'test-id') {
      const foundUnit = units.find(u => u.id === device.unit_id || u.name === device.unit_id);
      if (foundUnit && foundUnit.name) return foundUnit.name;
      return device.unit_id;
    }

    return 'Não definida';
  };

  const isServerDevice = (device: DeviceHealth) => {
    const targetAsset = findTargetAsset(device);
    const displayName = getDeviceDisplayName(device).toLowerCase();
    const customName = (device.custom_name || '').toLowerCase();
    const assetId = (device.asset_id || '').toLowerCase();
    const osInfo = (device.os_info || '').toLowerCase();
    const assetName = (targetAsset?.name || '').toLowerCase();
    const assetCategory = (targetAsset?.category || '').toLowerCase();

    return osInfo.includes('server') ||
      displayName.includes('server') || displayName.includes('servidor') || displayName.includes('srv') ||
      customName.includes('server') || customName.includes('servidor') || customName.includes('srv') ||
      assetName.includes('server') || assetName.includes('servidor') || assetName.includes('srv') ||
      assetCategory.includes('server') || assetCategory.includes('servidor') ||
      assetId.includes('server') || assetId.includes('srv') || assetId.includes('servidor');
  };

  const handleSaveEdit = async () => {
    if (!editingDevice) return;
    try {
      const selectedUnitObj = units.find(u => u.id === editFormData.unit_id || u.name === editFormData.unit_id);
      const finalUnitName = selectedUnitObj?.name || (editFormData.unit_id !== 'UNKNOWN_UNIT' ? editFormData.unit_id : '');

      const deviceUpdates: any = {
        custom_name: editFormData.custom_name,
        sector: editFormData.sector,
      };
      if (finalUnitName && finalUnitName !== 'UNKNOWN_UNIT') {
        deviceUpdates.unit_id = finalUnitName;
      }

      // 1. Tenta atualizar com o cliente padrão (autenticado)
      let updateRes = await supabase
        .from('devices_health')
        .update(deviceUpdates)
        .eq('asset_id', editingDevice.asset_id);

      // 2. Se falhar por RLS ou permissão divergente no token JWT, aplica fallback com supabaseAnon
      if (updateRes.error) {
        console.warn("Aviso ao salvar devices_health com token autenticado, acionando fallback:", updateRes.error);
        updateRes = await supabaseAnon
          .from('devices_health')
          .update(deviceUpdates)
          .eq('asset_id', editingDevice.asset_id);
      }

      if (updateRes.error) {
        throw new Error(updateRes.error.message || "Erro ao atualizar registro na telemetria");
      }

      // Sincroniza o "Nome Legível", "Setor" e "Unidade" com o Inventário
      const assetUpdates: any = {};
      if (editFormData.custom_name) {
        assetUpdates.name = editFormData.custom_name;
      }
      if (editFormData.sector) {
        assetUpdates.location = editFormData.sector;
      }
      if (finalUnitName && finalUnitName !== 'UNKNOWN_UNIT') {
        assetUpdates.unit = finalUnitName;
      }

      const targetAsset = findTargetAsset(editingDevice);
      if (Object.keys(assetUpdates).length > 0) {
        const targetId = targetAsset ? targetAsset.id : editingDevice.asset_id;
        let assetRes = await supabase
          .from('assets')
          .update(assetUpdates)
          .eq('id', targetId);

        if (assetRes.error) {
          assetRes = await supabaseAnon
            .from('assets')
            .update(assetUpdates)
            .eq('id', targetId);
        }

        if (assetRes.error) {
          console.error("Erro ao sincronizar ativo no inventário:", assetRes.error);
        } else if (targetAsset && onUpdateAsset) {
          onUpdateAsset({
            ...targetAsset,
            ...assetUpdates
          });
        }
      }
      
      // Update local state optimisticly (Realtime might also catch it)
      setDevices(prev => prev.map(d => d.asset_id === editingDevice.asset_id ? { 
        ...d, 
        custom_name: editFormData.custom_name, 
        sector: editFormData.sector, 
        unit_id: finalUnitName || d.unit_id 
      } : d));
      setEditingDevice(null);
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      alert(err?.message ? `Falha ao salvar: ${err.message}` : "Falha ao salvar alterações.");
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (!window.confirm("Deseja realmente remover este dispositivo da telemetria? (Isso não desinstala o agente da máquina, apenas apaga o registro atual)")) return;
    try {
      let delRes = await supabase.from('devices_health').delete().eq('id', id);
      if (delRes.error) {
        delRes = await supabaseAnon.from('devices_health').delete().eq('id', id);
      }
      if (delRes.error) throw new Error(delRes.error.message || "Erro ao remover registro");

      setDevices(prev => prev.filter(d => d.id !== id));
      if (editingDevice?.id === id) setEditingDevice(null);
    } catch (err: any) {
      console.error("Erro ao deletar:", err);
      alert(err?.message ? `Falha ao remover dispositivo: ${err.message}` : "Falha ao remover dispositivo.");
    }
  };

  // Lista unificada e completa de todas as unidades / empresas cadastradas no sistema
  const allUnitsList = useMemo(() => {
    const unitNames = new Set<string>();

    // 1. Todas as unidades cadastradas no sistema
    units.forEach(u => {
      if (u && u.name && u.name !== 'UNKNOWN_UNIT' && u.name !== 'test-id' && u.name !== 'Não definida') {
        unitNames.add(u.name);
      }
    });

    // 2. Unidades presentes nos ativos
    assets.forEach(a => {
      if (a && a.unit && a.unit !== 'UNKNOWN_UNIT' && a.unit !== 'test-id' && a.unit !== 'Não definida') {
        unitNames.add(a.unit);
      }
    });

    // 3. Unidades presentes nos dispositivos de telemetria
    devices.forEach(d => {
      const resolved = getDeviceUnit(d);
      if (resolved && resolved !== 'UNKNOWN_UNIT' && resolved !== 'test-id' && resolved !== 'Não definida') {
        unitNames.add(resolved);
      }
    });

    return Array.from(unitNames).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [units, assets, devices]);

  const filteredDevices = devices.filter(device => {
    const targetAsset = findTargetAsset(device);
    
    // Oculta ativos que não devem aparecer no monitoramento
    if (targetAsset && ['Armazenado', 'Extraviado', 'Obsoleto', 'Manutenção'].includes(targetAsset.status)) {
      return false;
    }

    const displayName = getDeviceDisplayName(device);
    const sectorName = getDeviceSector(device);
    const resolvedUnit = getDeviceUnit(device);

    const matchesSearch = searchQuery === '' || 
      device.asset_id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sectorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resolvedUnit.toLowerCase().includes(searchQuery.toLowerCase());
      
    const selectedUnitObj = units.find(u => u.name === filterUnit || u.id === filterUnit);
    const targetUnitName = selectedUnitObj?.name || filterUnit;
    const targetUnitId = selectedUnitObj?.id || filterUnit;

    const matchesUnit = filterUnit === '' || 
      resolvedUnit === targetUnitName || 
      device.unit_id === targetUnitName || 
      device.unit_id === targetUnitId || 
      (targetAsset && (targetAsset.unit === targetUnitName || targetAsset.unit === targetUnitId));
    
    const matchesServer = !filterIsServer || isServerDevice(device);

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
              <Activity size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Telemetria em Tempo Real</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Monitoramento de saúde dos ativos com o agente instalado.</p>
            </div>
          </div>

          <button
            onClick={() => setShowInstallModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer shrink-0"
          >
            <Download size={16} />
            <span>Instalar Robô no Ativo</span>
          </button>
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
                {allUnitsList.map(unitName => (
                  <option key={unitName} value={unitName}>{unitName}</option>
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
            <button
              onClick={() => setShowInstallModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <Download size={14} />
              <span>Instalar Robô no Ativo</span>
            </button>
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
                          {getDeviceDisplayName(device)}
                        </h3>
                        <button 
                          onClick={() => {
                            const resolvedUnit = getDeviceUnit(device);
                            const matchedUnit = units.find(u => u.name === resolvedUnit || u.id === resolvedUnit || (u.id === device.unit_id && device.unit_id !== 'UNKNOWN_UNIT'));

                            setEditingDevice(device);
                            setEditFormData({ 
                              custom_name: getDeviceDisplayName(device) === device.asset_id ? '' : getDeviceDisplayName(device),
                              sector: getDeviceSector(device),
                              unit_id: matchedUnit ? matchedUnit.id : (resolvedUnit !== 'Não definida' && resolvedUnit !== 'UNKNOWN_UNIT' ? resolvedUnit : '')
                            });
                          }}
                          className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1"
                          title="Editar Nome e Setor"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">
                        Unidade: {getDeviceUnit(device)} {getDeviceSector(device) ? `| Setor: ${getDeviceSector(device)}` : ''}
                      </p>
                      {getDeviceDisplayName(device) !== device.asset_id && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Hostname: {device.asset_id}</p>
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
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Unidade Alocada</label>
                <select 
                  value={editFormData.unit_id}
                  onChange={e => setEditFormData(prev => ({ ...prev, unit_id: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:focus:bg-slate-800 outline-none dark:text-white appearance-none"
                >
                  <option value="">Selecione uma Unidade</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                  {/* Keep the current one if not in units list and not unknown */}
                  {!units.find(u => u.id === editFormData.unit_id) && editFormData.unit_id && editFormData.unit_id !== 'UNKNOWN_UNIT' && editFormData.unit_id !== 'test-id' && (
                    <option value={editFormData.unit_id}>{editFormData.unit_id}</option>
                  )}
                </select>
              </div>
            </div>
            <div className="flex gap-2.5 p-5 border-t border-slate-100 dark:border-slate-700">
              <button 
                onClick={() => handleDeleteDevice(editingDevice.id)}
                className="px-3.5 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-900/40 rounded-xl transition-colors"
                title="Excluir Ativo da Telemetria"
              >
                <Trash2 size={18} />
              </button>
              <button 
                onClick={() => setEditingDevice(null)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveEdit}
                className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-sm"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Instalação do Robô nos Ativos */}
      {showInstallModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
            {/* Cabeçalho do Modal */}
            <div className="p-6 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider">
                    Instalação Rápida
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-900 text-[10px] font-black uppercase tracking-wider">
                    Zero Dependências
                  </span>
                </div>
                <h3 className="text-xl font-bold">Instalar Robô nos Ativos</h3>
                <p className="text-indigo-100 text-xs mt-1">
                  Configure o monitoramento automático de hardware, licenças de Windows e saúde do equipamento em segundos.
                </p>
              </div>
              <button 
                onClick={() => setShowInstallModal(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Passo 1: Seleção da Unidade */}
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  1. Selecione a Unidade / Filial onde o computador está localizado:
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <select
                    value={effectiveUnit}
                    onChange={(e) => setSelectedInstallUnit(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {units.map(u => (
                      <option key={u.id} value={u.name || u.id}>{u.name || u.id}</option>
                    ))}
                    {!units.some(u => u.name === 'Rota 365') && <option value="Rota 365">Rota 365</option>}
                  </select>
                  <span className="inline-flex items-center justify-center px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl border border-indigo-200 dark:border-indigo-800">
                    Filial: {effectiveUnit}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  O robô já será vinculado automaticamente a esta unidade, prevenindo qualquer erro de cadastro.
                </p>
              </div>

              {/* Passo 2: Abas de Método de Instalação */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2.5">
                  2. Escolha o método mais prático para você:
                </label>

                <div className="flex border-b border-slate-200 dark:border-slate-700 gap-2 mb-4 overflow-x-auto">
                  <button
                    onClick={() => setInstallTab('powershell')}
                    className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      installTab === 'powershell'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    <Terminal size={15} />
                    Comando 1-Clique (PowerShell)
                  </button>
                  <button
                    onClick={() => setInstallTab('download')}
                    className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      installTab === 'download'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    <Download size={15} />
                    Instalador .BAT (Pendrive)
                  </button>
                  <button
                    onClick={() => setInstallTab('nodejs')}
                    className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      installTab === 'nodejs'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    <Server size={15} />
                    Versão Node.js (Serviço)
                  </button>
                </div>

                {/* Conteúdo Aba 1: PowerShell One-Liner */}
                {installTab === 'powershell' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                      <Sparkles size={16} className="text-emerald-600 shrink-0" />
                      <span><strong>Mais Rápido:</strong> Não precisa de Node.js nem instalação prévia. Funciona direto em qualquer Windows 10 ou 11.</span>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        No computador do cliente, abra o <strong>PowerShell como Administrador</strong> e cole o comando:
                      </p>
                      <div className="relative">
                        <pre className="p-3.5 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all pr-24 border border-slate-700">
                          {powerShellCommand}
                        </pre>
                        <button
                          onClick={handleCopyCommand}
                          className="absolute right-2.5 top-2.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                        >
                          {copiedCommand ? (
                            <>
                              <Check size={14} className="text-emerald-300" />
                              <span>Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <ul className="text-[11px] text-slate-500 dark:text-slate-400 list-disc list-inside space-y-0.5 pt-1">
                      <li>O robô será configurado silenciosamente em <strong>C:\AtivosApoio</strong>.</li>
                      <li>Inicia sozinho com o Windows e transmite a cada 3 minutos em segundo plano.</li>
                      <li>Totalmente invisível: não abre nenhuma janela preta na frente do operador.</li>
                    </ul>
                  </div>
                )}

                {/* Conteúdo Aba 2: Download .BAT para Pendrive */}
                {installTab === 'download' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 rounded-xl text-indigo-900 dark:text-indigo-200 text-xs">
                      Ideal para levar em um pendrive e instalar em múltiplos computadores ou caixas PDVs sem digitar nada.
                    </div>

                    <div className="p-5 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center space-y-3">
                      <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto">
                        <Download size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                          Instalador Pré-Configurado para: <span className="text-indigo-600 dark:text-indigo-400">{effectiveUnit}</span>
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                          Gera um arquivo <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-indigo-600">.bat</code> pronto. É só dar duplo clique no computador do cliente!
                        </p>
                      </div>
                      <button
                        onClick={handleDownloadBat}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
                      >
                        <Download size={16} />
                        <span>Baixar Instalador_{effectiveUnit.replace(/\s+/g, '_')}.bat</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      💡 <strong>Como usar:</strong> Copie o arquivo baixado para o computador e clique com o botão direito nele &rarr; <em>"Executar como Administrador"</em>.
                    </p>
                  </div>
                )}

                {/* Conteúdo Aba 3: Node.js */}
                {installTab === 'nodejs' && (
                  <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                    <p>
                      Se você já tem a pasta <strong>agent-monitor/</strong> e prefere rodar o agente em Node.js com o serviço do Windows:
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 font-medium">
                      <li>Abra a pasta <code className="font-mono text-indigo-600">agent-monitor/</code> no computador.</li>
                      <li>Dê dois cliques no arquivo <code className="font-mono text-indigo-600 font-bold">instalar_robo.bat</code>.</li>
                      <li>O instalador atualizado exibirá um menu numérico para você escolher a filial (ex: 1 para Rota 365).</li>
                      <li>Caso a máquina não tenha Node.js, ele oferece instalação automática ou redireciona para o agente nativo.</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setShowInstallModal(false)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
