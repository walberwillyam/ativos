/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Asset, TimelineStep } from '../types';

export const INITIAL_ASSETS: Asset[] = [
  {
    id: "AST-2024-00892",
    patrimonio: "#PAT-2024-00892",
    name: "Server Rack Unit Pro-X5",
    category: "Hardware de Rede",
    model: "Dell EMC PowerEdge R760",
    serialNumber: "DELL-SRV-X5992",
    unit: "Matriz - São Paulo",
    location: "CPD A - Setor 4",
    currentFloor: "cpd",
    mapCoordinates: { x: 18, y: 18 },
    responsible: {
      name: "Ricardo Mendes",
      initials: "RM",
      avatarUrl: "https://lh3.googleusercontent.com/aida/AP1WRLvWBsZ1hkfAgDjk7fj_bAf0jXX7GJ26BV-LgtNNOqWgw40yADrSN6xlQXVKVopMWPluSTX2AdejiYO6PTrZJgl69D1T83MX2ECCsWbFrXOevfVnrxFrWheWyjVbl63tDru_ATpbkGpPqdisXVOEB3SCkgzLyDBeBqgx-TecVxCdRmHFqHQQGYIb3gtzSH8DrV_W7XWd1HdJkpn6pppSc_YCeXOG6PdjBDPdbhI0pzWs0Fseg4ZAfXBV6w"
    },
    status: "Em Uso",
    value: 45200.00,
    acquisitionDate: "2023-05-12",
    warrantyExpiry: "2026-05-12",
    specifications: {
      "Processador": "2x Intel Xeon Platinum 8480+",
      "Memória RAM": "512GB DDR5 ECC RDIMM",
      "Armazenamento": "4x 1.92TB NVMe SSD Enterprise",
      "Fonte de Alimentação": "Dual Redundante 1400W",
      "Controladora": "PERC H755 Enterprise RAID",
      "Placa de Rede": "Quad-Port 10GbE SFP+"
    },
    imageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=800",
    history: [
      {
        id: "log-1",
        title: "Transferido para Datacenter Sul",
        responsible: "Ricardo Mendes",
        date: "2024-01-15",
        time: "14:20",
        type: "transfer",
        description: "Equipamento movimentado da sede central para instalação física no Datacenter Sul, rack C12.",
        attachmentName: "Guia_Transferencia_Fisica.pdf"
      },
      {
        id: "log-2",
        title: "Manutenção Corretiva Concluída",
        responsible: "Suporte Autorizado Dell",
        date: "2023-11-03",
        time: "09:15",
        type: "maintenance",
        description: "Executado serviços de limpeza interna, troca preventiva de pasta térmica nos dois sockets e atualização do firmware da controladora RAID.",
        attachmentName: "Relatorio_Manutencao_042.pdf"
      },
      {
        id: "log-3",
        title: "Recebido no Almoxarifado Central",
        responsible: "Almoxarifado Geral",
        date: "2023-05-12",
        time: "16:45",
        type: "reception",
        description: "Equipamento novo recebido com lacre intacto, verificado integridade física e anexada etiqueta patrimonial física.",
        attachmentName: "Nota_Fiscal_Compra-DELL.pdf"
      }
    ]
  },
  {
    id: "KINETIC-8821",
    patrimonio: "#PAT-004452",
    name: "MacBook Pro 14\"",
    category: "Notebooks",
    model: "Apple MacBook Pro M2 Max",
    serialNumber: "C02G65J8MD6M",
    unit: "Matriz - São Paulo",
    location: "Escritório Sala A",
    currentFloor: "office",
    mapCoordinates: { x: 35, y: 25 },
    responsible: {
      name: "Ricardo Mendes",
      initials: "RM",
      avatarUrl: "https://lh3.googleusercontent.com/aida/AP1WRLvWBsZ1hkfAgDjk7fj_bAf0jXX7GJ26BV-LgtNNOqWgw40yADrSN6xlQXVKVopMWPluSTX2AdejiYO6PTrZJgl69D1T83MX2ECCsWbFrXOevfVnrxFrWheWyjVbl63tDru_ATpbkGpPqdisXVOEB3SCkgzLyDBeBqgx-TecVxCdRmHFqHQQGYIb3gtzSH8DrV_W7XWd1HdJkpn6pppSc_YCeXOG6PdjBDPdbhI0pzWs0Fseg4ZAfXBV6w"
    },
    status: "Em Uso",
    value: 14500.00,
    acquisitionDate: "2023-05-12",
    warrantyExpiry: "2024-05-12",
    specifications: {
      "Processador": "Apple M2 Max (12-core CPU)",
      "Memória RAM": "32GB LPDDR5 Unificada",
      "Armazenamento": "1TB SSD NVMe de Alta Velocidade",
      "Placa de Vídeo": "30-core GPU Integrada",
      "Sistema de Tela": "Liquid Retina XDR 14.2\" Liquid Crystal",
      "Teclado": "Magic Keyboard US layout com Touch ID"
    },
    imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=800",
    history: [
      {
        id: "log-mac-1",
        title: "Ativação no Sistema",
        responsible: "Ricardo Mendes",
        date: "2023-05-15",
        time: "10:00",
        type: "creation",
        description: "Laptop configurado e entregue ao usuário, instalado perfil MDM corporativo de segurança."
      }
    ]
  },
  {
    id: "KINETIC-9042",
    patrimonio: "#PAT-005671",
    name: "Cadeira Ergonômica Pro",
    category: "Mobiliário",
    model: "Herman Miller Aeron Size B",
    serialNumber: "HM-AERON-88231",
    unit: "Filial - Rio de Janeiro",
    location: "Escritório - Bloco B",
    currentFloor: "office",
    mapCoordinates: { x: 50, y: 75 },
    responsible: {
      name: "Ana Silva",
      initials: "AS",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200"
    },
    status: "Manutenção",
    value: 8900.00,
    acquisitionDate: "2022-09-10",
    warrantyExpiry: "2032-09-10",
    specifications: {
      "Material": "Pellicle weave respirável cinza",
      "Ajustes": "Cervical, Apoio Lombar regulável PostureFit SL",
      "Rodas": "Rodízios para carpete ou piso duro",
      "Suporte de Carga": "Até 136 kg"
    },
    imageUrl: "https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&q=80&w=800",
    history: [
      {
        id: "log-chair-1",
        title: "Abertura de Chamado de Manutenção",
        responsible: "Ana Silva",
        date: "2024-05-28",
        time: "11:30",
        type: "maintenance",
        description: "Mecanismo de inclinação travado. Solicitado reparo em garantia com o revendedor autorizado Herman Miller."
      }
    ]
  },
  {
    id: "KINETIC-7743",
    patrimonio: "#PAT-003310",
    name: "HP LaserJet Enterprise M507",
    category: "Impressoras",
    model: "HP Enterprise M507dn Mono",
    serialNumber: "VNB3K12445",
    unit: "Depósito - Paraná",
    location: "Zona de Estoque",
    currentFloor: "loja",
    mapCoordinates: { x: 45, y: 65 },
    responsible: {
      name: "José Oliveira",
      initials: "JO",
      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200"
    },
    status: "Armazenado",
    value: 6800.00,
    acquisitionDate: "2023-11-20",
    warrantyExpiry: "2024-11-20",
    specifications: {
      "Tipo de Impressão": "Laser Monocromática",
      "Velocidade": "Até 45 ppm em preto",
      "Conexão": "Gigabit Ethernet, Host USB",
      "Capacidade": "Bandeja para 550 folhas"
    },
    imageUrl: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&q=80&w=800",
    history: [
      {
        id: "log-prt-1",
        title: "Guarda em Almoxarifado CD",
        responsible: "José Oliveira",
        date: "2024-03-10",
        time: "15:10",
        type: "reception",
        description: "Retirada de uso por redução de volume de impressão na filial sul. Armazenada sob embalagem plástica e paletizada."
      }
    ]
  },
  {
    id: "KINETIC-8800",
    patrimonio: "#SW-CORE-01",
    name: "Cisco Nexus 9000",
    category: "Switches",
    model: "Cisco Nexus 93180YC-FX3",
    serialNumber: "FCX2530A29X",
    unit: "Matriz - São Paulo",
    location: "Sala de Reunião - CDP A",
    currentFloor: "cpd",
    mapCoordinates: { x: 55, y: 55 },
    responsible: {
      name: "Suporte Técnico",
      initials: "ST",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"
    },
    status: "Manutenção",
    value: 32000.00,
    acquisitionDate: "2022-06-05",
    warrantyExpiry: "2024-06-05",
    specifications: {
      "Portas": "48x 1/10/25 GbE SFP28 e 6x 40/100 GbE QSFP28",
      "Largura de Banda": "3.6 Tbps",
      "Latency": "Menor que 1 microsegundo",
      "Protocolos": "VXLAN EVPN, OSPF, BGP, Segment Routing"
    },
    imageUrl: "https://images.unsplash.com/photo-1597852074816-d933c7d2b988?auto=format&fit=crop&q=80&w=800",
    history: [
      {
        id: "switch-log-1",
        title: "Abertura de Chamado Emergencial",
        responsible: "Monitoramento Automático",
        date: "2026-06-01",
        time: "19:40",
        type: "maintenance",
        description: "Instabilidade nos links das portas 5 a 12. Oscilação registrada no syslog do Zabbix de forma repetitiva."
      }
    ]
  },
  {
    id: "KINETIC-11029",
    patrimonio: "#PAT-11029",
    name: "Monitor Dell 27\"",
    category: "Monitores",
    model: "Dell UltraSharp U2723QE Ultra HD",
    serialNumber: "CN-08D2R4-74441",
    unit: "Matriz - São Paulo",
    location: "Escritório Sala A - Mesa 12",
    currentFloor: "office",
    mapCoordinates: { x: 75, y: 15 },
    responsible: {
      name: "Ana Cláudia",
      initials: "AC",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200"
    },
    status: "Manutenção",
    value: 3800.00,
    acquisitionDate: "2023-01-15",
    warrantyExpiry: "2026-01-15",
    specifications: {
      "Painel": "IPS Black de 27 polegadas",
      "Resolução": "4K Ultra HD (3840 x 2160)",
      "Brilho": "400 cd/m² com HDR",
      "Conectividade": "USB-C Hub Power Delivery 90W, RJ45, DP, HDMI"
    },
    imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=800",
    history: [
      {
        id: "mon-log-1",
        title: "Registro de Reparo",
        responsible: "Laboratório de TI",
        date: "2026-05-30",
        time: "10:15",
        type: "maintenance",
        description: "Monitor apresentando listras horizontais após descarga oscilante na mesa. Em reparo na assistência."
      }
    ]
  },
  {
    id: "SEG-CAM-09",
    patrimonio: "#PAT-99388",
    name: "Câmera Termográfica",
    category: "Switches",
    model: "FLIR A310f Executiva",
    serialNumber: "FLIR-TH-82281-Z",
    unit: "Matriz - São Paulo",
    location: "Pista Principal - Acesso Norte",
    currentFloor: "pista",
    mapCoordinates: { x: 70, y: 65 },
    responsible: {
      name: "Segurança Patrimonial",
      initials: "SP",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200"
    },
    status: "Em Uso",
    value: 12500.00,
    acquisitionDate: "2022-07-20",
    warrantyExpiry: "2024-07-20",
    specifications: {
      "Sensor": "Microbolômetro não resfriado de 320 x 240 pixels",
      "Sensibilidade Térmica": "< 0.05°C a +30°C",
      "Lente": "Lente de 25° integrada com foco motorizado",
      "Gabinete de Proteção": "IP66 com aquecedor e termostato"
    },
    imageUrl: "https://images.unsplash.com/photo-1557063673-0493e05d49ef?auto=format&fit=crop&q=80&w=800",
    history: [
      {
        id: "cam-log-1",
        title: "Primeira Leitura Ativa",
        responsible: "Sgt. Paulo Henrique",
        date: "2022-07-25",
        time: "08:30",
        type: "creation",
        description: "Câmera configurada e fixada no mastro norte com link de fibra operando perfeitamente."
      }
    ]
  },
  {
    id: "ADM-IMP-22",
    patrimonio: "#PRT-LOG-09",
    name: "HP Enterprise M608",
    category: "Impressoras",
    model: "HP LaserJet Enterprise M608x Dual Tray",
    serialNumber: "CNB4L81119-Z",
    unit: "CD Logístico",
    location: "Zona de Estoque - Prateleira G",
    currentFloor: "loja",
    mapCoordinates: { x: 75, y: 70 },
    responsible: {
      name: "Almoxarifado Central",
      initials: "AC",
      avatarUrl: "https://images.unsplash.com/photo-1596495578065-6e076baf188f?auto=format&fit=crop&q=80&w=200"
    },
    status: "Armazenado",
    value: 18400.00,
    acquisitionDate: "2023-11-22",
    warrantyExpiry: "2026-11-22",
    specifications: {
      "Velocidade": "Até 65 páginas por minuto A4",
      "Ciclo Mensal": "Até 275.000 páginas",
      "Capacidade Máxima": "Até 4.400 folhas com módulos extras",
      "Segurança Integrada": "HP Sure Start, autogestão anti-malware"
    },
    imageUrl: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&q=80&w=800",
    history: [
      {
        id: "imp-log-1",
        title: "Entrada em Estoque do CD",
        responsible: "Almoxarifado CD",
        date: "2023-11-25",
        time: "14:40",
        type: "reception",
        description: "Equipamento novo recebido faturado, reservado em estoque para expansão operacional."
      }
    ]
  }
];

