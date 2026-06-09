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
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~dpnx0\"\"' -Verb RunAs"
    exit /b
)

:admin
cd /d "%~dp0"

echo ===================================================
echo     Instalacao do Robo - Ativos Apoio (Servico)
echo ===================================================
echo.
echo Diretorio de trabalho: %cd%
echo.

:: =============================================================
:: PASSO 0: Verifica se o arquivo .env existe
:: =============================================================
if not exist ".env" (
    color 0C
    echo [ERRO CRITICO] Arquivo .env NAO encontrado!
    echo.
    echo O agente precisa de um arquivo .env nesta mesma pasta
    echo contendo as credenciais do Supabase e o UNIT_ID da unidade.
    echo.
    echo Crie o arquivo .env com o seguinte conteudo:
    echo.
    echo   SUPABASE_URL="https://SEU_PROJETO.supabase.co"
    echo   SUPABASE_ANON_KEY="SUA_CHAVE_AQUI"
    echo   UNIT_ID="ID_DA_UNIDADE"
    echo.
    echo Depois execute este instalador novamente.
    echo.
    goto :erro
)

echo [OK] Arquivo .env encontrado.

:: Verifica se SUPABASE_URL esta definido no .env
findstr /C:"SUPABASE_URL" .env >nul 2>&1
if %errorLevel% neq 0 (
    color 0C
    echo [ERRO] O arquivo .env nao contem a variavel SUPABASE_URL!
    echo Verifique o conteudo do .env e tente novamente.
    echo.
    goto :erro
)
echo [OK] SUPABASE_URL configurado.

:: Verifica se SUPABASE_ANON_KEY esta definido no .env
findstr /C:"SUPABASE_ANON_KEY" .env >nul 2>&1
if %errorLevel% neq 0 (
    color 0C
    echo [ERRO] O arquivo .env nao contem a variavel SUPABASE_ANON_KEY!
    echo Verifique o conteudo do .env e tente novamente.
    echo.
    goto :erro
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
        set "PATH=C:\Program Files\nodejs;%PATH%"
        echo [AVISO] Node.js encontrado em C:\Program Files\nodejs, adicionado ao PATH.
    ) else (
        color 0C
        echo [ERRO CRITICO] O Node.js nao foi encontrado neste computador!
        echo.
        echo O agente de monitoramento requer Node.js instalado.
        echo.
        echo PASSO A PASSO PARA CORRIGIR:
        echo 1. Acesse https://nodejs.org/
        echo 2. Baixe a versao "LTS" (Recomendada^)
        echo 3. Instale com as configuracoes padroes (Next, Next...^)
        echo 4. REINICIE o computador (para atualizar o PATH^)
        echo 5. Execute este arquivo (instalar_robo.bat^) novamente.
        echo.
        goto :erro
    )
)

for /f "tokens=*" %%v in ('node -v 2^>nul') do set NODE_VERSION=%%v
echo [OK] Node.js encontrado: %NODE_VERSION%
echo.

:: =============================================================
:: PASSO 2: Instala as dependencias (npm install)
:: =============================================================
echo [1/3] Baixando bibliotecas necessarias (npm install)...
echo.
call npm install --no-audit --no-fund 2>&1
if %errorLevel% neq 0 (
    color 0C
    echo.
    echo [ERRO] Falha ao instalar as dependencias (npm install).
    echo Verifique se a maquina tem acesso a internet.
    echo.
    goto :erro
)
echo.
echo [OK] Dependencias instaladas com sucesso.
echo.

:: =============================================================
:: PASSO 3: Remove servico antigo se existir (limpeza)
:: =============================================================
echo [2/3] Verificando instalacoes anteriores...
net stop "AtivosApoio_Agente_Oficial" >nul 2>&1
sc delete "AtivosApoio_Agente_Oficial" >nul 2>&1
:: Tambem limpa nomes antigos
net stop "AtivosApoio_AgenteTI" >nul 2>&1
sc delete "AtivosApoio_AgenteTI" >nul 2>&1

:: Remove a pasta daemon antiga para forcar recriacao limpa
if exist "daemon" (
    rmdir /s /q "daemon" >nul 2>&1
)
echo [OK] Limpeza concluida.
echo.

:: =============================================================
:: PASSO 4: Registra o servico no Windows
:: =============================================================
echo [3/3] Registrando o robo no Windows (Services.msc)...
echo.
node install_service.js
if %errorLevel% neq 0 (
    color 0C
    echo.
    echo [ERRO] Falha ao registrar o servico no Windows.
    echo Verifique se voce tem permissoes de Administrador.
    echo.
    goto :erro
)

:: Espera uns segundos para o servico subir
echo.
echo Aguardando servico iniciar...
timeout /t 5 /nobreak >nul

:: Verifica se o servico realmente esta rodando
sc query "ativosapoio_agente_oficial.exe" >nul 2>&1
if %errorLevel% == 0 (
    color 0A
    echo.
    echo ===================================================
    echo    INSTALACAO CONCLUIDA COM SUCESSO!
    echo ===================================================
    echo.
    echo O agente ja esta rodando silenciosamente.
    echo Voce pode verificar em: services.msc
    echo Procure por: AtivosApoio_Agente_Oficial
    echo.
    echo Pode fechar esta janela.
    echo ===================================================
) else (
    color 0E
    echo.
    echo ===================================================
    echo    INSTALACAO CONCLUIDA (VERIFIQUE O SERVICO)
    echo ===================================================
    echo.
    echo A instalacao foi executada, mas nao foi possivel
    echo confirmar se o servico esta rodando.
    echo.
    echo Verifique manualmente em: services.msc
    echo Procure por: AtivosApoio_Agente_Oficial
    echo.
    echo Se o servico nao estiver la, tente executar
    echo este instalador novamente como Administrador.
    echo ===================================================
)
echo.
pause
exit /b

:erro
echo.
echo ===================================================
echo    INSTALACAO ABORTADA - Corrija os erros acima.
echo ===================================================
echo.
pause
exit /b
