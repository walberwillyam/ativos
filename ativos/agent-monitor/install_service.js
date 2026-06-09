const Service = require('node-windows').Service;
const path = require('path');

// Valida que o dotenv esta configurado antes de registrar o servico
require('dotenv').config();
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ ERRO: Arquivo .env não contém SUPABASE_URL ou SUPABASE_ANON_KEY.');
  console.error('   Crie o arquivo .env na mesma pasta com as credenciais do Supabase.');
  process.exit(1);
}

const svc = new Service({
  name: 'AtivosApoio_Agente_Oficial',
  description: 'Agente oficial de telemetria do sistema Ativos Apoio.',
  script: path.join(__dirname, 'agent.js'),
  nodeOptions: [],
  env: [
    { name: 'SUPABASE_URL', value: process.env.SUPABASE_URL },
    { name: 'SUPABASE_ANON_KEY', value: process.env.SUPABASE_ANON_KEY },
    { name: 'UNIT_ID', value: process.env.UNIT_ID || '' },
    { name: 'ASSET_ID', value: process.env.ASSET_ID || '' }
  ],
  wait: 2,
  grow: .5,
  maxRestarts: 10
});

svc.on('install', function() {
  console.log('✔ Serviço instalado com sucesso!');
  console.log('  Iniciando o serviço...');
  svc.start();
});

svc.on('alreadyinstalled', function() {
  console.log('⚠ Este serviço já estava instalado. Reiniciando...');
  svc.start();
});

svc.on('error', function(error) {
  console.error('❌ ERRO ao tentar instalar o serviço:', error);
  process.exit(1);
});

svc.on('start', function() {
  console.log('▶ Serviço iniciado em background com sucesso!');
});

svc.on('invalidinstallation', function() {
  console.error('❌ Instalação inválida detectada. Removendo e reinstalando...');
  svc.uninstall();
});

svc.on('uninstall', function() {
  console.log('  Serviço antigo removido. Reinstalando...');
  svc.install();
});

console.log('Registrando serviço do Windows...');
console.log('  Script: ' + path.join(__dirname, 'agent.js'));
svc.install();

// Mantém o script vivo por até 20 segundos para dar tempo do Windows instalar o serviço
setTimeout(() => {
  console.log('Tempo limite de espera de instalação concluído.');
  process.exit(0);
}, 20000);
