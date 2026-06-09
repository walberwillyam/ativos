@echo off
chcp 65001 >nul 2>&1
title Desinstalacao do Agente Ativos Apoio
color 0C

:: Verifica se esta rodando como Administrador
net session >nul 2>&1
if %errorLevel% == 0 (
    goto :admin
) else (
    echo Solicitando privilegios de Administrador...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~dpnx0\"\"' -Verb RunAs"
    exit /b
)

:admin
cd /d "%~dp0"

echo ===================================================
echo     Desinstalacao do Robo - Ativos Apoio
echo ===================================================
echo.
echo Parando servicos...

:: Para e remove todos os nomes de servico possiveis
net stop "ativosapoio_agente_oficial.exe" >nul 2>&1
net stop "AtivosApoio_Agente_Oficial" >nul 2>&1
net stop "AtivosApoio_AgenteTI.exe" >nul 2>&1
net stop "AtivosApoio_AgenteTI" >nul 2>&1

echo Removendo servicos do Windows...
sc delete "ativosapoio_agente_oficial.exe" >nul 2>&1
sc delete "AtivosApoio_Agente_Oficial" >nul 2>&1
sc delete "AtivosApoio_AgenteTI" >nul 2>&1

:: Remove a pasta daemon
if exist "daemon" (
    rmdir /s /q "daemon" >nul 2>&1
    echo Pasta daemon removida.
)

echo.
echo ===================================================
echo Servico removido com sucesso! O robo parou de rodar.
echo Agora voce pode excluir o registro no painel NOC e
echo ele nao voltara mais.
echo ===================================================
pause
exit /b
