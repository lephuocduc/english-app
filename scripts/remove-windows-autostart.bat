@echo off
title ListenFlow - Remove Windows Auto-start
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0remove-windows-autostart.ps1"
echo.
pause

