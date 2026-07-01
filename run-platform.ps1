$ErrorActionPreference = "Stop"

& (Join-Path $PSScriptRoot "scripts\start-platform.ps1") -HostName "127.0.0.1" -Port 5177
