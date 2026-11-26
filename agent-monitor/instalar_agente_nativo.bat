@echo off
chcp 65001 >nul 2>&1
title Instalador do Agente Ativos Apoio
color 0A

:: Verifica permissão de Administrador e eleva se necessário
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Solicitando privilégios de Administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar_agente_nativo.ps1"
if %errorLevel% neq 0 (
    pause
)
