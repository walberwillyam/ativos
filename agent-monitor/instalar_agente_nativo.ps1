<#
===============================================================================
  INSTALADOR DO AGENTE NATIVO ATIVOS APOIO (POWERSHELL)
  Instalacao silenciosa em 1 clique via Agendador de Tarefas do Windows.
  Zero dependencias: nao requer Node.js, nao requer npm.
===============================================================================
#>

param(
    [string]$UnitName,
    [string]$SupabaseUrl = "https://vumfjjiirtwezulfhbmb.supabase.co",
    [string]$SupabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1bWZqamlpcnR3ZXp1bGZoYm1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDEwMTAsImV4cCI6MjA5NTkxNzAxMH0.miK3vGstWDJIk-63rCTKNXS0juLKWBIWQMibhUCVtR0"
)

# Se UnitName nao veio por parametro de linha de comando, busca das variaveis de ambiente
if (-not $UnitName -or $UnitName -eq "UNKNOWN_UNIT") {
    if ($env:TARGET_UNIT) { $UnitName = $env:TARGET_UNIT }
    elseif ($env:UNIT_ID) { $UnitName = $env:UNIT_ID }
}

# 1. Garante privilegios de Administrador
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) {
    Write-Host "Solicitando permissoes de Administrador..." -ForegroundColor Yellow
    if ($PSCommandPath) {
        $argsList = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
        if ($UnitName) { $argsList += " -UnitName `"$UnitName`"" }
        Start-Process powershell -Verb RunAs -ArgumentList $argsList
    } else {
        $remoteUrl = "https://raw.githubusercontent.com/walberwillyam/ativos/main/agent-monitor/instalar_agente_nativo.ps1"
        $cmd = "[Net.ServicePointManager]::SecurityProtocol = 3072; `$env:TARGET_UNIT='$UnitName'; iex (irm '$remoteUrl')"
        Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"$cmd`""
    }
    exit
}

Clear-Host
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       INSTALADOR DO AGENTE NATIVO - ATIVOS APOIO         " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Computador: $env:COMPUTERNAME" -ForegroundColor Gray
Write-Host ""

$ScriptDir = if ($MyInvocation.MyCommand.Path) { Split-Path -Parent $MyInvocation.MyCommand.Path } else { (Get-Location).Path }

# 2. Se a unidade nao foi informada, busca do Supabase e exibe menu interativo
if (-not $UnitName -or $UnitName -eq "UNKNOWN_UNIT") {
    Write-Host "Buscando filiais/unidades cadastradas no sistema..." -ForegroundColor Gray
    $UnitsList = @()
    try {
        $uHeaders = @{ "apikey" = $SupabaseKey; "Authorization" = "Bearer $SupabaseKey" }
        $uUrl = "$SupabaseUrl/rest/v1/units?select=id,name&order=name.asc"
        $UnitsList = Invoke-RestMethod -Uri $uUrl -Headers $uHeaders -TimeoutSec 10
    } catch {
        Write-Warning "Nao foi possivel carregar as unidades online."
    }

    if ($UnitsList -and $UnitsList.Count -gt 0) {
        Write-Host "Selecione a Unidade onde este computador esta localizado:" -ForegroundColor Yellow
        Write-Host ""
        for ($i = 0; $i -lt $UnitsList.Count; $i++) {
            $num = $i + 1
            Write-Host "  [$num] $($UnitsList[$i].name)" -ForegroundColor White
        }
        Write-Host "  [0] Digitar nome da unidade manualmente" -ForegroundColor DarkGray
        Write-Host ""
        
        $choice = Read-Host "Digite o numero da unidade correspondente"
        $choiceNum = [int]$choice
        if ($choiceNum -ge 1 -and $choiceNum -le $UnitsList.Count) {
            $UnitName = $UnitsList[$choiceNum - 1].name
        } elseif ($choiceNum -eq 0) {
            $UnitName = Read-Host "Digite o nome da unidade"
        }
    } else {
        $UnitName = Read-Host "Digite o nome da Unidade deste computador (Ex: Rota 365)"
    }
}

if (-not $UnitName) {
    $UnitName = "UNKNOWN_UNIT"
}

Write-Host ""
Write-Host "[OK] Unidade definida: $UnitName" -ForegroundColor Green
Write-Host ""

# 3. Preparar diretorio padrao de instalacao em C:\AtivosApoio
$InstallDir = "C:\AtivosApoio"
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Copia ou baixa o agent.ps1
$SourceAgent = Join-Path $ScriptDir "agent.ps1"
$TargetAgent = Join-Path $InstallDir "agent.ps1"

if ($PSCommandPath -and (Test-Path $SourceAgent)) {
    Copy-Item -Path $SourceAgent -Destination $TargetAgent -Force
} else {
    # Se rodando via comando direto da internet (iex), baixa sempre a versao mais recente do GitHub
    Write-Host "Baixando script do agente..." -ForegroundColor Gray
    $agentUrl = "https://raw.githubusercontent.com/walberwillyam/ativos/main/agent-monitor/agent.ps1?v=$((Get-Date).Ticks)"
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $agentUrl -Headers @{"Cache-Control"="no-cache"} -OutFile $TargetAgent -UseBasicParsing -TimeoutSec 15
    } catch {
        Write-Error "Falha ao obter agent.ps1: $($_.Exception.Message)"
    }
}

