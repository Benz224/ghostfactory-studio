$ErrorActionPreference = "SilentlyContinue"

$Root = Split-Path -Parent $PSScriptRoot
$StateDir = Join-Path $Root ".ghostfactory"
$PidFile = Join-Path $StateDir "server.pid"
$PortFile = Join-Path $StateDir "server.port"
$LogFile = Join-Path $StateDir "server.log"

function Stop-ProcessTree {
    param([int]$ProcessId)

    $children = Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $ProcessId }
    foreach ($child in $children) {
        Stop-ProcessTree -ProcessId $child.ProcessId
    }

    Stop-Process -Id $ProcessId -Force
}

if (Test-Path $PidFile) {
    $savedPid = Get-Content $PidFile | Select-Object -First 1
    if ($savedPid -match "^\d+$") {
        Stop-ProcessTree -ProcessId ([int]$savedPid)
    }
}

$escapedRoot = [Regex]::Escape($Root)
Get-CimInstance Win32_Process -Filter "name = 'node.exe'" |
    Where-Object {
        $_.CommandLine -match $escapedRoot -and
        ($_.CommandLine -match "next" -or $_.CommandLine -match "next-server")
    } |
    ForEach-Object {
        Stop-ProcessTree -ProcessId $_.ProcessId
    }

Remove-Item $PidFile -Force
Remove-Item $PortFile -Force

New-Item -ItemType Directory -Force -Path $StateDir | Out-Null
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $LogFile -Value "[$timestamp] Stopped GHOSTFACTORY Studio"
