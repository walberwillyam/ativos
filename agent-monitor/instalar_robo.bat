@echo off
title Instalacao do Agente Ativos Apoio
color 0A

echo ===================================================
echo     Instalacao do Robo - Ativos Apoio (Servico)
echo ===================================================
echo.

:: Garante que o terminal está rodando no mesmo diretório do arquivo .bat
cd /d "%~dp0"

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
