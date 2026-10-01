# ============================================================
# open-app.ps1 — Desktop icon entry point
#
# 1. Start the backend if it isn't running (calls auto-start.ps1)
# 2. Wait up to 4 seconds for health
# 3. If not up -> show "starting..." popup (show-starting.vbs)
# 4. When healthy -> open http://localhost:5000 in the browser
# 5. On failure -> open fresh server.err.log in Notepad
# ============================================================

$ErrorActionPreference = 'SilentlyContinue'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir  = Join-Path $projectRoot 'backend'
$logDir      = Join-Path $backendDir 'logs'
$errLog      = Join-Path $logDir 'server.err.log'
$autoStart   = Join-Path $projectRoot 'auto-start.ps1'
$showStart   = Join-Path $projectRoot 'show-starting.vbs'

$port = 5000
try {
    $envFile = Join-Path $backendDir '.env'
    if (Test-Path $envFile) {
        $portLine = Get-Content $envFile | Where-Object { $_ -match '^\s*PORT=' } | Select-Object -First 1
        if ($portLine -match '^\s*PORT="?(\d+)"?') { $port = [int]$Matches[1] }
    }
} catch {}

function Test-Backend {
    param([int]$TimeoutMs = 800)
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $iar = $client.BeginConnect('127.0.0.1', $port, $null, $null)
        $waited = $iar.AsyncWaitHandle.WaitOne($TimeoutMs, $false)
        $ok = $waited -and $client.Connected
        $client.Close()
        return $ok
    } catch { return $false }
}

# 1. Ensure backend is running
if (-not (Test-Backend)) {
    if (Test-Path $autoStart) {
        # Run hidden (no PowerShell window flash)
        Start-Process powershell.exe -ArgumentList `
            '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', "-File `"$autoStart`"" `
            -WindowStyle Hidden
    }
}

# 2. Quick wait: up to 4 seconds
$up = $false
for ($i = 0; $i -lt 4; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Backend) { $up = $true; break }
}

if (-not $up) {
    # 3. Cold boot can take 6-20s — show the info popup, then keep waiting
    if (Test-Path $showStart) {
        Start-Process wscript.exe -ArgumentList "`"$showStart`"" -WindowStyle Hidden
    }
    for ($i = 0; $i -lt 25; $i++) {
        Start-Sleep -Seconds 1
        if (Test-Backend) { $up = $true; break }
    }
}

if ($up) {
    # 4. Healthy -> open browser
    Start-Process "http://localhost:$port"
} else {
    # 5. Failure -> show the actual error log in Notepad (rotate first so it's fresh)
    if (Test-Path $errLog) {
        Remove-Item "$errLog.old" -Force -ErrorAction SilentlyContinue
        Copy-Item $errLog "$errLog.old" -Force -ErrorAction SilentlyContinue
        Start-Process notepad.exe -ArgumentList "`"$errLog`""
    } else {
        New-Item -ItemType File -Path $errLog -Force | Out-Null
        Add-Content -Path $errLog -Value "Backend failed to start and no error log was produced."
        Add-Content -Path $errLog -Value "Check: node installed? backend\npm installed? (see README Quick Start)"
        Start-Process notepad.exe -ArgumentList "`"$errLog`""
    }
}
