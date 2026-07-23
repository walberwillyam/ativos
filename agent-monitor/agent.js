require('dotenv').config();
const si = require('systeminformation');
const os = require('os');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

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

    // Extrair Product Key do Windows
    let productKey = null;
    try {
      // Tenta via WMI (chaves de fábrica na BIOS)
      const output = execSync(`powershell -NoProfile -Command "(Get-WmiObject -query 'select * from SoftwareLicensingService').OA3xOriginalProductKey"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      productKey = output.trim();
    } catch (e) { /* ignore */ }
    
    if (!productKey) {
      try {
        // Tenta via Registro (chaves instaladas posteriormente)
        const output2 = execSync(`powershell -NoProfile -Command "(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\SoftwareProtectionPlatform' -Name BackupProductKeyDefault).BackupProductKeyDefault"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        productKey = output2.trim();
      } catch (e) { /* ignore */ }
    }

    const { data: assetData } = await supabase
      .from('assets')
      .select('specifications, history, unit')
      .eq('id', ASSET_ID)
      .single();

    const hostUnit = assetData?.unit || UNIT_ID;
    const currentSpecs = assetData?.specifications || {};
    currentSpecs["Sistema Operacional"] = osString;
    
    // Vinculação de Licença de SO
    if (productKey) {
      currentSpecs["os_product_key"] = productKey;
      try {
        const { data: license } = await supabase
          .from('os_licenses')
          .select('id, asset_id')
          .eq('product_key', productKey)
          .maybeSingle();
        
        if (license) {
          if (license.asset_id !== ASSET_ID) {
            await supabase
              .from('os_licenses')
              .update({ asset_id: ASSET_ID })
              .eq('id', license.id);
            console.log(`[Licença] Chave do Windows vinculada com sucesso a esta máquina.`);
          }
        } else {
          const { error: insertErr } = await supabase
            .from('os_licenses')
            .insert([{ product_key: productKey, asset_id: ASSET_ID }]);
          if (insertErr) {
            console.error(`[Licença] Erro ao inserir nova chave:`, insertErr.message);
          } else {
            console.log(`[Licença] Nova chave do Windows registrada e vinculada com sucesso.`);
          }
        }
      } catch (err) {
        console.error(`[Licença] Erro ao buscar/atualizar chave do Windows:`, err.message);
      }
    }

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

    // --- AUTODESCOBERTA DE PERIFÉRICOS (DESATIVADA A PEDIDO) ---
    // A criação automática de monitores e impressoras foi removida.
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

    const { error: updateAssetErr } = await supabase
      .from('assets')
      .update(updatePayload)
      .eq('id', ASSET_ID);
      
    if (updateAssetErr) {
      console.error(`[Erro] Falha ao atualizar o ativo ${ASSET_ID}:`, updateAssetErr.message);
    } else {
      console.log(`[Ativo] Especificações atualizadas (incluindo chave do SO).`);
    }

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
    const { data: existingAssets } = await supabase
      .from('devices_health')
      .select('id')
      .eq('asset_id', ASSET_ID)
      .limit(1);

    if (existingAssets && existingAssets.length > 0) {
      const existingAsset = existingAssets[0];
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

const CURRENT_VERSION = "1.2.1";
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

