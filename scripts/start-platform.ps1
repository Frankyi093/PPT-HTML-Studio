param(
  [string]$HostName = "127.0.0.1",
  [int]$Port = 5177
)

$ErrorActionPreference = "Stop"

$appRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$server = Join-Path $appRoot "backend\server.py"
$dataDir = Join-Path $appRoot "data"
$logDir = Join-Path $dataDir "logs"
$runDir = Join-Path $dataDir "run"
$healthUrl = "http://$HostName`:$Port/api/health"

New-Item -ItemType Directory -Force -Path $logDir, $runDir | Out-Null

function Test-PlatformHealth {
  try {
    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 4
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

if (Test-PlatformHealth) {
  "PPT HTML Studio is already healthy at $healthUrl"
  exit 0
}

$serverName = [IO.Path]::GetFileName($server)
$staleProcesses = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -match "^python" -and
    $_.CommandLine -and
    $_.CommandLine -like "*$serverName*" -and
    $_.CommandLine -like "*ppt-html-platform*"
  }

foreach ($process in $staleProcesses) {
  try {
    Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
  } catch {
    Write-Warning "Could not stop stale process $($process.ProcessId): $($_.Exception.Message)"
  }
}

$python = "D:\Software\Python\python.exe"
if (-not (Test-Path -LiteralPath $python)) {
  $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
  if (-not $pythonCommand) {
    throw "Python was not found. Install Python or update this script's python path."
  }
  $python = $pythonCommand.Source
}

$stdout = Join-Path $logDir "server.out.log"
$stderr = Join-Path $logDir "server.err.log"
$args = @($server, "--host", $HostName, "--port", [string]$Port)
$process = Start-Process -FilePath $python -ArgumentList $args -WorkingDirectory $appRoot -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
$pidPath = Join-Path $runDir "ppt-html-platform.pid"
Set-Content -LiteralPath $pidPath -Value ([string]$process.Id) -Encoding ASCII

for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Milliseconds 500
  if (Test-PlatformHealth) {
    "PPT HTML Studio started at $healthUrl with PID $($process.Id)"
    exit 0
  }
}

throw "PPT HTML Studio did not become healthy. Check $stderr"
