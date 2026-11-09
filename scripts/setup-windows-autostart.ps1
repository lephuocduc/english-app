# ListenFlow Windows Auto-start Setup Script
# Adds a silent startup shortcut to Windows Startup folder

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = Split-Path -Parent $scriptDir
$vbsLauncher = Join-Path $scriptDir "launch-listenflow.vbs"

$startupDir = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupDir "ListenFlow.lnk"

Write-Host "Setting up ListenFlow Windows Auto-start..." -ForegroundColor Cyan
Write-Host "Project directory: $projectDir"
Write-Host "Startup shortcut:  $shortcutPath"

$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "wscript.exe"
$shortcut.Arguments = "`"$vbsLauncher`""
$shortcut.WorkingDirectory = $projectDir
$shortcut.Description = "ListenFlow Auto-start: YouTube Listening & Dictation"
$shortcut.Save()

Write-Host "ListenFlow auto-start successfully enabled!" -ForegroundColor Green
Write-Host "Whenever you turn on your PC, ListenFlow will automatically start and open in your browser." -ForegroundColor Green

