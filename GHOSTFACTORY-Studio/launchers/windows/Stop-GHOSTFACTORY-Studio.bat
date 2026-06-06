@echo off
set "PROJECT_ROOT=%~dp0..\.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%PROJECT_ROOT%\scripts\stop-ghostfactory.ps1"
exit /b
