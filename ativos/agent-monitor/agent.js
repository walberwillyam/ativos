require('dotenv').config();
const si = require('systeminformation');
const os = require('os');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// ===== VALIDAÇÃO DE INICIALIZAÇÃO =====
if (!supabaseUrl || !supabaseKey) {
  console.error('==========================================================');
  console.error('  ERRO FATAL: Variáveis de ambiente não configuradas!');
  console.error('==========================================================');
  console.error('');
  if (!supabaseUrl) console.error('  ❌ SUPABASE_URL não definido');
  if (!supabaseKey) console.error('  ❌ SUPABASE_ANON_KEY não definido');
  console.error('');
  console.error('  Certifique-se de que o arquivo .env existe na pasta do agente');
  console.error('  ou que as variáveis foram passadas via serviço do Windows.');
  console.error('');
  console.error('  Caminho esperado do .env:', require('path').join(__dirname, '.env'));
  console.error('==========================================================');
  // Mantém o processo vivo por 30s para que o log seja visível
  setTimeout(() => process.exit(1), 30000);
  // Não continua a execução
  return;
}

const ws = require('ws');
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { transport: ws },
  global: { WebSocket: ws }
});

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Persiste o ASSET_ID original para não perder o vínculo se o usuário mudar o nome do computador
const idFilePath = path.join(__dirname, 'agent-id.json');
let ASSET_ID = process.env.ASSET_ID || os.hostname();

if (fs.existsSync(idFilePath)) {
  try {
    const data = JSON.parse(fs.readFileSync(idFilePath, 'utf8'));
    if (data.asset_id) {
      ASSET_ID = data.asset_id;
    }
  } catch(e) {}
} else {
  fs.writeFileSync(idFilePath, JSON.stringify({ asset_id: ASSET_ID }));
}

const UNIT_ID_RAW = process.env.UNIT_ID || 'UNKNOWN_UNIT';
let UNIT_ID = UNIT_ID_RAW; // será resolvido para o nome real da unidade

// Resolve o nome real da unidade a partir do ID
async function resolveUnitName() {
  try {
    const { data, error } = await supabase
      .from('units')
      .select('id, name')
      .eq('id', UNIT_ID_RAW)
      .single();

    if (data && data.name) {
      UNIT_ID = data.name;
      console.log(`[Unidade] Resolvido: "${UNIT_ID_RAW}" -> "${UNIT_ID}"`);
    } else {
      // Talvez o usuário já tenha colocado o nome direto
      console.log(`[Unidade] Usando valor direto: "${UNIT_ID}"`);
    }
  } catch (e) {
    console.log(`[Unidade] Não foi possível resolver o nome, usando: "${UNIT_ID}"`);
  }
}

const PING_INTERVAL_MS = 180000; // 3 minutos (180.000 ms)

function getMonitorDetails() {
  try {
    const psScript = `
      [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
      $monitors = Get-WmiObject WmiMonitorID -Namespace root\\wmi
      $res = @()
      foreach ($m in $monitors) {
        try {
          $name = [System.Text.Encoding]::ASCII.GetString($m.UserFriendlyName).Replace([char]0, '').Trim()
          $serial = [System.Text.Encoding]::ASCII.GetString($m.SerialNumberID).Replace([char]0, '').Trim()
          if ($name -and $name -notmatch 'Generic PnP Monitor' -and $name -notmatch 'GenǸrico') {
            $res += @{ Name = $name; Serial = $serial }
          }
        } catch {}
      }
      $res | ConvertTo-Json -Compress
    `;
    const output = execSync(`powershell -NoProfile -Command "${psScript.replace(/\\n/g, ' ')}"`).toString();
    if (!output.trim()) return [];
    const parsed = JSON.parse(output);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    return [];
  }
}

function getPrinterStatuses() {
  try {
    const psScript = `
      $printers = Get-WmiObject Win32_Printer
      $res = @()
      foreach ($p in $printers) {
        $res += @{ Name = $p.Name; Offline = $p.WorkOffline }
      }
      $res | ConvertTo-Json -Compress
    `;
    const output = execSync(`powershell -NoProfile -Command "${psScript.replace(/\\n/g, ' ')}"`).toString();
    if (!output.trim()) return [];
    const parsed = JSON.parse(output);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    return [];
  }
}

