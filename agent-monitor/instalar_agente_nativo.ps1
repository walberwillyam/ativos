<#
===============================================================================
  INSTALADOR DO AGENTE NATIVO ATIVOS APOIO (POWERSHELL)
  Instalação silenciosa em 1 clique via Agendador de Tarefas do Windows.
  Zero dependências: não requer Node.js, não requer npm.
===============================================================================
#>

param(
    [string]$UnitName,
    [string]$SupabaseUrl = "https://vumfjjiirtwezulfhbmb.supabase.co",
    [string]$SupabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1bWZqamlpcnR3ZXp1bGZoYm1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDEwMTAsImV4cCI6MjA5NTkxNzAxMH0.miK3vGstWDJIk-63rCTKNXS0juLKWBIWQMibhUCVtR0"
)

# 1. Garante privilégios de Administrador
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) {
    Write-Host "Solicitando permissões de Administrador..." -ForegroundColor Yellow
    $argsList = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    if ($UnitName) { $argsList += " -UnitName `"$UnitName`"" }
    Start-Process powershell -Verb RunAs -ArgumentList $argsList
    exit
}

Clear-Host
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       INSTALADOR DO AGENTE NATIVO - ATIVOS APOIO         " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Computador: $env:COMPUTERNAME" -ForegroundColor Gray
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ScriptDir) { $ScriptDir = (Get-Location).Path }

# 2. Se a unidade não foi informada, busca do Supabase e exibe menu interativo
if (-not $UnitName -or $UnitName -eq "UNKNOWN_UNIT") {
    Write-Host "Buscando filiais/unidades cadastradas no sistema..." -ForegroundColor Gray
    $UnitsList = @()
    try {
        $uHeaders = @{ "apikey" = $SupabaseKey; "Authorization" = "Bearer $SupabaseKey" }
        $uUrl = "$SupabaseUrl/rest/v1/units?select=id,name&order=name.asc"
        $UnitsList = Invoke-RestMethod -Uri $uUrl -Headers $uHeaders -TimeoutSec 10
    } catch {
        Write-Warning "Não foi possível carregar as unidades online."
    }

    if ($UnitsList -and $UnitsList.Count -gt 0) {
        Write-Host "Selecione a Unidade onde este computador está localizado:" -ForegroundColor Yellow
        Write-Host ""
        for ($i = 0; $i -lt $UnitsList.Count; $i++) {
            $num = $i + 1
            Write-Host "  [$num] $($UnitsList[$i].name)" -ForegroundColor White
        }
        Write-Host "  [0] Digitar nome da unidade manualmente" -ForegroundColor DarkGray
        Write-Host ""
        
        $choice = Read-Host "Digite o número da unidade correspondente"
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
Write-Host "✔ Unidade definida: $UnitName" -ForegroundColor Green
Write-Host ""

# 3. Preparar diretório padrão de instalação em C:\AtivosApoio
$InstallDir = "C:\AtivosApoio"
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Copia ou baixa o agent.ps1
$SourceAgent = Join-Path $ScriptDir "agent.ps1"
$TargetAgent = Join-Path $InstallDir "agent.ps1"

if (Test-Path $SourceAgent) {
    Copy-Item -Path $SourceAgent -Destination $TargetAgent -Force
} else {
    # Fallback: se rodando via comando direto, cria o agent.ps1 no destino
    Write-Host "Baixando script do agente..." -ForegroundColor Gray
    $agentUrl = "https://raw.githubusercontent.com/walberwillyam/ativos/main/agent-monitor/agent.ps1"
    try {
        Invoke-WebRequest -Uri $agentUrl -OutFile $TargetAgent -TimeoutSec 15
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

# Cria script VBS launcher para rodar 100% invisível sem piscar janela preta
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

# Dispara o VBScript que roda o PowerShell invisível
$TaskCmd = "wscript.exe `"$VbsLauncher`""

$res = schtasks /create /tn "AtivosApoio_Agente" /tr "$TaskCmd" /sc minute /mo 3 /ru "SYSTEM" /f 2>&1
if ($LASTEXITCODE -ne 0) {
    # Fallback para usuário atual caso SYSTEM tenha restrição de política local
    schtasks /create /tn "AtivosApoio_Agente" /tr "$TaskCmd" /sc minute /mo 3 /f 2>&1 | Out-Null
}

# 6. Executa o primeiro ping imediatamente para confirmar
Write-Host ""
Write-Host "Enviando primeiro ping de telemetria..." -ForegroundColor Yellow
try {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $TargetAgent -UnitName "$UnitName"
} catch {
    Write-Warning "Aviso na primeira execução: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "           INSTALAÇÃO CONCLUÍDA COM SUCESSO!              " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  ✔ Máquina: $env:COMPUTERNAME" -ForegroundColor White
Write-Host "  ✔ Unidade: $UnitName" -ForegroundColor White
Write-Host "  ✔ Pasta:   $InstallDir" -ForegroundColor White
Write-Host "  ✔ Frequência: Pings a cada 3 minutos (100% invisível)" -ForegroundColor White
Write-Host ""
Write-Host "O robô já está ativo e transmitindo para o painel." -ForegroundColor Cyan
Write-Host "Pode fechar esta janela." -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""

Start-Sleep -Seconds 5
