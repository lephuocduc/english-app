# ListenFlow Windows Auto-start Removal Script
$ErrorActionPreference = 'SilentlyContinue'

$startupDir = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupDir "ListenFlow.lnk"

if (Test-Path $shortcutPath) {
    Remove-Item -Path $shortcutPath -Force
    Write-Host "ListenFlow auto-start shortcut removed successfully." -ForegroundColor Yellow
} else {
    Write-Host "No auto-start shortcut found." -ForegroundColor DarkGray
}