async function collectAndSendHealth() {
  try {
    // 1. Coleta de Dados
    const cpu = await si.currentLoad();
    const mem = await si.mem();
    const fsSize = await si.fsSize();
    const osInfo = await si.osInfo();

    // Soma o espaço do disco primário
    let diskTotal = 0;
    let diskUsed = 0;
    if (fsSize && fsSize.length > 0) {
      diskTotal = fsSize[0].size;
      diskUsed = fsSize[0].used;
    }

    const systemData = await si.system();
    const baseboardData = await si.baseboard();
    let serialNumber = systemData.serial && systemData.serial !== '-' && systemData.serial !== 'Default string' ? systemData.serial : null;
    if (!serialNumber) {
      serialNumber = baseboardData.serial && baseboardData.serial !== '-' && baseboardData.serial !== 'Default string' ? baseboardData.serial : null;
    }

    const hardwareModel = `${systemData.manufacturer && systemData.manufacturer !== 'Default string' ? systemData.manufacturer : ''} ${systemData.model && systemData.model !== 'Default string' ? systemData.model : ''}`.trim();
    const osString = `${osInfo.distro} ${osInfo.release}`;

    const { data: assetData } = await supabase
      .from('assets')
      .select('specifications, history, unit')
      .eq('id', ASSET_ID)
      .single();

    const hostUnit = assetData?.unit || UNIT_ID;
    const currentSpecs = assetData?.specifications || {};
    currentSpecs["Sistema Operacional"] = osString;

    let currentHistory = assetData?.history || [];
    let historyChanged = false;

    // --- RASTREAMENTO DE MUDANÇA DE HARDWARE (BASELINE) ---
    const currentRamGB = Math.round(mem.total / 1024 / 1024 / 1024);
    // Allow fallback if fsSize fails
    const currentDiskGB = diskTotal > 0 ? Math.round(diskTotal / 1024 / 1024 / 1024) : 0;

    if (!currentSpecs.hardware_baseline && currentDiskGB > 0) {
      // Cria a assinatura inicial
      currentSpecs.hardware_baseline = {
        ramGB: currentRamGB,
        diskGB: currentDiskGB
      };
      console.log(`[Baseline] Assinatura de hardware criada: ${currentRamGB}GB RAM, ${currentDiskGB}GB Disco.`);
    } else if (currentSpecs.hardware_baseline && currentDiskGB > 0) {
      const baselineRam = currentSpecs.hardware_baseline.ramGB;
      const baselineDisk = currentSpecs.hardware_baseline.diskGB;

      let alerts = [];

      // Checa Memória RAM (se mudou)
      if (currentRamGB !== baselineRam) {
        const action = currentRamGB > baselineRam ? 'adicionada' : 'removida';
        alerts.push(`Memória RAM ${action}: Mudou de ${baselineRam}GB para ${currentRamGB}GB`);
        currentSpecs.hardware_baseline.ramGB = currentRamGB;
      }

      // Checa Disco (tolerância de 5GB para variações de partição/formatação)
      if (Math.abs(currentDiskGB - baselineDisk) > 5) {
        const action = currentDiskGB > baselineDisk ? 'adicionado' : 'removido';
        alerts.push(`Armazenamento (Disco) ${action}: Mudou de ~${baselineDisk}GB para ~${currentDiskGB}GB`);
        currentSpecs.hardware_baseline.diskGB = currentDiskGB;
      }

      // Se houver algum alerta, injeta na linha do tempo
      if (alerts.length > 0) {
        const alertMsg = alerts.join(" | ");
        console.log(`[ALERTA] ${alertMsg}`);
        
        const dateObj = new Date();
        const newStep = {
          id: `TR-${Math.floor(100000 + Math.random() * 900000)}`,
          title: "Alteração de Hardware Detectada (Agente)",
          responsible: "Sistema (Agente)",
          date: dateObj.toISOString().split('T')[0],
          time: dateObj.toTimeString().split(' ')[0].substring(0, 5),
          type: "audit",
          description: alertMsg
        };

        // Inserir no topo do histórico
        currentHistory = [newStep, ...currentHistory];
        historyChanged = true;
      }
    }
    // --- FIM RASTREAMENTO ---

    // --- AUTODESCOBERTA DE PERIFÉRICOS ---
    try {
      const graphics = await si.graphics();
      const usbs = await si.usb();
      const printers = await si.printer();
      
      const newAssets = [];
      const nowString = new Date().toISOString().split('T')[0];

      // 1. Monitores
      if (graphics && graphics.displays) {
        const monitorDetails = getMonitorDetails();
        graphics.displays.forEach((disp, idx) => {
          let name = disp.model || `Monitor ${idx+1}`;
          let serial = 'N/A';

          if (monitorDetails[idx]) {
            name = monitorDetails[idx].Name || name;
            serial = monitorDetails[idx].Serial || serial;
          }

          if (!name || name.includes('GenǸrico') || name.includes('Default') || name.includes('padrǜo') || name === 'Generic PnP Monitor' || name === 'Monitor Genérico PnP') {
             if (serial === 'N/A') return; 
          }

          const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 15);
          newAssets.push({
            id: `MON-${hostUnit.substring(0,8).replace(/[^a-zA-Z0-9_-]/g, '')}-${safeName}-${idx}`,
            patrimonio: `AUTO-MON-${idx}`,
            name: `${disp.vendor && disp.vendor.length > 2 && !disp.vendor.includes('padr') ? disp.vendor + ' ' : ''}${name}`.trim(),
            category: 'Monitores',
            model: name,
            serialNumber: serial,
            unit: hostUnit,
            location: currentSpecs['location'] || 'Conectado a ' + ASSET_ID,
            currentFloor: 'office',
            mapCoordinates: { x: 50, y: 50 },
            responsible: { name: 'Sistema (Agente)', initials: 'SYS' },
            status: 'Em Uso',
            value: 0,
            acquisitionDate: nowString,
            warrantyExpiry: nowString,
            specifications: { "Resolução": `${disp.resolutionX}x${disp.resolutionY}`, "Host": ASSET_ID },
            history: []
          });
        });
      }

      // 2. USB (Mouses, Teclados, Webcams) - Removido a pedido

      // 3. Impressoras
      if (printers) {
        const pStatuses = getPrinterStatuses();
        printers.forEach((prn, idx) => {
          if (!prn.name || prn.name.includes('PDF') || prn.name.includes('OneNote') || prn.name.includes('XPS') || prn.name.toLowerCase().includes('fax')) return;
          
          if (prn.status === 'Offline' || prn.status === 'Unknown' || prn.status === 'Error' || prn.status === 'Stopped Printing') return;
          
          const pStat = pStatuses.find(p => p.Name === prn.name);
          if (pStat && pStat.Offline) return;
          
          const name = prn.name;
          const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 10);
          newAssets.push({
            id: `PRN-${hostUnit.substring(0,8).replace(/[^a-zA-Z0-9_-]/g, '')}-${safeName}`,
            patrimonio: `AUTO-PRN-${safeName}`,
            name: name,
            category: 'Impressoras',
            model: prn.model || name,
            serialNumber: prn.serial || prn.serialNumber || 'N/A',
            unit: hostUnit,
            location: prn.local ? 'Local - ' + ASSET_ID : 'Rede',
            currentFloor: 'office',
            mapCoordinates: { x: 50, y: 50 },
            responsible: { name: 'Sistema (Agente)', initials: 'SYS' },
            status: 'Em Uso',
            value: 0,
            acquisitionDate: nowString,
            warrantyExpiry: nowString,
            specifications: { "Host/Rede": prn.local ? ASSET_ID : 'Rede', "Local": prn.local ? "Sim" : "Não" },
            history: []
          });
        });
      }

      // Salva os ativos na tabela
      for (const asset of newAssets) {
        const { data: existingPeripheral } = await supabase
          .from('assets')
          .select('id')
          .eq('id', asset.id)
          .single();

        if (!existingPeripheral) {
          const { error: insErr } = await supabase.from('assets').insert([asset]);
          if (insErr) {
            console.error(`Erro ao inserir periférico ${asset.name}:`, insErr.message);
          } else {
            console.log(`[Autodescoberta] Periférico cadastrado como novo Ativo: ${asset.name}`);
          }
        }
      }
    } catch (discoveryErr) {
      console.error("Erro na autodescoberta de periféricos:", discoveryErr);
    }
    // --- FIM AUTODESCOBERTA ---

    const updatePayload = { specifications: currentSpecs };
    if (historyChanged) updatePayload.history = currentHistory;
    if (serialNumber) updatePayload.serialNumber = serialNumber;
    if (hardwareModel && hardwareModel.length > 2) updatePayload.model = hardwareModel;

    // Se o usuário mudou o nome da máquina no SO, atualizamos o nome do ativo no inventário
    const currentHostname = os.hostname();
    if (ASSET_ID !== currentHostname && !process.env.ASSET_ID) {
      updatePayload.name = currentHostname;
      console.log(`[!] Mudança de hostname detectada: ${ASSET_ID} -> ${currentHostname}. Atualizando nome no inventário.`);
    }

    await supabase
      .from('assets')
      .update(updatePayload)
      .eq('id', ASSET_ID);

    const healthData = {
      asset_id: ASSET_ID,
      unit_id: UNIT_ID,
      cpu_usage: cpu.currentLoad.toFixed(2),
      ram_total: mem.total,
      ram_used: mem.active,
      disk_total: diskTotal,
      disk_used: diskUsed,
      os_info: `${osInfo.distro} ${osInfo.release}`,
      last_ping: new Date().toISOString(),
      uptime_seconds: os.uptime()
    };

    console.log(`[${new Date().toLocaleTimeString()}] Enviando dados de saúde para ${ASSET_ID}... (CPU: ${healthData.cpu_usage}%, Uptime: ${Math.floor(healthData.uptime_seconds/3600)}h)`);

    // 2. Tenta atualizar se já existe, senão insere (Upsert por lógica simples)
    // Como a chave primária é gerada aleatoriamente, vamos checar se o asset já existe
    const { data: existingAsset } = await supabase
      .from('devices_health')
      .select('id')
      .eq('asset_id', ASSET_ID)
      .single();

    if (existingAsset) {
      // Remove o unit_id para não sobrescrever a unidade definida manualmente pelo admin no painel
      const { unit_id, ...updateData } = healthData;

      // Faz UPDATE
      const { error } = await supabase
        .from('devices_health')
        .update(updateData)
        .eq('id', existingAsset.id);
      
      if (error) console.error("Erro no UPDATE:", error.message);
    } else {
      // Faz INSERT
      const { error } = await supabase
        .from('devices_health')
        .insert([healthData]);
      
      if (error) console.error("Erro no INSERT:", error.message);
    }

  } catch (error) {
    console.error("Erro geral no agente:", error);
  }
}

