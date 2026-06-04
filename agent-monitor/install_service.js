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
  console.log('Serviço oficial instalado com sucesso!');
  svc.start();
});

svc.install();
