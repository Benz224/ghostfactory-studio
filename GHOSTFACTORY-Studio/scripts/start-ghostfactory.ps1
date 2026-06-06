$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$StateDir = Join-Path $Root ".ghostfactory"
$LogFile = Join-Path $StateDir "server.log"
$OutLogFile = Join-Path $StateDir "server.out.log"
$ErrLogFile = Join-Path $StateDir "server.err.log"
$PidFile = Join-Path $StateDir "server.pid"
$PortFile = Join-Path $StateDir "server.port"

New-Item -ItemType Directory -Force -Path $StateDir | Out-Null

function Test-PortOpen {
    param([int]$Port)

    $client = New-Object Net.Sockets.TcpClient
    try {
        $connect = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
        if (-not $connect.AsyncWaitHandle.WaitOne(250, $false)) {
            return $false
        }

        $client.EndConnect($connect)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

function Get-NodeProcessForRoot {
    $escapedRoot = [Regex]::Escape($Root)
    Get-CimInstance Win32_Process -Filter "name = 'node.exe'" |
        Where-Object {
            $_.CommandLine -match $escapedRoot -and
            ($_.CommandLine -match "next" -or $_.CommandLine -match "next-server")
        } |
        Select-Object -First 1
}

function Find-FreePort {
    foreach ($candidate in 3000..3010) {
        if (-not (Test-PortOpen -Port $candidate)) {
            return $candidate
        }
    }

    throw "No free port found between 3000 and 3010."
}

Set-Location $Root

$existingProcess = Get-NodeProcessForRoot
if ($existingProcess) {
    $port = 3000
    if (Test-Path $PortFile) {
        $savedPort = Get-Content $PortFile -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($savedPort -match "^\d+$") {
            $port = [int]$savedPort
        }
    }

    Start-Process "http://127.0.0.1:$port"
    exit 0
}

$port = Find-FreePort
Set-Content -Path $PortFile -Value $port

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $LogFile -Value ""
Add-Content -Path $LogFile -Value "[$timestamp] Starting GHOSTFACTORY Studio on http://127.0.0.1:$port"

if (-not (Test-Path (Join-Path $Root "node_modules"))) {
    Add-Content -Path $LogFile -Value "[$timestamp] node_modules not found; running npm install"
    $install = Start-Process -FilePath "npm.cmd" -ArgumentList @("install") -WorkingDirectory $Root -WindowStyle Hidden -Wait -PassThru -RedirectStandardOutput $OutLogFile -RedirectStandardError $ErrLogFile
    if ($install.ExitCode -ne 0) {
        Start-Process notepad.exe $ErrLogFile
        throw "npm install failed. Check $ErrLogFile."
    }
}

$process = Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev", "--", "-H", "127.0.0.1", "-p", $port) -WorkingDirectory $Root -WindowStyle Hidden -PassThru -RedirectStandardOutput $OutLogFile -RedirectStandardError $ErrLogFile
Set-Content -Path $PidFile -Value $process.Id

$ready = $false
foreach ($attempt in 1..90) {
    Start-Sleep -Milliseconds 500
    if (Test-PortOpen -Port $port) {
        $ready = $true
        break
    }
}

if ($ready) {
    Start-Process "http://127.0.0.1:$port"
    exit 0
}

Start-Process notepad.exe $LogFile
Start-Process notepad.exe $ErrLogFile
throw "GHOSTFACTORY Studio did not start. Check $LogFile and $ErrLogFile."
