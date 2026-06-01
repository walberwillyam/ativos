require('dotenv').config();
const si = require('systeminformation');
const os = require('os');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const ASSET_ID = process.env.ASSET_ID || os.hostname();
const UNIT_ID = process.env.UNIT_ID || 'UNKNOWN_UNIT';

const PING_INTERVAL_MS = 10000; // 10 segundos

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

    const healthData = {
      asset_id: ASSET_ID,
      unit_id: UNIT_ID,
      cpu_usage: cpu.currentLoad.toFixed(2),
      ram_total: mem.total,
      ram_used: mem.active,
      disk_total: diskTotal,
      disk_used: diskUsed,
      os_info: `${osInfo.distro} ${osInfo.release}`,
      last_ping: new Date().toISOString()
    };

    console.log(`[${new Date().toLocaleTimeString()}] Enviando dados de saúde para ${ASSET_ID}... (CPU: ${healthData.cpu_usage}%)`);

    // 2. Tenta atualizar se já existe, senão insere (Upsert por lógica simples)
    // Como a chave primária é gerada aleatoriamente, vamos checar se o asset já existe
    const { data: existingAsset } = await supabase
      .from('devices_health')
      .select('id')
      .eq('asset_id', ASSET_ID)
      .single();

    if (existingAsset) {
      // Faz UPDATE
      const { error } = await supabase
        .from('devices_health')
        .update(healthData)
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

console.log(`=== Agente de Monitoramento Iniciado ===`);
console.log(`Máquina: ${ASSET_ID} | Unidade: ${UNIT_ID}`);
console.log(`Aguardando... Enviando dados a cada ${PING_INTERVAL_MS / 1000} segundos.\n`);

// Executa na hora que liga e depois a cada 10s
collectAndSendHealth();
setInterval(collectAndSendHealth, PING_INTERVAL_MS);
