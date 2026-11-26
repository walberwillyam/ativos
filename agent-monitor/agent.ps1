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

$ScriptDir = if ($MyInvocation.MyCommand.Path) { Split-Path -Parent $MyInvocation.MyCommand.Path } else { (Get-Location).Path }

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
)

function Collect-And-Send-Telemetry {
    try {
        $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        Write-Host "[$timestamp] Coletando telemetria de $AssetId..." -ForegroundColor Cyan

        # 1. Coleta de hardware e SO
        $cs = Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue
        $os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
        $bios = Get-CimInstance Win32_BIOS -ErrorAction SilentlyContinue
        $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'" -ErrorAction SilentlyContinue

        # CPU Usage
        $cpuObj = Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Measure-Object -Property LoadPercentage -Average
        $cpuUsage = 0.0
        if ($cpuObj -and $cpuObj.Average -ne $null) {
            $cpuUsage = [math]::Round([double]$cpuObj.Average, 2)
        }

        # RAM
        $ramTotalBytes = [int64]0
        $ramUsedBytes = [int64]0
        if ($os) {
            $ramTotalBytes = [int64]$os.TotalVisibleMemorySize * 1024
            $ramFreeBytes = [int64]$os.FreePhysicalMemory * 1024
            $ramUsedBytes = [math]::Max([int64]0, ($ramTotalBytes - $ramFreeBytes))
        }

        # Disco
        $diskTotal = [int64]0
        $diskUsed = [int64]0
        if ($disk) {
            $diskTotal = [int64]$disk.Size
            $diskUsed = [math]::Max([int64]0, ($diskTotal - [int64]$disk.FreeSpace))
        }

        # Serial & Modelo
        $serialNumber = $null
        if ($bios -and $bios.SerialNumber -and $bios.SerialNumber -ne "Default string" -and $bios.SerialNumber -ne "-") {
            $serialNumber = $bios.SerialNumber.Trim()
        }
        $hardwareModel = ""
        if ($cs) {
            $manuf = if ($cs.Manufacturer -and $cs.Manufacturer -ne "Default string") { $cs.Manufacturer.Trim() } else { "" }
            $mod = if ($cs.Model -and $cs.Model -ne "Default string") { $cs.Model.Trim() } else { "" }
            $hardwareModel = "$manuf $mod".Trim()
        }

        $osDistro = if ($os) { $os.Caption.Trim() } else { "Microsoft Windows" }
        $osRelease = if ($os) { $os.Version.Trim() } else { "10.0" }
        $osInfo = "$osDistro $osRelease".Trim()

        $uptimeSeconds = [int64]0
        if ($os -and $os.LastBootUpTime) {
            $uptimeSeconds = [math]::Floor(((Get-Date) - $os.LastBootUpTime).TotalSeconds)
        }

        # 2. Product Key do Windows
        $productKey = $null
        try {
            $productKey = (Get-CimInstance -Query "SELECT OA3xOriginalProductKey FROM SoftwareLicensingService" -ErrorAction Stop).OA3xOriginalProductKey
            if ($productKey) { $productKey = $productKey.Trim() }
        } catch {}

        if (-not $productKey) {
            try {
                $regKey = (Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SoftwareProtectionPlatform' -Name BackupProductKeyDefault -ErrorAction SilentlyContinue).BackupProductKeyDefault
                if ($regKey) { $productKey = $regKey.Trim() }
            } catch {}
        }

        # 3. Consulta Ativo no Inventário para obter unidade real e especificações
        $assetData = $null
        try {
            $encAssetId = [System.Uri]::EscapeDataString($AssetId)
            $assetUrl = "$SupabaseUrl/rest/v1/assets?id=eq.${encAssetId}&select=id,name,unit,location,specifications,history"
            $assetResp = Invoke-RestMethod -Uri $assetUrl -Method Get -Headers $Headers -TimeoutSec 15
            if ($assetResp -and $assetResp.Count -gt 0) {
                $assetData = $assetResp[0]
            }
        } catch {
            Write-Warning "Não foi possível consultar cadastro do ativo: $($_.Exception.Message)"
        }

        # Resolução da unidade: Unidade cadastrada no inventário tem prioridade máxima
        $resolvedUnit = $UnitName
        if ($assetData -and $assetData.unit -and $assetData.unit -ne "UNKNOWN_UNIT" -and $assetData.unit -ne "Não definida") {
            $resolvedUnit = $assetData.unit
        } elseif ($UnitName -and $UnitName -ne "UNKNOWN_UNIT") {
            $resolvedUnit = $UnitName
        }

        # 4. Atualização de especificações do Ativo (Hardware & Chave de SO)
        $currentSpecs = @{}
        if ($assetData -and $assetData.specifications) {
            foreach ($prop in $assetData.specifications.PSObject.Properties) {
                $currentSpecs[$prop.Name] = $prop.Value
            }
        }
        $currentSpecs["Sistema Operacional"] = $osInfo
        $currentSpecs["hostname"] = $env:COMPUTERNAME

        # Baseline de Hardware
        $ramGB = [math]::Round($ramTotalBytes / 1GB)
        $diskGB = [math]::Round($diskTotal / 1GB)
        if (-not $currentSpecs.ContainsKey("hardware_baseline") -and $diskGB -gt 0) {
            $currentSpecs["hardware_baseline"] = @{ ramGB = $ramGB; diskGB = $diskGB }
        }

        # Vinculação da Chave de Licença de SO (1-para-1 estrito)
        if ($productKey) {
            $currentSpecs["os_product_key"] = $productKey

            if (-not ($GenericKeys -contains $productKey)) {
                try {
                    # Desvincula qualquer outra chave deste ativo
                    $encAssetId = [System.Uri]::EscapeDataString($AssetId)
                    $encKey = [System.Uri]::EscapeDataString($productKey)
                    $unlinkUrl = "$SupabaseUrl/rest/v1/os_licenses?asset_id=eq.${encAssetId}&product_key=neq.${encKey}"
                    $unlinkBody = @{ asset_id = $null } | ConvertTo-Json
                    Invoke-RestMethod -Uri $unlinkUrl -Method Patch -Headers $Headers -Body $unlinkBody -TimeoutSec 10 | Out-Null

                    # Checa se a chave já existe no catálogo
                    $licUrl = "$SupabaseUrl/rest/v1/os_licenses?product_key=eq.${encKey}&select=id,asset_id"
                    $licResp = Invoke-RestMethod -Uri $licUrl -Method Get -Headers $Headers -TimeoutSec 10
                    if ($licResp -and $licResp.Count -gt 0) {
                        $existingLic = $licResp[0]
                        if ($existingLic.asset_id -ne $AssetId) {
                            $updateLicUrl = "$SupabaseUrl/rest/v1/os_licenses?id=eq.$($existingLic.id)"
                            $updateLicBody = @{ asset_id = $AssetId } | ConvertTo-Json
                            Invoke-RestMethod -Uri $updateLicUrl -Method Patch -Headers $Headers -Body $updateLicBody -TimeoutSec 10 | Out-Null
                            Write-Host "✔ Chave do Windows $productKey vinculada com sucesso a $AssetId." -ForegroundColor Green
                        }
                    } else {
                        # Tenta inserir; se der conflito 409 de unicidade, faz PATCH
                        try {
                            $insertLicUrl = "$SupabaseUrl/rest/v1/os_licenses"
                            $insertLicBody = @{ product_key = $productKey; asset_id = $AssetId } | ConvertTo-Json
                            Invoke-RestMethod -Uri $insertLicUrl -Method Post -Headers $Headers -Body $insertLicBody -TimeoutSec 10 | Out-Null
                            Write-Host "✔ Nova chave $productKey registrada e vinculada com sucesso." -ForegroundColor Green
                        } catch {
                            $updateLicUrl = "$SupabaseUrl/rest/v1/os_licenses?product_key=eq.$productKey"
                            $updateLicBody = @{ asset_id = $AssetId } | ConvertTo-Json
                            Invoke-RestMethod -Uri $updateLicUrl -Method Patch -Headers $Headers -Body $updateLicBody -TimeoutSec 10 | Out-Null
                            Write-Host "✔ Chave $productKey atualizada com sucesso para $AssetId." -ForegroundColor Green
                        }
                    }
                } catch {
                    Write-Warning "Aviso ao vincular licença: $($_.Exception.Message)"
                }
            }
        }

        # Atualiza ou cria o ativo na tabela assets (Inventário)
        if ($assetData) {
            try {
                $assetUpdatePayload = @{ specifications = $currentSpecs }
                if ($serialNumber) { $assetUpdatePayload["serialNumber"] = $serialNumber }
                if ($hardwareModel -and $hardwareModel.Length -gt 2) { $assetUpdatePayload["model"] = $hardwareModel }
                if ((-not $assetData.unit -or $assetData.unit -eq "UNKNOWN_UNIT" -or $assetData.unit -eq "Não definida") -and ($resolvedUnit -and $resolvedUnit -ne "UNKNOWN_UNIT")) {
                    $assetUpdatePayload["unit"] = $resolvedUnit
                }

                $updateAssetUrl = "$SupabaseUrl/rest/v1/assets?id=eq.$AssetId"
                $updateAssetJson = $assetUpdatePayload | ConvertTo-Json -Depth 5
                Invoke-RestMethod -Uri $updateAssetUrl -Method Patch -Headers $Headers -Body $updateAssetJson -TimeoutSec 15 | Out-Null
            } catch {
                Write-Warning "Aviso ao atualizar ativo no inventário: $($_.Exception.Message)"
            }
        } else {
            # Se o ativo ainda não existia no Inventário, cria automaticamente
            try {
                $categoryName = if ($hardwareModel -match "Notebook|Laptop|Latitude|ThinkPad") { "Notebooks" } else { "Desktop" }
                $newAsset = @{
                    id              = $AssetId
                    patrimonio      = "AUTO-$($AssetId.Substring(0, [math]::Min(10, $AssetId.Length)))"
                    name            = "Computador - $AssetId"
                    category        = $categoryName
                    model           = if ($hardwareModel) { $hardwareModel } else { "PC / Desktop" }
                    serialNumber    = if ($serialNumber) { $serialNumber } else { "N/A" }
                    unit            = if ($resolvedUnit -and $resolvedUnit -ne "UNKNOWN_UNIT") { $resolvedUnit } else { "Não definida" }
                    location        = "Não definida"
                    status          = "Em Uso"
                    value           = 0
                    acquisitionDate = (Get-Date).ToString("yyyy-MM-dd")
                    specifications  = $currentSpecs
                    history         = @(
                        @{
                            id          = "hist-$([guid]::NewGuid().ToString().Substring(0,8))"
                            date        = (Get-Date).ToString("yyyy-MM-dd")
                            time        = (Get-Date).ToString("HH:mm")
                            type        = "creation"
                            title       = "Ativo Cadastrado Automaticamente pelo Robô"
                            description = "Equipamento detectado e registrado pelo agente de telemetria."
                            responsible = "Sistema (Robô)"
                        }
                    )
                }
                $insertAssetUrl = "$SupabaseUrl/rest/v1/assets"
                $insertAssetJson = $newAsset | ConvertTo-Json -Depth 5
                Invoke-RestMethod -Uri $insertAssetUrl -Method Post -Headers $Headers -Body $insertAssetJson -TimeoutSec 15 | Out-Null
                Write-Host "✔ Ativo $AssetId cadastrado com sucesso no Inventário de Ativos!" -ForegroundColor Green
            } catch {
                Write-Warning "Aviso ao registrar ativo no inventário: $($_.Exception.Message)"
            }
        }

        # 5. Envia Ping de Telemetria para devices_health (Upsert)
        $healthPayload = @{
            asset_id       = $AssetId
            unit_id        = $resolvedUnit
            cpu_usage      = $cpuUsage
            ram_total      = $ramTotalBytes
            ram_used       = $ramUsedBytes
            disk_total     = $diskTotal
            disk_used      = $diskUsed
            os_info        = $osInfo
            last_ping      = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            uptime_seconds = $uptimeSeconds
        }

        if ($assetData -and $assetData.name -and -not $assetData.name.StartsWith("Computador - ")) {
            $healthPayload["custom_name"] = $assetData.name
        }

        # Checa se o dispositivo já existe na tabela de telemetria
        $encAssetId = [System.Uri]::EscapeDataString($AssetId)
        $dhCheckUrl = "$SupabaseUrl/rest/v1/devices_health?asset_id=eq.${encAssetId}&select=id,unit_id,custom_name&limit=1"
        $dhExisting = Invoke-RestMethod -Uri $dhCheckUrl -Method Get -Headers $Headers -TimeoutSec 15

        if ($dhExisting -and $dhExisting.Count -gt 0) {
            # Faz UPDATE
            $updatePayload = @{
                cpu_usage      = $cpuUsage
                ram_total      = $ramTotalBytes
                ram_used       = $ramUsedBytes
                disk_total     = $diskTotal
                disk_used      = $diskUsed
                os_info        = $osInfo
                last_ping      = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                uptime_seconds = $uptimeSeconds
            }
            # Atualiza sempre a unidade caso tenhamos uma unidade definida
            if ($resolvedUnit -and $resolvedUnit -ne "UNKNOWN_UNIT") {
                $updatePayload["unit_id"] = $resolvedUnit
            }
            if ($healthPayload.ContainsKey("custom_name")) {
                $updatePayload["custom_name"] = $healthPayload["custom_name"]
            }

            $dhUpdateUrl = "$SupabaseUrl/rest/v1/devices_health?asset_id=eq.$AssetId"
            $dhUpdateJson = $updatePayload | ConvertTo-Json
            Invoke-RestMethod -Uri $dhUpdateUrl -Method Patch -Headers $Headers -Body $dhUpdateJson -TimeoutSec 15 | Out-Null
            Write-Host "✔ Ping de telemetria enviado com sucesso (UPDATE)! CPU: $cpuUsage%, RAM: $([math]::Round($ramUsedBytes/1GB, 1))/$([math]::Round($ramTotalBytes/1GB, 1))GB" -ForegroundColor Green
        } else {
            # Faz INSERT
            $dhInsertUrl = "$SupabaseUrl/rest/v1/devices_health"
            $dhInsertJson = @($healthPayload) | ConvertTo-Json
            Invoke-RestMethod -Uri $dhInsertUrl -Method Post -Headers $Headers -Body $dhInsertJson -TimeoutSec 15 | Out-Null
            Write-Host "✔ Novo ativo registrado na telemetria (INSERT)! Unidade: $resolvedUnit" -ForegroundColor Green
        }

    } catch {
        Write-Error "Erro ao enviar telemetria: $($_.Exception.Message)"
    }
}

# Execução
if ($Loop) {
    Write-Host "=== Agente Ativos Apoio em execução contínua ===" -ForegroundColor Green
    Write-Host "Máquina: $AssetId | Unidade: $UnitName" -ForegroundColor Cyan
    Write-Host "Enviando dados a cada 3 minutos (Pressione Ctrl+C para encerrar)."
    Write-Host ""
    while ($true) {
        Collect-And-Send-Telemetry
        Start-Sleep -Seconds 180
    }
} else {
    Collect-And-Send-Telemetry
}
