const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'AtivosApoio_Agente_Oficial',
  description: 'Agente oficial de telemetria do sistema Ativos Apoio.',
  script: path.join(__dirname, 'agent.js'),
  wait: 2,
  grow: .5,
  maxRestarts: 10
});

svc.on('install', function() {
  console.log('✔ Serviço oficial instalado com sucesso!');
  svc.start();
});

svc.on('alreadyinstalled', function() {
  console.log('⚠ Este serviço já estava instalado. Iniciando...');
  svc.start();
});

svc.on('error', function(error) {
  console.error('❌ ERRO ao tentar instalar o serviço:', error);
});

svc.on('start', function() {
  console.log('▶ Serviço iniciado em background!');
});

svc.install();

// Mantém o script vivo por até 15 segundos para dar tempo do Windows instalar o serviço
setTimeout(() => {
  console.log('Tempo limite de espera de instalação concluído.');
}, 15000);
