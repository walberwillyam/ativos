@echo off
chcp 65001 >nul 2>&1
title Instalacao do Agente Ativos Apoio
color 0A

:: =============================================================
:: Verifica se esta rodando como Administrador
:: =============================================================
net session >nul 2>&1
if %errorLevel% == 0 (
    goto :admin
) else (
    echo Solicitando privilegios de Administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:admin
cd /d "%~dp0"

echo.
echo ===================================================
echo     Instalacao do Robo - Ativos Apoio (Servico)
echo ===================================================
echo.
echo Diretorio: %cd%
echo.

:: =============================================================
:: PASSO 0: Verifica se o arquivo .env existe
:: =============================================================
if not exist ".env" (
    color 0C
    echo [ERRO CRITICO] Arquivo .env NAO encontrado!
    echo.
    echo O agente precisa de um arquivo .env nesta mesma pasta
    echo contendo as credenciais do Supabase e o UNIT_ID.
    echo.
    echo Renomeie o arquivo .env.exemplo para .env e preencha.
    echo.
    goto :falhou
)

echo [OK] Arquivo .env encontrado.

:: Verifica se SUPABASE_URL esta definido no .env
findstr /C:"SUPABASE_URL" .env >nul 2>&1
if %errorLevel% neq 0 (
    color 0C
    echo [ERRO] O .env nao contem SUPABASE_URL!
    goto :falhou
)
echo [OK] SUPABASE_URL configurado.

:: Verifica se SUPABASE_ANON_KEY esta definido no .env
findstr /C:"SUPABASE_ANON_KEY" .env >nul 2>&1
if %errorLevel% neq 0 (
    color 0C
    echo [ERRO] O .env nao contem SUPABASE_ANON_KEY!
    goto :falhou
)
echo [OK] SUPABASE_ANON_KEY configurado.
echo.

:: =============================================================
:: PASSO 1: Verifica se o Node.js esta instalado
:: =============================================================
echo Verificando Node.js...

where node >nul 2>&1
if %errorLevel% neq 0 (
    :: Tenta o caminho padrao do Node.js
    if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=C:\Program Files\nodejs;C:\Program Files\nodejs\node_modules\npm\bin;%PATH%"
        echo [AVISO] Node.js encontrado em caminho padrao, adicionado ao PATH.
    ) else (
        color 0C
        echo [ERRO CRITICO] Node.js NAO encontrado!
        echo.
        echo 1. Acesse https://nodejs.org/
        echo 2. Baixe a versao LTS
        echo 3. Instale e REINICIE o computador
        echo 4. Execute este instalador novamente.
        echo.
        goto :falhou
    )
)

for /f "tokens=*" %%v in ('node -v 2^>nul') do set NODE_VERSION=%%v
echo [OK] Node.js: %NODE_VERSION%

where npm >nul 2>&1
if %errorLevel% neq 0 (
    if exist "C:\Program Files\nodejs\npm.cmd" (
        set "PATH=C:\Program Files\nodejs;%PATH%"
    ) else (
        color 0C
        echo [ERRO] npm NAO encontrado! Reinstale o Node.js.
        goto :falhou
    )
)
echo [OK] npm encontrado.
echo.

:: =============================================================
:: PASSO 2: Instala as dependencias
:: =============================================================
echo [1/3] Baixando bibliotecas (npm install)...
echo      Isso pode demorar alguns minutos, aguarde...
echo.

call npm install --no-audit --no-fund
if %errorLevel% neq 0 (
    color 0C
    echo.
    echo [ERRO] npm install falhou!
    echo Verifique a conexao com a internet.
    echo.
    goto :falhou
)

echo.
echo [OK] Dependencias instaladas com sucesso!
echo.

:: =============================================================
:: PASSO 3: Remove servico antigo se existir
:: =============================================================
echo [2/3] Limpando instalacoes anteriores...
net stop "ativosapoio_agente_oficial.exe" >nul 2>&1
sc delete "ativosapoio_agente_oficial.exe" >nul 2>&1
net stop "AtivosApoio_Agente_Oficial" >nul 2>&1
sc delete "AtivosApoio_Agente_Oficial" >nul 2>&1
net stop "AtivosApoio_AgenteTI.exe" >nul 2>&1
sc delete "AtivosApoio_AgenteTI.exe" >nul 2>&1
net stop "AtivosApoio_AgenteTI" >nul 2>&1
sc delete "AtivosApoio_AgenteTI" >nul 2>&1

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

:: Espera o servico subir
echo Aguardando servico iniciar (10 segundos)...
timeout /t 10 /nobreak >nul

echo.
color 0A
echo ===================================================
echo    INSTALACAO FINALIZADA!
echo ===================================================
echo.
echo Verifique em services.msc se o servico
echo "AtivosApoio_Agente_Oficial" esta rodando.
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
