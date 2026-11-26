@echo off
chcp 65001 >nul 2>&1
title Desinstalar Agente Ativos Apoio
color 0C

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Solicitando privilégios de Administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo Removendo tarefa agendada do Windows...
schtasks /delete /tn "AtivosApoio_Agente" /f >nul 2>&1
schtasks /delete /tn "AtivosApoio_Telemetria" /f >nul 2>&1

echo Removendo arquivos em C:\AtivosApoio...
if exist "C:\AtivosApoio" (
    rmdir /s /q "C:\AtivosApoio" >nul 2>&1
)

echo.
echo ==========================================================
echo        AGENTE REMOVIDO COM SUCESSO!
echo ==========================================================
echo.
pause
