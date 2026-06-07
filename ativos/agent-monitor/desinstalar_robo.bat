@echo off
title Desinstalacao do Agente Ativos Apoio
color 0C

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
echo     Desinstalacao do Robo - Ativos Apoio
echo ===================================================
echo.
echo Parando o servico...
net stop AtivosApoio_AgenteTI.exe >nul 2>&1
net stop AtivosApoio_AgenteTI >nul 2>&1

echo.
echo Removendo o servico do Windows...
sc delete AtivosApoio_AgenteTI >nul 2>&1

echo.
echo ===================================================
echo Servico removido com sucesso! O robo parou de rodar.
echo Agora voce pode excluir o registro no painel NOC e
echo ele nao voltara mais.
echo ===================================================
pause
exit /b
