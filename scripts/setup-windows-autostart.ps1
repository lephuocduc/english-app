# ListenFlow Windows Auto-start Setup Script
# Adds ListenFlow shortcut to Windows Startup folder to open https://lephuocduc.github.io/english-app/

$ErrorActionPreference = 'Stop'

$startupDir = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupDir "ListenFlow.url"

Write-Host "Setting up ListenFlow Windows Auto-start..." -ForegroundColor Cyan
Write-Host "Startup target: https://lephuocduc.github.io/english-app/"
Write-Host "Startup shortcut: $shortcutPath"

$urlContent = @"
[InternetShortcut]
URL=https://lephuocduc.github.io/english-app/
"@

[System.IO.File]::WriteAllText($shortcutPath, $urlContent)

# Remove legacy .lnk if present
$oldLnk = Join-Path $startupDir "ListenFlow.lnk"
if (Test-Path $oldLnk) {
    Remove-Item -Path $oldLnk -Force
}

Write-Host "ListenFlow auto-start successfully enabled!" -ForegroundColor Green
Write-Host "Whenever you turn on your PC, Windows will automatically open https://lephuocduc.github.io/english-app/ in your default browser." -ForegroundColor Green
