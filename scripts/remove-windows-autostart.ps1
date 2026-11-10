# ListenFlow Windows Auto-start Removal Script
$ErrorActionPreference = 'SilentlyContinue'

$startupDir = [Environment]::GetFolderPath('Startup')
$shortcutUrl = Join-Path $startupDir "ListenFlow.url"
$shortcutLnk = Join-Path $startupDir "ListenFlow.lnk"

if (Test-Path $shortcutUrl) {
    Remove-Item -Path $shortcutUrl -Force
}
if (Test-Path $shortcutLnk) {
    Remove-Item -Path $shortcutLnk -Force
}

Write-Host "ListenFlow auto-start shortcut removed successfully." -ForegroundColor Yellow
