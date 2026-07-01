param(
  [string]$ShortcutName = "PPT HTML Studio Watchdog.lnk",
  [string]$HostName = "127.0.0.1",
  [int]$Port = 5177,
  [int]$IntervalSeconds = 30
)

$ErrorActionPreference = "Stop"

$startup = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startup $ShortcutName
$watchdog = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "watchdog.ps1")
$powershell = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
$arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$watchdog`" -HostName $HostName -Port $Port -IntervalSeconds $IntervalSeconds"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $powershell
$shortcut.Arguments = $arguments
$shortcut.WorkingDirectory = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$shortcut.WindowStyle = 7
$shortcut.Description = "Keeps PPT HTML Studio running locally."
$shortcut.Save()

Start-Process -FilePath $powershell -ArgumentList $arguments -WindowStyle Hidden

"Installed startup shortcut: $shortcutPath"
