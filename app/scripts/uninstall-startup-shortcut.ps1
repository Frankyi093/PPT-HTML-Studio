param(
  [string]$ShortcutName = "PPT HTML Studio Watchdog.lnk"
)

$ErrorActionPreference = "Stop"

$startup = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startup $ShortcutName
if (Test-Path -LiteralPath $shortcutPath) {
  Remove-Item -LiteralPath $shortcutPath -Force
  "Removed startup shortcut: $shortcutPath"
} else {
  "Startup shortcut was not found: $shortcutPath"
}
