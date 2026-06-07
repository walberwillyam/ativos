const fs = require('fs');
const path = require('path');
const axios = require('axios');

const CURRENT_VERSION = "1.0.0";

// 1 vez por dia = 24 horas * 60 minutos * 60 segundos * 1000 milissegundos
const UPDATE_CHECK_INTERVAL = 1000 * 60 * 60 * 24; 

// A cada 5 minutos
const TELEMETRY_INTERVAL = 1000 * 60 * 5;

// URL fictícia - Substitua depois pelo seu endpoint / Supabase
const UPDATE_URL = "https://sua-api.com/api/agent-version"; 

async function checkAndUpdate() {
  try {
    console.log(`[${new Date().toISOString()}] Checando por atualizações... Versão atual: ${CURRENT_VERSION}`);
    
    // NOTA: Troque a URL acima pelo link real onde você armazenará o JSON da versão nova.
    // O código abaixo está comentado para não dar erro de rede ao tentar conectar na URL fictícia.
    /* 
    const response = await axios.get(UPDATE_URL);
    const serverVersion = response.data.version;
    const downloadUrl = response.data.scriptUrl;

    if (serverVersion !== CURRENT_VERSION) {
      console.log(`Nova versão encontrada: ${serverVersion}. Iniciando download...`);
      const scriptResponse = await axios.get(downloadUrl, { responseType: 'text' });
      const newScriptContent = scriptResponse.data;
      const scriptPath = path.join(__dirname, 'agent.js');
      fs.writeFileSync(scriptPath, newScriptContent, 'utf8');
      console.log('Atualização concluída com sucesso. Reiniciando o serviço...');
      process.exit(0); 
    } else {
      console.log('O robô já está na versão mais recente.');
    }
    */
    console.log('Função de auto-atualização engatilhada. (Descomente a lógica no agent.js quando configurar o Supabase).');
  } catch (error) {
    console.error('Falha ao checar atualizações:', error.message);
  }
}

function runTelemetry() {
  console.log(`[${new Date().toISOString()}] Rodando telemetria... Enviando dados para o painel.`);
  // Coloque aqui sua lógica de os.cpus(), os.totalmem(), e envio para o Supabase
}

console.log('--- Serviço do Agente Iniciado ---');

// Executa a telemetria a cada 5 minutos
setInterval(runTelemetry, TELEMETRY_INTERVAL);

// Verifica atualizações apenas 1 vez ao dia (a cada 24h)
setInterval(checkAndUpdate, UPDATE_CHECK_INTERVAL);

// Executa a primeira vez ao ligar o robô
runTelemetry();
checkAndUpdate();
