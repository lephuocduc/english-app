@echo off
title ListenFlow - Windows Auto-start Setup
echo ========================================================
echo ListenFlow - Windows Auto-start Setup
echo ========================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-windows-autostart.ps1"
echo.
pause

