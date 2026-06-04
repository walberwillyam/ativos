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
