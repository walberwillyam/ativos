@echo off
title Instalacao do Agente Ativos Apoio
color 0A

:: Verifica se esta rodando como Administrador
net session >nul 2>&1
if %errorLevel% == 0 (
    goto :admin
) else (
    echo Solicitando privilegios de Administrador...
    powershell -Command "Start-Process '%~dpnx0' -Verb RunAs"
    exit /b
)

:admin
cd /d "%~dp0"

echo ===================================================
echo     Instalacao do Robo - Ativos Apoio (Servico)
echo ===================================================
echo.

:: Verifica se o Node.js esta instalado
node -v >nul 2>&1
if %errorLevel% neq 0 (
    color 0C
    echo [ERRO CRITICO] O Node.js nao foi encontrado neste computador!
    echo.
    echo O agente de monitoramento (robo) e escrito em Node.js e requer 
    echo que ele esteja instalado na maquina do usuario.
    echo.
    echo PASSO A PASSO PARA CORRIGIR:
    echo 1. Acesse https://nodejs.org/
    echo 2. Baixe a versao "LTS" (Recomendada)
    echo 3. Instale com as configuracoes padroes (Next, Next...)
    echo 4. Feche esta janela e execute este arquivo (instalar_robo.bat) novamente.
    echo.
    pause
    exit /b
)

echo [1/2] Baixando bibliotecas necessarias (npm install)...
call npm install
echo.

echo [2/2] Registrando o robo no Windows (Services.msc)...
node install_service.js
echo.

echo ===================================================
echo Instalacao Concluida com Sucesso! 
echo O agente ja esta rodando silenciosamente no fundo.
echo.
echo Pode fechar esta janela.
echo ===================================================
pause
