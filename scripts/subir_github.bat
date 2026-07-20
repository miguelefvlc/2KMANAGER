@echo off
cd /d "%~dp0.."
echo Subiendo cambios a GitHub...
git add -A
git commit -m "Actualizacion automatica %date% %time%"
git push
echo.
echo ========================================
echo ¡Cambios subidos a GitHub correctamente!
echo ========================================
pause
