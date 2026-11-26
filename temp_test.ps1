<#
===============================================================================
  ATIVOS APOIO - AGENTE DE TELEMETRIA NATIVO WINDOWS (POWERSHELL)
  Zero dependências: não precisa de Node.js, npm ou bibliotecas externas.
  Roda em qualquer Windows 10, Windows 11 ou Windows Server.
===============================================================================
#>

param(
    [string]$SupabaseUrl,
    [string]$SupabaseKey,
    [string]$UnitName,
    [string]$AssetId,
    [switch]$Loop
)

# Forçar TLS 1.2 para conexões HTTPS com o Supabase
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ScriptDir) { $ScriptDir = (Get-Location).Path }

# Carregar variáveis de .env se não passadas por parâmetro
$EnvFile = Join-Path $ScriptDir ".env"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $k = $parts[0].Trim()
            $v = $parts[1].Trim().Trim('"').Trim("'")
            if (-not [string]::IsNullOrEmpty($k)) {
                if ($k -eq "SUPABASE_URL" -or $k -eq "VITE_SUPABASE_URL") { if (-not $SupabaseUrl) { $SupabaseUrl = $v } }
                elseif ($k -eq "SUPABASE_ANON_KEY" -or $k -eq "VITE_SUPABASE_ANON_KEY") { if (-not $SupabaseKey) { $SupabaseKey = $v } }
                elseif ($k -eq "UNIT_ID") { if (-not $UnitName) { $UnitName = $v } }
                elseif ($k -eq "ASSET_ID") { if (-not $AssetId) { $AssetId = $v } }
            }
        }
    }
}

# Credenciais de contingência caso não especificadas
if (-not $SupabaseUrl) { $SupabaseUrl = "https://vumfjjiirtwezulfhbmb.supabase.co" }
if (-not $SupabaseKey) { $SupabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1bWZqamlpcnR3ZXp1bGZoYm1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDEwMTAsImV4cCI6MjA5NTkxNzAxMH0.miK3vGstWDJIk-63rCTKNXS0juLKWBIWQMibhUCVtR0" }

if (-not $AssetId) {
    # Persistência de ASSET_ID para não perder o vínculo caso o hostname mude
    $IdFile = Join-Path $ScriptDir "agent-id.json"
    if (Test-Path $IdFile) {
        try {
            $idObj = Get-Content $IdFile -Raw | ConvertFrom-Json
            if ($idObj.asset_id) { $AssetId = $idObj.asset_id }
        } catch {}
    }
    if (-not $AssetId) {
        $AssetId = $env:COMPUTERNAME
        try {
            @{ asset_id = $AssetId } | ConvertTo-Json | Set-Content $IdFile -Encoding UTF8
        } catch {}
    }
}

if (-not $UnitName -or $UnitName -eq "UNKNOWN_UNIT") {
    $UnitName = "UNKNOWN_UNIT"
}

$Headers = @{
    "apikey"        = $SupabaseKey
    "Authorization" = "Bearer $SupabaseKey"
    "Content-Type"  = "application/json"
    "Prefer"        = "return=representation"
}

# Lista de chaves genéricas de ativação KMS / Setup padrão do Windows
$GenericKeys = @(
    "VK7JG-NPHTM-C97JM-9MPGT-3V66T",
    "TX9XD-98N7V-6WMQ6-BX7FG-H8Q99",
    "W269N-WFGWX-YVC9B-4J6C9-T83GX",
    "NPPR9-FWDCX-D2C8J-H872K-2YT43",
    "DPH2V-TTNVB-4X9Q3-TJR4H-KHJW4"