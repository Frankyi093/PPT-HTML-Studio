param(
  [string]$TaskName = "PPTHTMLStudioWatchdog"
)

$ErrorActionPreference = "Stop"

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  "Removed scheduled task '$TaskName'."
} else {
  "Scheduled task '$TaskName' was not found."
}
