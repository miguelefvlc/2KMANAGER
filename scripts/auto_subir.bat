@echo off
cd /d "%~dp0.."
title 2kOffice Auto-Sync
echo =========================================
echo  Vigilante de GitHub (Auto-Sync) Activado
echo =========================================
echo.
echo Deje esta ventana minimizada o abierta mientras gestiona la liga. 
echo Cada 10 segundos comprobara si hay cambios en los CSV...
echo Pulse Ctrl+C para detenerlo.
echo.

:loop
timeout /t 10 /nobreak >nul
git status --porcelain | findstr "\.csv" >nul
if %errorlevel% equ 0 (
    echo.
    echo [ %time% ] Modificacion detectada en los CSV. Subiendo a GitHub...
    git add -A
    git commit -m "Auto-Sync %date% %time%"
    git push
    echo.
    echo [ %time% ] Subida completada. Esperando nuevos cambios...
)
goto loop
