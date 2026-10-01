# ============================================================
# auto-start.ps1 — Start the Store Management backend (hidden)
# Runs at Windows login via the Startup-folder shortcut.
#
# - Named mutex: if Startup entry AND desktop icon both fire,
#   only ONE node process spawns (EADDRINUSE fix)
# - TCP health-check on 127.0.0.1 (localhost resolves ::1 first,
#   but the server binds IPv4 0.0.0.0 only)
# - Rotates old logs to .old, writes fresh server.err.log
# - Logs -> backend\logs\launcher.log
# ============================================================

$ErrorActionPreference = 'SilentlyContinue'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir  = Join-Path $projectRoot 'backend'
$logDir      = Join-Path $backendDir 'logs'
$launcherLog = Join-Path $logDir 'launcher.log'
$errLog      = Join-Path $logDir 'server.err.log'
$errLogOld   = Join-Path $logDir 'server.err.log.old'

function Write-Log([string]$Message) {
    $line = "{0} {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
    try { Add-Content -Path $launcherLog -Value $line } catch {}
}

# --- Named mutex: only one instance may proceed ---
$mutexName = 'Global\StoreManagementBackendStart'
$mutex = New-Object System.Threading.Mutex($false, $mutexName)
$owned = $false
try {
    $owned = $mutex.WaitOne(0)
} catch {
    $owned = $false
}

if (-not $owned) {
    Write-Log 'Another instance is starting (mutex held) — exiting.'
    [System.Runtime.InteropServices.Marshal]::ReleaseMutex($mutex) | Out-Null
    $mutex.Dispose()
    exit 0
}

try {
    # --- Already running? TCP check on 127.0.0.1 ---
    $port = 5000
    try {
        $envFile = Join-Path $backendDir '.env'
        if (Test-Path $envFile) {
            $portLine = Get-Content $envFile | Where-Object { $_ -match '^\s*PORT=' } | Select-Object -First 1
            if ($portLine -match '^\s*PORT="?(\d+)"?') { $port = [int]$Matches[1] }
        }
    } catch {}

    $alreadyUp = $false
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $iar = $client.BeginConnect('127.0.0.1', $port, $null, $null)
        $waited = $iar.AsyncWaitHandle.WaitOne(800, $false)
        if ($waited -and $client.Connected) { $alreadyUp = $true }
        $client.Close()
    } catch {}

    if ($alreadyUp) {
        Write-Log "Backend already running on port $port — nothing to do."
        exit 0
    }

    # --- Rotate previous error log ---
    if (Test-Path $errLog) {
        Remove-Item $errLogOld -Force -ErrorAction SilentlyContinue
        Move-Item $errLog $errLogOld -Force -ErrorAction SilentlyContinue
    }
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null

    Write-Log "Starting backend (port $port)..."

    # --- Spawn node hidden (no console window) ---
    $nodeExe = 'node'
    $tsNode  = Join-Path $backendDir 'node_modules\ts-node\dist\bin.js'
    $entry   = Join-Path $backendDir 'src\index.ts'
    $distEntry = Join-Path $backendDir 'dist\index.js'

    # Production: compiled output (no ts-node). Dev: ts-node.
    if (Test-Path $distEntry) {
        $nodeArgs = "`"$distEntry`""
    } else {
        $nodeArgs = "`"$tsNode`" `"$entry`""
    }

    $startArgs = @{
        FilePath               = $nodeExe
        ArgumentList           = $nodeArgs
        WorkingDirectory       = $backendDir
        RedirectStandardError  = $errLog
        RedirectStandardOutput = (Join-Path $logDir 'server.out.log')
        WindowStyle            = 'Hidden'
        PassThru               = $true
    }

    $proc = Start-Process @startArgs

    # --- Wait up to 30s for health (cold boot can take 6-20s) ---
    $up = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $iar = $client.BeginConnect('127.0.0.1', $port, $null, $null)
            $waited = $iar.AsyncWaitHandle.WaitOne(500, $false)
            if ($waited -and $client.Connected) { $up = $true; $client.Close(); break }
            $client.Close()
        } catch {}
        if ($proc.HasExited) { break }
    }

    if ($up) {
        Write-Log "Backend up on port $port (PID $($proc.Id))."
    } elseif ($proc.HasExited) {
        Write-Log "Backend FAILED — node exited with code $($proc.ExitCode). See server.err.log"
    } else {
        Write-Log "Backend still starting after 30s — check server.err.log"
    }
} finally {
    if ($owned) {
        try { [System.Runtime.InteropServices.Marshal]::ReleaseMutex($mutex) } catch {}
    }
    $mutex.Dispose()
}
