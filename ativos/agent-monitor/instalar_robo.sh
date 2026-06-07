#!/bin/bash

# Define cores para a saída no terminal
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}===================================================${NC}"
echo -e "${GREEN}     Instalação do Robô - Ativos Apoio (Linux/Mac)${NC}"
echo -e "${GREEN}===================================================${NC}"
echo ""

# Navega para o diretório do script
cd "$(dirname "$0")"

# 1. Verifica se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERRO CRÍTICO] O Node.js não foi encontrado neste computador!${NC}"
    echo ""
    echo "O agente de monitoramento (robô) é escrito em Node.js e requer"
    echo "que ele esteja instalado na máquina."
    echo ""
    echo "PASSO A PASSO PARA CORRIGIR (Ubuntu/Debian):"
    echo "1. Execute: curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -"
    echo "2. Execute: sudo apt-get install -y nodejs"
    echo "3. Execute este script novamente: ./instalar_robo.sh"
    echo ""
    exit 1
fi

echo -e "${YELLOW}[1/4] Baixando bibliotecas necessárias (npm install)...${NC}"
npm install
echo ""

# 2. Verifica/Instala o PM2 globalmente
echo -e "${YELLOW}[2/4] Verificando gerenciador de processos em background (PM2)...${NC}"
if ! command -v pm2 &> /dev/null; then
    echo "Instalando PM2 globalmente (pode pedir senha de root)..."
    sudo npm install -g pm2
else
    echo "PM2 já está instalado."
fi
echo ""

# 3. Inicia o agente
echo -e "${YELLOW}[3/4] Iniciando o agente silenciosamente...${NC}"
# Se já houver um processo rodando, o restart ou start atualiza
pm2 start agent.js --name "ativos-agent"
echo ""

# 4. Configura inicialização automática com o sistema
echo -e "${YELLOW}[4/4] Configurando inicialização automática junto com o sistema...${NC}"
# Salva a lista de processos
pm2 save
# Gera e (tenta) rodar o comando de startup automaticamente
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
pm2 save
echo ""

echo -e "${GREEN}===================================================${NC}"
echo -e "${GREEN} Instalação Concluída com Sucesso! ${NC}"
echo -e "${GREEN} O agente já está rodando silenciosamente no fundo.${NC}"
echo ""
echo "Para ver os logs do agente, digite:"
echo "pm2 logs ativos-agent"
echo ""
echo "Para parar o agente, digite:"
echo "pm2 stop ativos-agent"
echo -e "${GREEN}===================================================${NC}"