export const INITIAL_NOTIFICATIONS = [
  {
    id: "not-1",
    title: "Vencimento de Garantia Próximo",
    description: "A garantia do asset Cisco Nexus 9000 vence em menos de 10 dias.",
    time: "Há 12 min",
    unread: true
  },
  {
    id: "not-2",
    title: "Instabilidade Registrada",
    description: "Switch Core #03 registrou 15 instabilidades de link seguidas.",
    time: "Há 1 hora",
    unread: true
  },
  {
    id: "not-3",
    title: "Novo Equipamento Cadastrado",
    description: "Adicionado lote #A92 com 10x Tablets Samsung com sucesso.",
    time: "Há 3 horas",
    unread: false
  }
];

export const INITIAL_ACTIVITIES = [
  {
    id: "act-1",
    type: "transfer",
    title: "Movimentação de Ativo",
    details: "Notebook DELL #1298 transferido para Matriz.",
    time: "Há 15 minutos",
    by: "Ricardo S.",
    icon: "sync_alt",
    badgeColor: "bg-emerald-500"
  },
  {
    id: "act-2",
    type: "maintenance",
    title: "Manutenção Solicitada",
    details: "Switch Core #03 apresentando instabilidade de link.",
    time: "Há 1 hora",
    by: "Monitoramento Automático",
    icon: "build",
    badgeColor: "bg-amber-500"
  },
  {
    id: "act-3",
    type: "creation",
    title: "Novo Ativo Cadastrado",
    details: "10x Tablets Samsung Galaxy Tab S9 - Lote #A92.",
    time: "Há 3 horas",
    by: "Almoxarifado",
    icon: "add_circle",
    badgeColor: "bg-blue-600"
  }
];
