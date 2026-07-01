param(
  [string]$TaskName = "PPTHTMLStudioWatchdog",
  [string]$HostName = "127.0.0.1",
  [int]$Port = 5177,
  [int]$IntervalSeconds = 30
)

$ErrorActionPreference = "Stop"

$watchdog = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "watchdog.ps1")
$argument = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$watchdog`" -HostName $HostName -Port $Port -IntervalSeconds $IntervalSeconds"

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $argument
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description "Keeps PPT HTML Studio running locally." -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName

"Installed and started scheduled task '$TaskName'."