// --- LÓGICA DE AUTO ATUALIZAÇÃO ---
const axios = require('axios');

const CURRENT_VERSION = "1.2.0";
const UPDATE_CHECK_INTERVAL = 1000 * 60 * 60 * 24; // 24h

async function checkAndUpdate() {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] Checando atualizações... Versão: ${CURRENT_VERSION}`);
    
    const { data, error } = await supabase
      .from('agent_releases')
      .select('version, script_content')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('Erro ao verificar atualização no Supabase:', error.message);
      }
      return;
    }

    if (data && data.version && data.version !== CURRENT_VERSION) {
      console.log(`Nova versão encontrada (${data.version})! Atualizando o robô...`);
      fs.writeFileSync(path.join(__dirname, 'agent.js'), data.script_content, 'utf8');
      console.log('Atualização concluída com sucesso. Reiniciando o agente...');
      process.exit(0);
    } else {
      console.log('O agente já está na versão mais recente.');
    }
  } catch (err) {
    console.error('Erro no auto-update:', err.message);
  }
}

// === INICIALIZAÇÃO ===
async function init() {
  // Primeiro resolve o nome da unidade
  await resolveUnitName();

  console.log(`=== Agente de Monitoramento Iniciado ===`);
  console.log(`Máquina: ${ASSET_ID} | Unidade: ${UNIT_ID}`);
  console.log(`Aguardando... Enviando dados a cada ${PING_INTERVAL_MS / 1000} segundos.\n`);

  // Executa coleta imediata e depois a cada intervalo
  collectAndSendHealth();
  setInterval(collectAndSendHealth, PING_INTERVAL_MS);

  // Executa update a cada 24h
  setInterval(checkAndUpdate, UPDATE_CHECK_INTERVAL);
  checkAndUpdate();
}

init();

