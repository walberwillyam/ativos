/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Edit, 
  RefreshCw, 
  Wrench, 
  Printer, 
  Share2, 
  History, 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  ShieldCheck,
  Calendar,
  DollarSign,
  Briefcase,
  X,
  FileCheck2,
  Camera,
  Cpu,
  Activity,
  HardDrive,
  Clock,
  Scan,
  CheckCircle
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Asset, AssetStatus, Category, TimelineStep } from '../types';
import { supabase } from '../lib/supabaseClient';

interface AssetDetailViewProps {
  asset: Asset;
  onGoBack: () => void;
  onUpdateAsset: (updatedAsset: Asset) => void;
  onAddActivity: (activity: {
    type: string;
    title: string;
    details: string;
    by: string;
    icon: string;
    badgeColor: string;
  }) => void;
  units?: any[];
  categories?: Category[];
}

export default function AssetDetailView({ asset, onGoBack, onUpdateAsset, onAddActivity, units = [], categories = [] }: AssetDetailViewProps) {
  // Tabs active state
  const [activeTab, setActiveTab] = useState<'timeline' | 'audit' | 'docs' | 'photos'>('timeline');

  // Popup forms controls
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPrintBadgeOpen, setIsPrintBadgeOpen] = useState(false);
  const [isScanningPatrimonio, setIsScanningPatrimonio] = useState(false);

  // States for interactive inputs
  const [transferTargetUnit, setTransferTargetUnit] = useState('CD Logístico');
  const [transferTargetLoc, setTransferTargetLoc] = useState('Estoque Doca Sul');
  const [transferReason, setTransferReason] = useState('');

  const [maintenanceType, setMaintenanceType] = useState('Corretiva');
  const [maintenanceService, setMaintenanceService] = useState('Calibração de sensores e reajuste térmico');
  const [maintenanceTechnicalName, setMaintenanceTechnicalName] = useState('Laboratório Autorizado TI');

  // Telemetry state
  const [telemetry, setTelemetry] = useState<any>(null);

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

  useEffect(() => {
    const fetchTelemetry = async () => {
      const { data } = await supabase
        .from('devices_health')
        .select('*')
        .eq('asset_id', asset.id)
        .order('last_ping', { ascending: false })
        .limit(1)
        .single();
      
      if (data) {
        setTelemetry(data);
      }
    };
    fetchTelemetry();
  }, [asset.id]);

  useEffect(() => {
    if (!isScanningPatrimonio) return;

    let html5QrCode: Html5Qrcode | null = null;
    let isComponentMounted = true;
    let isStarting = false;

    function onScanSuccess(decodedText: string) {
      if (!isComponentMounted || !html5QrCode) return;
      
      setEditForm(prev => ({ ...prev, patrimonio: decodedText }));
      
      if (html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
          setIsScanningPatrimonio(false);
        }).catch(err => console.log("Stop error", err));
      } else {
        setIsScanningPatrimonio(false);
      }
    }

    function onScanFailure() {}

    async function initScanner() {
      if (!isComponentMounted) return;
      isStarting = true;
      try {
        html5QrCode = new Html5Qrcode("patrimonio-reader");
        await html5QrCode.start(
          { facingMode: "environment" },
          { 
            fps: 10, 
            qrbox: { width: 250, height: 100 },
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A
            ]
          },
          onScanSuccess,
          onScanFailure
        );
      } catch (err) {
        console.error("Camera start failed", err);
      } finally {
        isStarting = false;
        if (!isComponentMounted && html5QrCode) {
          if (html5QrCode.isScanning) {
            html5QrCode.stop().then(() => html5QrCode?.clear()).catch(console.error);
          } else {
            try { html5QrCode.clear(); } catch(e){}
          }
        }
      }
    }

    initScanner();

    return () => {
      isComponentMounted = false;
      if (html5QrCode && !isStarting) {
        if (html5QrCode.isScanning) {
          html5QrCode.stop().then(() => {
            html5QrCode?.clear();
          }).catch(console.error);
        } else {
          try { html5QrCode.clear(); } catch(e){}
        }
      }
    };
  }, [isScanningPatrimonio]);

  // Edit asset states
  const [editForm, setEditForm] = useState({
    name: asset.name,
    patrimonio: asset.patrimonio || '',
    category: asset.category,
    model: asset.model,
    serialNumber: asset.serialNumber || '',
    unit: asset.unit,
    currentFloor: asset.currentFloor || 'office',
    location: asset.location,
    responsibleName: asset.responsible.name,
    status: asset.status,
    value: asset.value,
    acquisitionDate: asset.acquisitionDate,
    warrantyExpiry: asset.warrantyExpiry,
    processor: asset.specifications["Processador"] || asset.specifications["cpu"] || '',
    ram: (typeof asset.specifications["ram"] === 'string' && asset.specifications["ram"].length > 10) ? formatBytes(parseInt(asset.specifications["ram"])) : (asset.specifications["Memória RAM"] || asset.specifications["ram"] || ''),
    storage: (typeof asset.specifications["disk"] === 'string' && asset.specifications["disk"].length > 10) ? formatBytes(parseInt(asset.specifications["disk"])) : (asset.specifications["Armazenamento"] || asset.specifications["disk"] || '')
  });

  useEffect(() => {
    if (isEditOpen) {
      setEditForm({
        name: asset.name,
        patrimonio: asset.patrimonio || '',
        category: asset.category,
        model: asset.model,
        serialNumber: asset.serialNumber || '',
        unit: asset.unit,
        currentFloor: asset.currentFloor || 'office',
        location: asset.location,
        responsibleName: asset.responsible.name,
        status: asset.status,
        value: asset.value,
        acquisitionDate: asset.acquisitionDate,
        warrantyExpiry: asset.warrantyExpiry,
        processor: asset.specifications["Processador"] || asset.specifications["cpu"] || '',
        ram: (typeof asset.specifications["ram"] === 'string' && asset.specifications["ram"].length > 10) ? formatBytes(parseInt(asset.specifications["ram"])) : (asset.specifications["Memória RAM"] || asset.specifications["ram"] || ''),
        storage: (typeof asset.specifications["disk"] === 'string' && asset.specifications["disk"].length > 10) ? formatBytes(parseInt(asset.specifications["disk"])) : (asset.specifications["Armazenamento"] || asset.specifications["disk"] || '')
      });
    }
  }, [isEditOpen, asset]);

  // Execute actual asset state modification trigger and append history logs
  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const transferStep: TimelineStep = {
      id: `step-trans-${Date.now()}`,
      title: `Transferido para ${transferTargetUnit}`,
      responsible: "Admin Geral",
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      type: "transfer",
      description: `Dispositivo movimentado. Destino específico: ${transferTargetLoc}. Justificativa: ${transferReason || 'Remanejamento padrão de ativos de TI'}.`
    };

    const updatedAsset: Asset = {
      ...asset,
      unit: transferTargetUnit,
      location: transferTargetLoc,
      history: [transferStep, ...asset.history]
    };

    onUpdateAsset(updatedAsset);
    setIsTransferOpen(false);

    onAddActivity({
      type: "transfer",
      title: "Ativo Movimentado",
      details: `${asset.name} transferido para polo ${transferTargetUnit}.`,
      by: "Admin Geral",
      icon: "sync_alt",
      badgeColor: "bg-emerald-500"
    });

    alert(`Sucesso! Localização do ativo atualizada para ${transferTargetUnit}. Log de movimentação anexado!`);
  };

  const handleMaintenanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const maintenanceStep: TimelineStep = {
      id: `step-maint-${Date.now()}`,
      title: `Manutenção ${maintenanceType} Registrada`,
      responsible: maintenanceTechnicalName || "Equipe Terceirizada TI",
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      type: "maintenance",
      description: `Iniciado protocolo de verificação física. Serviço em andamento: ${maintenanceService}.`,
      attachmentName: `Relatorio_OS_${Math.floor(100 + Math.random() * 900)}.pdf`
    };

    const updatedAsset: Asset = {
      ...asset,
      status: "Manutenção",
      history: [maintenanceStep, ...asset.history]
    };

    onUpdateAsset(updatedAsset);
    setIsMaintenanceOpen(false);

    onAddActivity({
      type: "maintenance",
      title: "Manutenção Solicitada",
      details: `${asset.name} (#${asset.id}) colocado em manutenção corretiva.`,
      by: "Admin Geral",
      icon: "build",
      badgeColor: "bg-amber-500"
    });

    alert(`Ativo colocado sob manutenção com sucesso! Status redefinido e ordem de serviço registrada.`);
  };

  const handleFinishMaintenance = () => {
    const maintenanceStep: TimelineStep = {
      id: `step-maint-finish-${Date.now()}`,
      title: `Manutenção Finalizada`,
      responsible: "Técnico de Manutenção",
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      type: "creation",
      description: `Equipamento reparado e liberado para uso.`,
    };

    const updatedAsset: Asset = {
      ...asset,
      status: "Em Uso",
      history: [maintenanceStep, ...asset.history]
    };

    onUpdateAsset(updatedAsset);

    onAddActivity({
      type: "maintenance",
      title: "Manutenção Concluída",
      details: `${asset.name} (#${asset.id}) retornou para Em Uso.`,
      by: "Admin Geral",
      icon: "check_circle",
      badgeColor: "bg-emerald-500"
    });

    alert(`Ativo liberado da manutenção com sucesso! Status redefinido para Em Uso.`);
  };

  const handleEditAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Remove old english keys to normalize the DB data
    const cleanedSpecs = { ...asset.specifications };
    delete cleanedSpecs["cpu"];
    delete cleanedSpecs["ram"];
    delete cleanedSpecs["disk"];

    const updatedAsset: Asset = {
      ...asset,
      name: editForm.name,
      patrimonio: editForm.patrimonio,
      category: editForm.category,
      model: editForm.model,
      serialNumber: editForm.serialNumber,
      unit: editForm.unit,
      currentFloor: editForm.currentFloor,
      location: editForm.location,
      status: editForm.status as AssetStatus,
      value: editForm.value,
      acquisitionDate: editForm.acquisitionDate,
      warrantyExpiry: editForm.warrantyExpiry,
      responsible: {
        ...asset.responsible,
        name: editForm.responsibleName,
        initials: editForm.responsibleName.substring(0, 2).toUpperCase()
      },
      specifications: {
        ...cleanedSpecs,
        ...(editForm.processor ? { "Processador": editForm.processor } : {}),
        ...(editForm.ram ? { "Memória RAM": editForm.ram } : {}),
        ...(editForm.storage ? { "Armazenamento": editForm.storage } : {})
      }
    };

    onUpdateAsset(updatedAsset);
    setIsEditOpen(false);

    onAddActivity({
      type: "maintenance",
      title: "Ativo Editado",
      details: `Ficha técnica de ${asset.name} (#${asset.id}) foi atualizada.`,
      by: editForm.responsibleName,
      icon: "build",
      badgeColor: "bg-indigo-500"
    });

    alert(`Dados técnicos da ficha patrimonial do ativo atualizados com sucesso!`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'docs' | 'photos') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const fileName = `${asset.id}/${type}/${Date.now()}_${file.name.replace(/\\s+/g, '_')}`;
        // Using a generic bucket name 'ativos_arquivos', make sure to create it in Supabase
        const { data, error } = await supabase.storage.from('ativos_arquivos').upload(fileName, file);
        if (error) {
          console.error("Supabase Error:", error);
          alert("Erro ao enviar. Verifique se o bucket 'ativos_arquivos' está criado e público no Supabase Storage.");
          return;
        }
        
        const { data: urlData } = supabase.storage.from('ativos_arquivos').getPublicUrl(fileName);
        
        // Save references in specifications to avoid schema errors if columns don't exist
        const currentDocs = asset.specifications.documents ? JSON.parse(asset.specifications.documents) : [];
        const currentPhotos = asset.specifications.photos ? JSON.parse(asset.specifications.photos) : [];

        if (type === 'docs') {
          currentDocs.push({
            name: file.name,
            size: formatBytes(file.size),
            date: new Date().toLocaleDateString('pt-BR'),
            url: urlData.publicUrl
          });
        } else {
          currentPhotos.push(urlData.publicUrl);
        }

        const newStep: TimelineStep = {
          id: `step-${type}-${Date.now()}`,
          title: type === 'docs' ? 'Documento Anexado' : 'Foto Anexada',
          responsible: 'Usuário do Sistema',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().slice(0, 5),
          type: 'creation',
          description: `Arquivo ${file.name} foi enviado com sucesso.`,
          attachmentName: type === 'docs' ? file.name : undefined
        };

        const updatedAsset: Asset = {
          ...asset,
          specifications: {
            ...asset.specifications,
            documents: JSON.stringify(currentDocs),
            photos: JSON.stringify(currentPhotos)
          },
          history: [newStep, ...asset.history]
        };

        onUpdateAsset(updatedAsset);
        alert(`${type === 'docs' ? 'Documento' : 'Foto'} enviado com sucesso!`);
      } catch (err) {
        console.error(err);
        alert("Ocorreu um erro ao processar o arquivo.");
      }
    }
  };

  const handleMainPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const fileName = `${asset.id}/cover/${Date.now()}_${file.name.replace(/\\s+/g, '_')}`;
        const { data, error } = await supabase.storage.from('ativos_arquivos').upload(fileName, file);
        if (error) {
          console.error("Supabase Error:", error);
          alert("Erro ao enviar. Verifique se o bucket 'ativos_arquivos' está criado e público.");
          return;
        }
        const { data: urlData } = supabase.storage.from('ativos_arquivos').getPublicUrl(fileName);
        
        onUpdateAsset({
          ...asset,
          imageUrl: urlData.publicUrl
        });
        alert("Foto de capa atualizada!");
      } catch (err) {
        console.error(err);
        alert("Ocorreu um erro ao processar a imagem.");
      }
    }
  };

  return (
    <div id="asset-detail-sheet" className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Breadcrumbs trace navigation and actionable links */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <nav className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 select-none">
            <button onClick={onGoBack} className="hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1">
              <ArrowLeft size={12} />
              Inventário
            </button>
            <span className="text-slate-300 dark:text-slate-600 dark:text-slate-300">/</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">Ficha de Ativo</span>
          </nav>
          <h2 className="text-3xl font-black mt-1 text-slate-900 dark:text-white tracking-tight">Ficha do Ativo</h2>
        </div>

        {/* Action Controls matching high-fidelity images */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto select-none">
          <button 
            id="detail-action-edit"
            onClick={() => setIsEditOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 shadow-xs focus:outline-none"
          >
            <Edit size={14} className="text-indigo-600 dark:text-indigo-400" />
            Editar Ativo
          </button>
          
          <button 
            id="detail-action-transfer"
            onClick={() => setIsTransferOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 shadow-xs focus:outline-none"
          >
            <RefreshCw size={14} className="text-emerald-500 animate-spin" style={{ animationDuration: '10s' }} />
            Mover/Transferir
          </button>

          {asset.status === 'Manutenção' ? (
            <button 
              id="detail-action-finish-maintenance"
              onClick={handleFinishMaintenance}
              className="flex items-center gap-2 px-3.5 py-2.5 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-800 transition-colors rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 shadow-xs focus:outline-none"
            >
              <CheckCircle size={14} className="text-emerald-500" />
              Finalizar Manutenção
            </button>
          ) : (
            <button 
              id="detail-action-maintenance"
              onClick={() => setIsMaintenanceOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 shadow-xs focus:outline-none"
            >
              <Wrench size={14} className="text-amber-500" />
              Registrar Manutenção
            </button>
          )}

          <button 
            id="detail-action-print"
            onClick={() => setIsPrintBadgeOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-black dark:hover:bg-slate-700 select-none shadow duration-150 active:scale-95"
          >
            <Printer size={14} />
            Imprimir Etiqueta (QR-Patrimônio)
          </button>
        </div>
      </section>

      {/* Main Two-Column Layout View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Core ID and technical characteristics */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            {/* Visual preview hero with live state tag */}
            <div className="relative h-60 w-full overflow-hidden select-none bg-slate-800">
              <img 
                src={asset.imageUrl || "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=800"} 
                alt={asset.name} 
                className="w-full h-full object-cover opacity-90 hover:scale-105 duration-700" 
              />
              <div className="absolute top-4 left-4 z-10">
                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider text-white shadow flex items-center gap-1.5 ${
                  asset.status === 'Em Uso' ? 'bg-emerald-600' :
                  asset.status === 'Manutenção' ? 'bg-amber-500' : 'bg-slate-50 dark:bg-slate-8000 text-slate-800'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-900 animate-pulse" />
                  {asset.status}
                </span>
              </div>
              <label className="absolute bottom-4 right-4 bg-black/40 hover:bg-black/60 backdrop-blur text-white p-2.5 rounded-full cursor-pointer transition shadow-sm z-10">
                <Camera size={20} />
                <input type="file" accept="image/*" className="hidden" onChange={handleMainPhotoUpload} />
              </label>
            </div>

            {/* Asset specifications metadata */}
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{asset.name}</h3>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 flex items-center gap-2">
                    Patrimônio: <span className="text-slate-600 dark:text-slate-300 font-mono tracking-tight">{asset.patrimonio}</span>
                  </p>
                </div>
                <button className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition" aria-label="Share">
                  <Share2 size={18} />
                </button>
              </div>

              {/* ID Data Table Grid layout */}
              <div className="grid grid-cols-2 gap-y-5 gap-x-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-[10px] uppercase font-extrabold text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-0.5 tracking-wide">Categoria de Inventário</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{asset.category}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-extrabold text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-0.5 tracking-wide">Polo Físico Atual</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    {asset.unit}
                  </p>
                </div>
              </div>

              {/* Technical Specifications specs lists */}
              <div className="mt-5 space-y-3">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Especificações de Hardware</h4>
                {telemetry ? (
                  <div className="space-y-4 max-h-56 overflow-y-auto pr-1">
                    <div>
                      <div className="flex justify-between text-xs mb-1 font-bold">
                        <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1"><Cpu size={12}/> CPU Usage</span>
                        <span className="text-slate-800 dark:text-slate-100">{telemetry.cpu_usage.toFixed(2)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${telemetry.cpu_usage}%` }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs mb-1 font-bold">
                        <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1"><Activity size={12}/> RAM Usage</span>
                        <span className="text-slate-800 dark:text-slate-100">{formatBytes(telemetry.ram_used)} / {formatBytes(telemetry.ram_total)}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div className="bg-rose-500 h-2 rounded-full" style={{ width: `${(telemetry.ram_used / telemetry.ram_total) * 100}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1 font-bold">
                        <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1"><HardDrive size={12}/> Disk Primary</span>
                        <span className="text-slate-800 dark:text-slate-100">{formatBytes(telemetry.disk_used)} / {formatBytes(telemetry.disk_total)}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div className="bg-indigo-400 h-2 rounded-full" style={{ width: `${(telemetry.disk_used / telemetry.disk_total) * 100}%` }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs mb-1 font-bold">
                        <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1"><Clock size={12}/> Uptime</span>
                        <span className="text-slate-800 dark:text-slate-100">{formatUptime(telemetry.uptime_seconds)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {Object.entries(asset.specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between border-b border-slate-100/60 pb-1.5 text-xs text-slate-700 dark:text-slate-300">
                        <span className="text-slate-400 dark:text-slate-500 font-medium select-none">{key}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dados de Compra and Garantia side cards */}
          <div className="grid grid-cols-2 gap-4 select-none">
            {/* Purchase breakdown card */}
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-5 rounded-2xl flex flex-col justify-between shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={16} className="text-indigo-700" />
                <h4 className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Fatura de Compra</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 leading-none mb-0.5">Aquisição</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{new Date(asset.acquisitionDate).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 leading-none mb-0.5">Valor Unitário</p>
                  <p className="text-sm font-mono font-black text-indigo-700">
                    R$ {asset.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Warranty tracking card */}
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-5 rounded-2xl flex flex-col justify-between shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={16} className="text-teal-600" />
                <h4 className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Garantia Legal</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 leading-none mb-0.5">Status de Cobertura</p>
                  <p className="text-sm font-bold text-emerald-600">Ativa em Contrato</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 leading-none mb-0.5">Expiração Técnica</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{new Date(asset.warrantyExpiry).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Timeline tabs logs */}
        <div className="col-span-12 lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl flex flex-col min-h-[500px] shadow-sm">
          {/* Timeline Tab buttons matching mockup exactly */}
          <div className="flex border-b border-slate-200 px-6 pt-2 select-none bg-slate-50 dark:bg-slate-800 rounded-t-3xl">
            <button 
              id="detail-tab-trigger-timeline"
              onClick={() => setActiveTab('timeline')}
              className={`px-4 py-4 text-xs font-bold flex items-center gap-2 leading-none transition-colors border-b-2 ${
                activeTab === 'timeline' 
                  ? 'border-indigo-700 text-indigo-700 font-extrabold' 
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:text-slate-200'
              }`}
            >
              <History size={16} />
              Histórico de Movimentação
            </button>
            <button 
              id="detail-tab-trigger-audit"
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-4 text-xs font-bold flex items-center gap-2 leading-none transition-colors border-b-2 ${
                activeTab === 'audit' 
                  ? 'border-indigo-700 text-indigo-700 font-extrabold' 
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:text-slate-200'
              }`}
            >
              <ShieldCheck size={16} />
              Auditoria / SLA
            </button>
            <button 
              id="detail-tab-trigger-docs"
              onClick={() => setActiveTab('docs')}
              className={`px-4 py-4 text-xs font-bold flex items-center gap-2 leading-none transition-colors border-b-2 ${
                activeTab === 'docs' 
                  ? 'border-indigo-700 text-indigo-700 font-extrabold' 
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:text-slate-200'
              }`}
            >
              <FileText size={16} />
              Documentos Anexados
            </button>
            <button 
              id="detail-tab-trigger-photos"
              onClick={() => setActiveTab('photos')}
              className={`px-4 py-4 text-xs font-bold flex items-center gap-2 leading-none transition-colors border-b-2 ${
                activeTab === 'photos' 
                  ? 'border-indigo-700 text-indigo-700 font-extrabold' 
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:text-slate-200'
              }`}
            >
              <Camera size={16} />
              Galeria Fotos
            </button>
          </div>

          {/* Interactive tab output container */}
          <div className="flex-1 p-6">
            {activeTab === 'timeline' && (
              <div className="relative pl-8 space-y-6">
                {/* Thin vertical grid separation line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-100" />

                {/* Timeline loops */}
                {asset.history.map((step) => (
                  <div key={step.id} className="relative select-none">
                    {/* Circle marker styled depending on event node type */}
                    <div className={`absolute -left-[31px] top-1 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center shadow-xs ${
                      step.type === 'transfer' ? 'bg-indigo-600' :
                      step.type === 'maintenance' ? 'bg-amber-400' : 'bg-slate-400'
                    }`} />
                    
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{step.title}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Responsável técnico: {step.responsible}</p>
                        <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 border border-slate-100 px-3 py-1.5 rounded-xl inline-block mt-2 font-medium">
                          {step.description}
                        </p>
                        
                        {step.attachmentName && (
                          <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-bold mt-2 hover:underline cursor-pointer">
                            <FileText size={12} />
                            <span>{step.attachmentName}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{new Date(step.date).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">{step.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="space-y-4 select-none">
                <div className="flex items-center gap-2 text-slate-500 font-bold text-xs mb-3">
                  <FileCheck2 size={14} />
                  <span>Nenhum dado de auditoria disponível no momento.</span>
                </div>
              </div>
            )}

            {activeTab === 'docs' && (() => {
              const docsList = asset.specifications.documents ? JSON.parse(asset.specifications.documents) : [];
              return (
                <div className="space-y-4 select-none">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Arquivos Anexados</span>
                    <label className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-indigo-100 transition">
                      + Anexar Documento
                      <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'docs')} />
                    </label>
                  </div>
                  {docsList.length === 0 ? (
                    <div className="flex items-center gap-2 text-slate-500 font-bold text-xs py-4">
                      <span>Nenhum documento anexado a este ativo.</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {docsList.map((doc: any, i: number) => (
                        <a 
                          key={i} 
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex justify-between items-center p-3 border border-slate-100 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition block"
                        >
                          <div className="flex items-center gap-2.5">
                            <FileText size={18} className="text-indigo-600" />
                            <div>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{doc.name}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{doc.size} • Data: {doc.date}</p>
                            </div>
                          </div>
                          <ChevronRight size={14} className="text-slate-400 dark:text-slate-500" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {activeTab === 'photos' && (() => {
              const photosList = asset.specifications.photos ? JSON.parse(asset.specifications.photos) : [];
              return (
                <div className="space-y-4 select-none">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Galeria de Imagens</span>
                    <label className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-indigo-100 transition">
                      + Adicionar Foto
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'photos')} />
                    </label>
                  </div>
                  {photosList.length === 0 ? (
                    <div className="flex items-center gap-2 text-slate-500 font-bold text-xs py-4">
                      <span>Nenhuma foto na galeria.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {photosList.map((photo: string, i: number) => (
                        <a 
                          key={i} 
                          href={photo}
                          target="_blank"
                          rel="noreferrer"
                          className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200 dark:border-slate-700 group cursor-zoom-in block"
                        >
                          <img src={photo} alt="Foto técnica do Ativo" className="w-full h-full object-cover group-hover:scale-110 duration-200" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Footer Timeline indicator count */}
          <div className="p-5 border-t border-slate-150 bg-slate-50 dark:bg-slate-800 flex justify-between items-center rounded-b-3xl text-xs text-slate-400 dark:text-slate-500 select-none">
            <span>Constam {asset.history.length} ocorrências e auditorias registradas no prontuário físico.</span>
            <div className="flex gap-1.5">
              <button className="p-1 border border-slate-200 rounded-lg hover:bg-slate-200 transition bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 dark:text-slate-500">
                <ChevronLeft size={14} />
              </button>
              <button className="p-1 border border-slate-200 rounded-lg hover:bg-slate-200 transition bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 dark:text-slate-500 animate-pulse">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pop up form transfer unit */}
      {isTransferOpen && (
        <div id="transfer-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <form onSubmit={handleTransferSubmit} className="bg-white dark:bg-slate-900 p-6 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 animate-slide-up">
            <h3 className="text-lg font-bold text-slate-950 flex items-center gap-2 mb-1.5">
              <RefreshCw className="text-indigo-600" size={18} />
              Mover / Transferir Ativo Físico
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Registre a alteração geográfica física deste ativo para outro polo regional.</p>

            <div className="my-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Unidade Polo Destino</label>
                <select 
                  id="transfer-unit-select-input"
                  value={transferTargetUnit}
                  onChange={(e) => setTransferTargetUnit(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm outline-none cursor-pointer"
                >
                  <option>Matriz - São Paulo</option>
                  <option>Filial - Rio de Janeiro</option>
                  <option>CD Logístico</option>
                  <option>Depósito - Paraná</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Localização Específica (Setor, Sala, Mesa)</label>
                <input 
                  type="text" 
                  id="transfer-loc-input"
                  value={transferTargetLoc}
                  onChange={(e) => setTransferTargetLoc(e.target.value)}
                  placeholder="Ex: CPD B - Rack C10"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Motivo / Justificativa</label>
                <textarea 
                  id="transfer-reason-input"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Ex: Substituição preventiva ou expansão de banda de rede no polo Sul."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shrink-0 text-sm focus:ring-2 h-20"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button 
                type="button" 
                onClick={() => setIsTransferOpen(false)}
                className="w-1/2 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                id="transfer-confirm-btn-submit"
                className="w-1/2 py-2.5 bg-indigo-700 text-white rounded-xl text-sm font-bold hover:bg-indigo-800 shadow"
              >
                Confirmar Transferência
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pop up technical maintenance request form */}
      {isMaintenanceOpen && (
        <div id="maintenance-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 border border-slate-250">
          <form onSubmit={handleMaintenanceSubmit} className="bg-white dark:bg-slate-900 p-6 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 animate-slide-up">
            <h3 className="text-lg font-bold text-slate-950 flex items-center gap-2 mb-1.5">
              <Wrench className="text-indigo-600" size={18} />
              Solicitar Correção / Manutenção
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Coloque o equipamento sob manutenção corretiva ou preventiva oficial.</p>

            <div className="my-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Tipo de Manutenção</label>
                <select 
                  id="maint-type-select"
                  value={maintenanceType}
                  onChange={(e) => setMaintenanceType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm outline-none cursor-pointer"
                >
                  <option>Corretiva</option>
                  <option>Preventiva</option>
                  <option>Auditoria Legal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Serviço Solicitado / Descrição Técinica</label>
                <input 
                  type="text" 
                  id="maint-service-input"
                  value={maintenanceService}
                  onChange={(e) => setMaintenanceService(e.target.value)}
                  placeholder="Ex: Troca preventiva de cooler ou reinstalação de SO"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Aos Cuidados Técnicos de (Parceiro/Pessoa)</label>
                <input 
                  type="text" 
                  id="maint-tech-input"
                  value={maintenanceTechnicalName}
                  onChange={(e) => setMaintenanceTechnicalName(e.target.value)}
                  placeholder="Ex: Laboratório ou Suporte Autorizado Dell"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button 
                type="button" 
                onClick={() => setIsMaintenanceOpen(false)}
                className="w-1/2 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                id="maint-confirm-btn-submit"
                className="w-1/2 py-2.5 bg-indigo-700 text-white rounded-xl text-sm font-bold hover:bg-indigo-800 shadow"
              >
                Registrar Manutenção
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pop up form edit asset */}
      {isEditOpen && (
        <div id="edit-asset-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <form onSubmit={handleEditAssetSubmit} className="bg-white dark:bg-slate-900 p-6 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 animate-slide-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Editar Detalhes Técnicos</h3>
              <button type="button" onClick={() => setIsEditOpen(false)} className="p-1 hover:bg-slate-100 rounded-full"><X size={16} /></button>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Nome Descritivo do Ativo *</label>
                <input 
                  type="text" 
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Número de Patrimônio (Opcional)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={editForm.patrimonio}
                      onChange={(e) => setEditForm(prev => ({ ...prev, patrimonio: e.target.value }))}
                      className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none"
                    />
                    <button 
                      type="button"
                      onClick={() => setIsScanningPatrimonio(true)}
                      className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-2 rounded-xl border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 transition"
                      title="Escanear Código de Barras/QR"
                    >
                      <Scan size={20} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Categoria de Inventário *</label>
                  <select 
                    value={editForm.category}
                    onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                  >
                    {categories.length > 0 ? (
                      categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                    ) : (
                      <>
                        <option>Notebooks</option>
                        <option>Monitores</option>
                        <option>Impressoras</option>
                        <option>Switches</option>
                        <option>Hardware de Rede</option>
                        <option>Mobiliário</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Marca / Modelo Completo *</label>
                  <input 
                    type="text" 
                    value={editForm.model}
                    onChange={(e) => setEditForm(prev => ({ ...prev, model: e.target.value }))}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Número de Série (Serial) *</label>
                  <input 
                    type="text" 
                    value={editForm.serialNumber}
                    onChange={(e) => setEditForm(prev => ({ ...prev, serialNumber: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Unidade Polo Inicial *</label>
                  <select 
                    value={editForm.unit}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      const matchedUnit = units.find(u => u.name === selectedName);
                      const matchedParts = matchedUnit?.partitions || [
                        { id: 'office', label: 'Escritório' },
                        { id: 'cpd', label: 'CPD / Datacenter' },
                        { id: 'pista', label: 'Pista Operacional' },
                        { id: 'loja', label: 'Loja / Estoque' }
                      ];
                      setEditForm(prev => ({ 
                        ...prev, 
                        unit: selectedName, 
                        currentFloor: matchedParts[0]?.id || 'office' 
                      }));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Partição / Setor Inicial *</label>
                  <select 
                    value={editForm.currentFloor}
                    onChange={(e) => setEditForm(prev => ({ ...prev, currentFloor: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                  >
                    {(units.find(u => u.name === editForm.unit)?.partitions || [
                      { id: 'office', label: 'Escritório' },
                      { id: 'cpd', label: 'CPD / Datacenter' },
                      { id: 'pista', label: 'Pista Operacional' },
                      { id: 'loja', label: 'Loja / Estoque' }
                    ]).map((p: any) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Localização de Detalhe *</label>
                  <input 
                    type="text" 
                    value={editForm.location}
                    onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Responsável Nome *</label>
                  <input 
                    type="text" 
                    value={editForm.responsibleName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, responsibleName: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Estado Operacional Inicial *</label>
                  <select 
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                  >
                    <option>Em Uso</option>
                    <option>Manutenção</option>
                    <option>Armazenado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Valor Compra R$</label>
                  <input 
                    type="number" 
                    value={editForm.value}
                    onChange={(e) => setEditForm(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Adquirido Em</label>
                  <input 
                    type="date" 
                    value={editForm.acquisitionDate}
                    onChange={(e) => setEditForm(prev => ({ ...prev, acquisitionDate: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Garantia Até</label>
                  <input 
                    type="date" 
                    value={editForm.warrantyExpiry}
                    onChange={(e) => setEditForm(prev => ({ ...prev, warrantyExpiry: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Espeficicações Técnicas Avançadas</span>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold mb-1">Processador</label>
                    <input 
                      type="text" 
                      value={editForm.processor}
                      onChange={(e) => setEditForm(prev => ({ ...prev, processor: e.target.value }))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold mb-1">Memória RAM</label>
                    <input 
                      type="text" 
                      value={editForm.ram}
                      onChange={(e) => setEditForm(prev => ({ ...prev, ram: e.target.value }))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold mb-1">Armazenamento</label>
                    <input 
                      type="text" 
                      value={editForm.storage}
                      onChange={(e) => setEditForm(prev => ({ ...prev, storage: e.target.value }))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-4 border-t border-slate-100 mt-4">
              <button 
                type="button" 
                onClick={() => setIsEditOpen(false)}
                className="w-1/2 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="w-1/2 py-2.5 bg-indigo-700 text-white rounded-xl text-sm font-bold hover:bg-indigo-800"
              >
                Confirmar Modificações
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Scanner Modal for Patrimonio */}
      {isScanningPatrimonio && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Scan size={18} className="text-indigo-600" />
                Ler Código de Patrimônio
              </h3>
              <button onClick={() => setIsScanningPatrimonio(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 bg-black">
              <div id="patrimonio-reader" className="w-full rounded-xl overflow-hidden bg-black min-h-[250px]"></div>
              <style>{`
                #patrimonio-reader { border: none !important; }
                #patrimonio-reader video { object-fit: cover !important; border-radius: 0.75rem !important; }
                #patrimonio-reader__dashboard_section_csr button { 
                  background: #4f46e5; color: white; padding: 6px 12px; border-radius: 8px; font-weight: bold; border: none; font-size: 12px; margin-bottom: 8px;
                }
                #patrimonio-reader__dashboard_section_swaplink { text-decoration: none; color: #4f46e5; font-weight: bold; }
              `}</style>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 text-center text-xs text-slate-500">
              Aponte a câmera para a etiqueta de patrimônio para preencher automaticamente.
            </div>
          </div>
        </div>
      )}

      {/* Pop up form print QR label page mockup */}
      {isPrintBadgeOpen && (
        <div id="print-badge-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700 animate-slide-up flex flex-col items-center text-center">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Guia de Impressão de Etiqueta</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Impressora de fita térmica patrimonial padrão Zebra conectada.</p>

            {/* Rendered barcode layout card mock */}
            <div className="my-6 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 p-5 rounded-2xl w-full max-w-[240px] shadow-sm flex flex-col items-center">
              <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">ATIVOS APOIO</span>
              
              {/* Fake QR graphic placeholder cleanly rendered */}
              <div className="bg-slate-100 w-32 h-32 my-3 rounded-lg flex items-center justify-center p-2">
                <svg className="w-full h-full text-slate-800 dark:text-slate-100" viewBox="0 0 100 100">
                  {/* Vector design representing QR lines */}
                  <rect x="5" y="5" width="25" height="25" fill="currentColor" />
                  <rect x="10" y="10" width="15" height="15" fill="white" />
                  <rect x="12" y="12" width="11" height="11" fill="currentColor" />
                  
                  <rect x="70" y="5" width="25" height="25" fill="currentColor" />
                  <rect x="75" y="10" width="15" height="15" fill="white" />
                  <rect x="77" y="12" width="11" height="11" fill="currentColor" />

                  <rect x="5" y="70" width="25" height="25" fill="currentColor" />
                  <rect x="10" y="75" width="15" height="15" fill="white" />
                  <rect x="12" y="77" width="11" height="11" fill="currentColor" />
                  
                  {/* Middle noise pixels */}
                  <rect x="40" y="40" width="8" height="8" fill="currentColor" />
                  <rect x="52" y="40" width="8" height="16" fill="currentColor" />
                  <rect x="40" y="52" width="12" height="8" fill="currentColor" />
                  <rect x="68" y="40" width="12" height="12" fill="currentColor" />
                  <rect x="40" y="68" width="16" height="8" fill="currentColor" />
                  <rect x="68" y="68" width="12" height="12" fill="currentColor" />
                </svg>
              </div>

              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{asset.name.slice(0, 18)}</span>
              <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 mt-0.5">{asset.id}</span>
            </div>

            <div className="flex gap-2.5 w-full">
              <button 
                type="button" 
                onClick={() => setIsPrintBadgeOpen(false)}
                className="w-1/2 py-2 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:bg-slate-800"
              >
                Voltar
              </button>
              <button 
                type="button" 
                onClick={() => { alert("Etiqueta de patrimônio enviada com sucesso para a fila de impressão térmica Zebra!"); setIsPrintBadgeOpen(false); }}
                className="w-1/2 py-2 bg-indigo-700 text-white rounded-xl text-sm font-bold hover:bg-indigo-800"
              >
                Imprimir Agora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
