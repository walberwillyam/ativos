@echo off
chcp 65001 >nul 2>&1
title Instalacao do Agente Ativos Apoio (Node.js)
color 0A

:: =============================================================
:: Verifica se esta rodando como Administrador
:: =============================================================
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Solicitando privilegios de Administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"

echo.
echo ===================================================
echo     Instalacao do Robo - Ativos Apoio (Servico)
echo ===================================================
echo.
echo Diretorio: %cd%
echo.

:: =============================================================
:: PASSO 0: Configuracao do arquivo .env e Unidade
:: =============================================================
if not exist ".env" (
    echo [AVISO] Arquivo .env nao encontrado. Criando automaticamente...
    (
        echo SUPABASE_URL="https://vumfjjiirtwezulfhbmb.supabase.co"
        echo SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1bWZqamlpcnR3ZXp1bGZoYm1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDEwMTAsImV4cCI6MjA5NTkxNzAxMH0.miK3vGstWDJIk-63rCTKNXS0juLKWBIWQMibhUCVtR0"
        echo UNIT_ID=""
    ) > .env
)

:: Verifica se a unidade esta preenchida no .env
findstr /C:"UNIT_ID=\"\"" .env >nul 2>&1
if %errorLevel% == 0 goto :pedir_unidade
findstr /C:"UNIT_ID=" .env >nul 2>&1
if %errorLevel% neq 0 goto :pedir_unidade
goto :env_ok

:pedir_unidade
echo ===================================================
echo     SELECAO DE UNIDADE / FILIAL
echo ===================================================
echo.
echo [1] Rota 365
echo [2] Posto Esplanada
echo [3] Posto Clip
echo [4] Central
echo [5] Parceirao
echo [6] Loja Parceirao
echo [7] Posto Parceirao
echo [8] Posto Penaforte 01
echo [9] Posto Penaforte 02
echo [10] Posto Sidney
echo [11] Posto 080
echo [12] Posto Planaltina
echo [13] Terminal - Posto
echo [0] Digitar nome da unidade manualmente
echo.
set /p opt="Digite o numero da unidade deste computador: "

set "SEL_UNIT=UNKNOWN_UNIT"
if "%opt%"=="1" set "SEL_UNIT=Rota 365"
if "%opt%"=="2" set "SEL_UNIT=Posto Esplanada"
if "%opt%"=="3" set "SEL_UNIT=Posto Clip"
if "%opt%"=="4" set "SEL_UNIT=Central"
if "%opt%"=="5" set "SEL_UNIT=Parceirão"
if "%opt%"=="6" set "SEL_UNIT=Loja Parceirão"
if "%opt%"=="7" set "SEL_UNIT=Posto Parceirão"
if "%opt%"=="8" set "SEL_UNIT=Posto Penaforte 01"
if "%opt%"=="9" set "SEL_UNIT=Posto Penaforte 02"
if "%opt%"=="10" set "SEL_UNIT=Posto Sidney"
if "%opt%"=="11" set "SEL_UNIT=Posto 080"
if "%opt%"=="12" set "SEL_UNIT=Posto Planaltina"
if "%opt%"=="13" set "SEL_UNIT=Terminal - Posto"
if "%opt%"=="0" (
    set /p SEL_UNIT="Digite o nome exato da unidade: "
)

:: Atualiza o .env com a unidade selecionada
powershell -Command "(Get-Content .env) -replace 'UNIT_ID=.*', ('UNIT_ID=\"' + $env:SEL_UNIT + '\"') | Set-Content .env"
echo.
echo [OK] Unidade configurada como: %SEL_UNIT%
echo.

:env_ok
echo [OK] Configuracoes do .env prontas.
echo.

:: =============================================================
:: PASSO 1: Verifica se o Node.js esta instalado
:: =============================================================
echo Verificando Node.js...

where node >nul 2>&1
if %errorLevel% neq 0 (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=C:\Program Files\nodejs;C:\Program Files\nodejs\node_modules\npm\bin;%PATH%"
        echo [AVISO] Node.js encontrado em caminho padrao, adicionado ao PATH.
    ) else (
        color 0E
        echo.
        echo [AVISO] Node.js nao esta instalado nesta maquina.
        echo.
        echo Deseja usar o Instalador Nativo (Sem Node.js, mais rapido e leve)?
        echo [1] Sim, usar Agente Nativo em PowerShell (Recomendado)
        echo [2] Baixar e instalar Node.js automaticamente agora
        echo.
        set /p no_node_choice="Escolha uma opcao (1 ou 2): "
        if "%no_node_choice%"=="1" (
            call "%~dp0instalar_agente_nativo.bat"
            exit /b
        )
        echo.
        echo Baixando e instalando Node.js LTS silenciosamente...
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' -OutFile '%temp%\nodejs.msi'; Start-Process msiexec.exe -ArgumentList '/i', ('""' + '%temp%\nodejs.msi' + '""'), '/qn' -Wait"
        set "PATH=C:\Program Files\nodejs;C:\Program Files\nodejs\node_modules\npm\bin;%PATH%"
    )
)

where node >nul 2>&1
if %errorLevel% neq 0 (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=C:\Program Files\nodejs;%PATH%"
    ) else (
        echo [AVISO] Reiniciando com o Instalador Nativo...
        call "%~dp0instalar_agente_nativo.bat"
        exit /b
    )
)

for /f "tokens=*" %%v in ('node -v 2^>nul') do set NODE_VERSION=%%v
echo [OK] Node.js: %NODE_VERSION%

where npm >nul 2>&1
if %errorLevel% neq 0 (
    if exist "C:\Program Files\nodejs\npm.cmd" (
        set "PATH=C:\Program Files\nodejs;%PATH%"
    )
)
echo [OK] npm encontrado.
echo.

:: =============================================================
:: PASSO 2: Instala as dependencias
:: =============================================================
echo [1/3] Verificando bibliotecas (npm install)...
call npm install --no-audit --no-fund
if %errorLevel% neq 0 (
    color 0C
    echo [ERRO] npm install falhou. Verifique sua conexao.
    goto :falhou
)

echo [OK] Dependencias instaladas com sucesso!
echo.

:: =============================================================
:: PASSO 3: Remove servico antigo se existir
:: =============================================================
echo [2/3] Limpando servicos anteriores...
net stop "AtivosApoio_Agente_Oficial" >nul 2>&1
sc delete "AtivosApoio_Agente_Oficial" >nul 2>&1
if exist "daemon" (
    rmdir /s /q "daemon" >nul 2>&1
)
echo [OK] Limpeza concluida.
echo.

:: =============================================================
:: PASSO 4: Registra o servico no Windows
:: =============================================================
echo [3/3] Registrando servico no Windows...
echo.
node install_service.js
echo.

echo Aguardando servico iniciar (10 segundos)...
timeout /t 10 /nobreak >nul

echo.
color 0A
echo ===================================================
echo    INSTALACAO FINALIZADA COM SUCESSO!
echo ===================================================
echo.
echo O servico AtivosApoio_Agente_Oficial esta ativo.
echo Os dados ja estao sendo transmitidos para o painel.
echo.
echo Pode fechar esta janela.
echo ===================================================
echo.
pause
exit /b

:falhou
echo.
echo ===================================================
echo    INSTALACAO ABORTADA - Corrija os erros acima.
echo ===================================================
echo.
pause
exit /b