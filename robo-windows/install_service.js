const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'AtivosApoio_AgenteTI',
  description: 'Agente de telemetria e inventário do sistema Ativos Apoio.',
  script: path.join(__dirname, 'agent.js'),
  wait: 2,
  grow: .5,
  maxRestarts: 10
});

svc.on('install', function() {
  console.log('Serviço instalado com sucesso no Windows!');
  svc.start();
});

svc.on('alreadyinstalled', function() {
  console.log('Este serviço já está instalado.');
});

svc.on('start', function() {
  console.log('Serviço iniciado com sucesso.');
});

// Instala o serviço
svc.install();