# Cria o arquivo .env fixo em C:\AtivosApoio
$EnvContent = @"
SUPABASE_URL="$SupabaseUrl"
SUPABASE_ANON_KEY="$SupabaseKey"
UNIT_ID="$UnitName"
ASSET_ID="$env:COMPUTERNAME"
"@
Set-Content -Path (Join-Path $InstallDir ".env") -Value $EnvContent -Encoding UTF8

# Cria script VBS launcher para rodar 100% invisivel sem piscar janela preta
$VbsLauncher = Join-Path $InstallDir "run_agent_hidden.vbs"
$VbsContent = @"
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""$TargetAgent""", 0, False
"@
Set-Content -Path $VbsLauncher -Value $VbsContent -Encoding ASCII

# 4. Remove tarefa agendada anterior se existir
schtasks /delete /tn "AtivosApoio_Agente" /f 2>$null | Out-Null
schtasks /delete /tn "AtivosApoio_Telemetria" /f 2>$null | Out-Null

# 5. Registra Tarefa Agendada no Windows (Roda a cada 3 minutos, como SYSTEM)
Write-Host "Configurando tarefa agendada em segundo plano..." -ForegroundColor Cyan

# Dispara o VBScript que roda o PowerShell invisivel
$TaskCmd = "wscript.exe `"$VbsLauncher`""

$res = schtasks /create /tn "AtivosApoio_Agente" /tr "$TaskCmd" /sc minute /mo 3 /ru "SYSTEM" /f 2>&1
if ($LASTEXITCODE -ne 0) {
    # Fallback para usuario atual caso SYSTEM tenha restricao de politica local
    schtasks /create /tn "AtivosApoio_Agente" /tr "$TaskCmd" /sc minute /mo 3 /f 2>&1 | Out-Null
}

# 6. Executa o primeiro ping imediatamente para confirmar
Write-Host ""
Write-Host "Enviando primeiro ping de telemetria..." -ForegroundColor Yellow
try {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $TargetAgent -UnitName "$UnitName"
} catch {
    Write-Warning "Aviso na primeira execucao: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "           INSTALACAO CONCLUIDA COM SUCESSO!              " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  [OK] Maquina: $env:COMPUTERNAME" -ForegroundColor White
Write-Host "  [OK] Unidade: $UnitName" -ForegroundColor White
Write-Host "  [OK] Pasta:   $InstallDir" -ForegroundColor White
Write-Host "  [OK] Frequencia: Pings a cada 3 minutos (100% invisivel)" -ForegroundColor White
Write-Host ""
Write-Host "O robo ja esta ativo e transmitindo para o painel." -ForegroundColor Cyan
Write-Host "Pode fechar esta janela." -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""

Start-Sleep -Seconds 5
