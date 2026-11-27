<#
===============================================================================
  ATIVOS APOIO - AGENTE DE TELEMETRIA NATIVO WINDOWS (POWERSHELL)
  Zero dependencias: nao precisa de Node.js, npm ou bibliotecas externas.
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

# Forcar TLS 1.2 para conexoes HTTPS com o Supabase
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$ScriptDir = if ($MyInvocation.MyCommand.Path) { Split-Path -Parent $MyInvocation.MyCommand.Path } else { (Get-Location).Path }

# Carregar variaveis de .env se nao passadas por parametro
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

# Credenciais de contingencia caso nao especificadas
if (-not $SupabaseUrl) { $SupabaseUrl = "https://vumfjjiirtwezulfhbmb.supabase.co" }
if (-not $SupabaseKey) { $SupabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1bWZqamlpcnR3ZXp1bGZoYm1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDEwMTAsImV4cCI6MjA5NTkxNzAxMH0.miK3vGstWDJIk-63rCTKNXS0juLKWBIWQMibhUCVtR0" }

if (-not $AssetId) {
    # Persistencia de ASSET_ID para nao perder o vinculo caso o hostname mude
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

# Headers para operacoes de escrita (INSERT/PATCH/DELETE)
# "return=minimal" evita o SELECT pos-escrita que falha com RLS no modo anon
$WriteHeaders = @{
    "apikey"        = $SupabaseKey
    "Authorization" = "Bearer $SupabaseKey"
    "Content-Type"  = "application/json"
    "Prefer"        = "return=minimal"
}

# Lista de chaves genericas de ativacao KMS / Setup padrao do Windows
$GenericKeys = @(
    "YC7N8-G7WR6-9WR4H-6Y2W4-KBT6X",
    "VK7JG-NPHTM-C97JM-9MPGT-3V66T",
    "W269N-WFGWX-YVC9B-4J6C9-T83GX",
    "TX9XD-98N7V-6WMQ6-BX7FG-H8Q99",
    "YTMG3-N6DKC-DKB77-7M9GH-8HVX7",
    "NPPR9-FWDCX-D2C8J-H872K-2YT43",
    "DPH2V-TTNVB-4X9Q3-TJR4H-KHJW4",
    "2B87N-8KFHP-MTV6R-58WYF-36357",
    "NRG8B-VKK3Q-CXVCJ-9G2XF-6Q84J",
    "MH37W-N47XK-V7XM9-C7227-GCQG9",
    "QFFDN-GRT3P-VKWWX-X7T3R-8B639",
    "NW6C2-QMPVW-D7KKK-3GKT6-VCFB2"
)

# Chaves parciais (ultimos 5 digitos) associadas a canais genericos / KMS
$GenericPartials = @("T83GX", "3V66T", "H8Q99", "8HVX7", "2YT43", "KHJW4", "36357", "6Q84J", "GCQG9", "8B639", "VCFB2", "KBT6X")

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

        # 2. Informacoes de Licenciamento do Windows
        $productKey = $null
        $partialKey = $null
        $licChannel = ""
        $isActivated = $false

        # Consulta o status da ativacao no servico de licenciamento oficial do Windows
        try {
            $slp = Get-CimInstance SoftwareLicensingProduct -Filter "ApplicationID='55c92734-d682-4d71-983e-d6ec3f16059f' and PartialProductKey is not null" -ErrorAction SilentlyContinue | Where-Object { $_.LicenseStatus -eq 1 } | Select-Object -First 1
            if ($slp) {
                $partialKey = $slp.PartialProductKey
                $isActivated = $true
                if ($slp.Description -match "VOLUME_KMS|VOLUME_KMSCLIENT") { $licChannel = "Volume KMS" }
                elseif ($slp.Description -match "VOLUME_MAK") { $licChannel = "Volume MAK" }
                elseif ($slp.Description -match "OEM") { $licChannel = "OEM" }
                elseif ($slp.Description -match "RETAIL") { $licChannel = "Retail" }
                else { $licChannel = "Digital" }
            }
        } catch {}

        # Metodo 1: OA3 (chave original gravada de fabrica na BIOS/UEFI - exclusiva por placa-mae)
        try {
            $oa3Key = (Get-CimInstance -Query "SELECT OA3xOriginalProductKey FROM SoftwareLicensingService" -ErrorAction Stop).OA3xOriginalProductKey
            if ($oa3Key -and $oa3Key.Trim() -ne '') {
                $candidate = $oa3Key.Trim()
                if (-not ($GenericKeys -contains $candidate)) {
                    $productKey = $candidate
                    Write-Host "[OK] Chave OEM autentica detectada na BIOS: $productKey" -ForegroundColor Green
                }
            }
        } catch {}

        # Metodo 2: Se temos chave parcial ativa e NAO e generica, verifica se bate com o catalogo os_licenses
        if (-not $productKey -and $partialKey -and -not ($GenericPartials -contains $partialKey)) {
            try {
                $encPartial = [System.Uri]::EscapeDataString($partialKey)
                $matchUrl = "$SupabaseUrl/rest/v1/os_licenses?product_key=like.*-${encPartial}&select=id,product_key"
                $matchResp = Invoke-RestMethod -Uri $matchUrl -Method Get -Headers $Headers -TimeoutSec 10
                if ($matchResp -and $matchResp.Count -gt 0) {
                    $productKey = $matchResp[0].product_key
                    Write-Host "[OK] Chave identificada no catalogo de licencas (final $partialKey): $productKey" -ForegroundColor Green
                }
            } catch {}
        }

        # Metodo 3: Registro (BackupProductKeyDefault) - APENAS se bater com a chave parcial ativa e NAO for generica
        if (-not $productKey) {
            try {
                $regKey = (Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SoftwareProtectionPlatform' -Name BackupProductKeyDefault -ErrorAction SilentlyContinue).BackupProductKeyDefault
                if ($regKey -and $regKey.Trim() -ne '') {
                    $cand = $regKey.Trim()
                    $candEnd = if ($cand.Length -ge 5) { $cand.Substring($cand.Length - 5) } else { "" }
                    if (-not ($GenericKeys -contains $cand) -and (-not $partialKey -or $candEnd -eq $partialKey)) {
                        $productKey = $cand
                        Write-Host "[OK] Chave valida recuperada do registro: $productKey" -ForegroundColor Cyan
                    }
                }
            } catch {}
        }

        # Metodo 4: Se o computador esta ativado via Volume KMS ou Licenca Digital sem chave fisica avulsa
        if (-not $productKey -and $isActivated -and $partialKey) {
            if ($partialKey -eq "T83GX" -or $licChannel -eq "Volume KMS") {
                $productKey = "Volume KMS (Final: $partialKey)"
            } elseif ($licChannel -eq "Volume MAK") {
                $productKey = "Volume MAK (Final: $partialKey)"
            } else {
                $productKey = "Licenca Digital (Final: $partialKey)"
            }
            Write-Host "[OK] Ativacao detectada: $productKey" -ForegroundColor Cyan
        }

        if (-not $productKey) {
            $productKey = "Nao identificada"
            Write-Host "Nenhuma chave ou ativacao do Windows recuperavel." -ForegroundColor DarkGray
        } else {
            Write-Host "Chave/Ativacao do Windows registrada: $productKey" -ForegroundColor Cyan
        }

        # 3. Consulta Ativo no Inventario para obter unidade real e especificacoes
        $assetData = $null
        try {
            $encAssetId = [System.Uri]::EscapeDataString($AssetId)
            $assetUrl = "$SupabaseUrl/rest/v1/assets?id=eq.${encAssetId}&select=id,name,unit,location,specifications,history"
            $assetResp = Invoke-RestMethod -Uri $assetUrl -Method Get -Headers $Headers -TimeoutSec 15
            if ($assetResp -and $assetResp.Count -gt 0) {
                $assetData = $assetResp[0]
            }
        } catch {
            Write-Warning "Nao foi possivel consultar cadastro do ativo: $($_.Exception.Message)"
        }

        # Resolucao da unidade: Unidade cadastrada no inventario tem prioridade maxima
        $resolvedUnit = $UnitName
        if ($assetData -and $assetData.unit -and $assetData.unit -ne "UNKNOWN_UNIT" -and $assetData.unit -ne "Nao definida") {
            $resolvedUnit = $assetData.unit
        } elseif ($UnitName -and $UnitName -ne "UNKNOWN_UNIT") {
            $resolvedUnit = $UnitName
        }

        # 4. Atualizacao de especificacoes do Ativo (Hardware & Chave de SO)
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

        # Registra a chave nas especificacoes locais (antes de salvar o ativo)
        if ($productKey) {
            $currentSpecs["os_product_key"] = $productKey
        }

        # Atualiza ou cria o ativo na tabela assets (Inventario) PRIMEIRO
        # IMPORTANTE: o ativo precisa existir antes de registrar a licenca (evita falha de FK)
        if ($assetData) {
            try {
                $assetUpdatePayload = @{ specifications = $currentSpecs }
                if ($serialNumber) { $assetUpdatePayload["serialNumber"] = $serialNumber }
                if ($hardwareModel -and $hardwareModel.Length -gt 2) { $assetUpdatePayload["model"] = $hardwareModel }
                if ((-not $assetData.unit -or $assetData.unit -eq "UNKNOWN_UNIT" -or $assetData.unit -eq "Nao definida") -and ($resolvedUnit -and $resolvedUnit -ne "UNKNOWN_UNIT")) {
                    $assetUpdatePayload["unit"] = $resolvedUnit
                }

                $encAssetId = [System.Uri]::EscapeDataString($AssetId)
                $updateAssetUrl = "$SupabaseUrl/rest/v1/assets?id=eq.${encAssetId}"
                $updateAssetJson = $assetUpdatePayload | ConvertTo-Json -Depth 5
                Invoke-RestMethod -Uri $updateAssetUrl -Method Patch -Headers $WriteHeaders -Body $updateAssetJson -TimeoutSec 15 | Out-Null
            } catch {
                Write-Warning "Aviso ao atualizar ativo no inventario: $($_.Exception.Message)"
            }
        } else {
            # Se o ativo ainda nao existia no Inventario, cria automaticamente
            try {
                $categoryName = if ($hardwareModel -match "Notebook|Laptop|Latitude|ThinkPad") { "Notebooks" } else { "Computadores" }
                $newAsset = @{
                    id              = $AssetId
                    patrimonio      = "AUTO-$($AssetId.Substring(0, [math]::Min(10, $AssetId.Length)))"
                    name            = "Computador - $AssetId"
                    category        = $categoryName
                    model           = if ($hardwareModel) { $hardwareModel } else { "PC / Desktop" }
                    serialNumber    = if ($serialNumber) { $serialNumber } else { "N/A" }
                    unit            = if ($resolvedUnit -and $resolvedUnit -ne "UNKNOWN_UNIT") { $resolvedUnit } else { "Nao definida" }
                    location        = "Nao definida"
                    currentFloor    = "office"
                    mapCoordinates  = @{ x = 50; y = 50 }
                    responsible     = @{ name = "Nao atribuido"; role = "Usuario"; initials = "NA" }
                    status          = "Em Uso"
                    value           = 0
                    acquisitionDate = (Get-Date).ToString("yyyy-MM-dd")
                    warrantyExpiry  = (Get-Date).AddYears(1).ToString("yyyy-MM-dd")
                    specifications  = $currentSpecs
                    history         = @(
                        @{
                            id          = "hist-$([guid]::NewGuid().ToString().Substring(0,8))"
                            date        = (Get-Date).ToString("yyyy-MM-dd")
                            time        = (Get-Date).ToString("HH:mm")
                            type        = "creation"
                            title       = "Ativo Cadastrado Automaticamente pelo Robo"
                            description = "Equipamento detectado e registrado pelo agente de telemetria."
                            responsible = "Sistema (Robo)"
                        }
                    )
                    imageUrl        = ""
                }
                $insertAssetUrl = "$SupabaseUrl/rest/v1/assets"
                $insertAssetJson = $newAsset | ConvertTo-Json -Depth 5
                Invoke-RestMethod -Uri $insertAssetUrl -Method Post -Headers $WriteHeaders -Body $insertAssetJson -TimeoutSec 15 | Out-Null
                Write-Host "[OK] Ativo $AssetId cadastrado com sucesso no Inventario de Ativos!" -ForegroundColor Green
            } catch {
                Write-Warning "Aviso ao registrar ativo no inventario: $($_.Exception.Message)"
            }
        }

        # 5. Vinculacao da Chave de Licenca de SO (1-para-1 estrito)
        # Executado APOS a criacao/atualizacao do ativo para garantir que o registro existe no banco
        # Apenas chaves fisicas completas de 25 digitos (Retail/OEM) sao vinculadas ao catalogo exclusivo
        $isFull25Key = ($productKey -match "^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$")
        if ($isFull25Key -and -not ($GenericKeys -contains $productKey)) {
            try {
                $encAssetId = [System.Uri]::EscapeDataString($AssetId)
                $encKey = [System.Uri]::EscapeDataString($productKey)

                # Desvincula qualquer outra chave que estava neste ativo (garantia 1-para-1)
                $unlinkUrl = "$SupabaseUrl/rest/v1/os_licenses?asset_id=eq.${encAssetId}&product_key=neq.${encKey}"
                $unlinkBody = @{ asset_id = $null } | ConvertTo-Json
                Invoke-RestMethod -Uri $unlinkUrl -Method Patch -Headers $WriteHeaders -Body $unlinkBody -TimeoutSec 10 | Out-Null

                # Verifica se a chave ja existe no catalogo
                $licUrl = "$SupabaseUrl/rest/v1/os_licenses?product_key=eq.${encKey}&select=id,asset_id"
                $licRaw = Invoke-RestMethod -Uri $licUrl -Method Get -Headers $Headers -TimeoutSec 10
                $licResp = @($licRaw | Where-Object { $_ -ne $null })

                if ($licResp.Count -gt 0) {
                    $existingLic = $licResp[0]
                    if ($existingLic.asset_id -ne $AssetId) {
                        # Atualiza o vinculo para apontar para este ativo
                        $updateLicUrl = "$SupabaseUrl/rest/v1/os_licenses?id=eq.$($existingLic.id)"
                        $updateLicBody = @{ asset_id = $AssetId } | ConvertTo-Json
                        Invoke-RestMethod -Uri $updateLicUrl -Method Patch -Headers $WriteHeaders -Body $updateLicBody -TimeoutSec 10 | Out-Null
                        Write-Host "[OK] Licenca do Windows vinculada a $AssetId com sucesso." -ForegroundColor Green
                    } else {
                        Write-Host "[OK] Licenca do Windows ja esta corretamente vinculada a $AssetId." -ForegroundColor Green
                    }
                } else {
                    # Chave nao existe: insere nova entrada (ou faz PATCH se houver conflito 409)
                    try {
                        $insertLicUrl = "$SupabaseUrl/rest/v1/os_licenses"
                        $insertLicBody = @{ product_key = $productKey; asset_id = $AssetId } | ConvertTo-Json
                        Invoke-RestMethod -Uri $insertLicUrl -Method Post -Headers $WriteHeaders -Body $insertLicBody -TimeoutSec 10 | Out-Null
                        Write-Host "[OK] Nova licenca $productKey registrada e vinculada a $AssetId." -ForegroundColor Green
                    } catch {
                        $patchLicUrl = "$SupabaseUrl/rest/v1/os_licenses?product_key=eq.${encKey}"
                        $patchLicBody = @{ asset_id = $AssetId } | ConvertTo-Json
                        Invoke-RestMethod -Uri $patchLicUrl -Method Patch -Headers $WriteHeaders -Body $patchLicBody -TimeoutSec 10 | Out-Null
                        Write-Host "[OK] Licenca $productKey atualizada para $AssetId (conflito resolvido)." -ForegroundColor Green
                    }
                }
            } catch {
                Write-Warning "Aviso ao vincular licenca de SO: $($_.Exception.Message)"
            }
        } elseif ($productKey -and ($GenericKeys -contains $productKey)) {
            Write-Host "Chave generica/KMS detectada - nao registrada no catalogo." -ForegroundColor DarkGray
        }

        # 6. Envia Ping de Telemetria para devices_health (Upsert)
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

        # Checa se o dispositivo ja existe na tabela de telemetria
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

            $dhUpdateUrl = "$SupabaseUrl/rest/v1/devices_health?asset_id=eq.${encAssetId}"
            $dhUpdateJson = $updatePayload | ConvertTo-Json
            Invoke-RestMethod -Uri $dhUpdateUrl -Method Patch -Headers $WriteHeaders -Body $dhUpdateJson -TimeoutSec 15 | Out-Null
            Write-Host "[OK] Ping de telemetria enviado com sucesso (UPDATE)! CPU: $cpuUsage%, RAM: $([math]::Round($ramUsedBytes/1GB, 1))/$([math]::Round($ramTotalBytes/1GB, 1))GB" -ForegroundColor Green
        } else {
            # Faz INSERT
            $dhInsertUrl = "$SupabaseUrl/rest/v1/devices_health"
            $dhInsertJson = @($healthPayload) | ConvertTo-Json
            Invoke-RestMethod -Uri $dhInsertUrl -Method Post -Headers $WriteHeaders -Body $dhInsertJson -TimeoutSec 15 | Out-Null
            Write-Host "[OK] Novo ativo registrado na telemetria (INSERT)! Unidade: $resolvedUnit" -ForegroundColor Green
        }

    } catch {
        Write-Error "Erro ao enviar telemetria: $($_.Exception.Message)"
    }
}

# Execucao
if ($Loop) {
    Write-Host "=== Agente Ativos Apoio em execucao continua ===" -ForegroundColor Green
    Write-Host "Maquina: $AssetId | Unidade: $UnitName" -ForegroundColor Cyan
    Write-Host "Enviando dados a cada 3 minutos (Pressione Ctrl+C para encerrar)."
    Write-Host ""
    while ($true) {
        Collect-And-Send-Telemetry
        Start-Sleep -Seconds 180
    }
} else {
    Collect-And-Send-Telemetry
}
