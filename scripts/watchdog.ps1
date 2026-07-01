param(
  [string]$HostName = "127.0.0.1",
  [int]$Port = 5177,
  [int]$IntervalSeconds = 30
)

$ErrorActionPreference = "Continue"

$appRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$logDir = Join-Path $appRoot "data\logs"
$watchdogLog = Join-Path $logDir "watchdog.log"
$healthUrl = "http://$HostName`:$Port/api/health"
$startScript = Join-Path $PSScriptRoot "start-platform.ps1"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Write-WatchdogLog {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -LiteralPath $watchdogLog -Value $line -Encoding UTF8
}

Write-WatchdogLog "Watchdog started for $healthUrl"

while ($true) {
  $healthy = $false
  try {
    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5
    $healthy = $response.StatusCode -eq 200
  } catch {
    $healthy = $false
  }

  if (-not $healthy) {
    Write-WatchdogLog "Health check failed. Starting platform."
    try {
      & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $startScript -HostName $HostName -Port $Port | ForEach-Object {
        Write-WatchdogLog $_
      }
    } catch {
      Write-WatchdogLog "Start failed: $($_.Exception.Message)"
    }
  }

  Start-Sleep -Seconds $IntervalSeconds
}
