@echo off
echo Subiendo cambios a GitHub...
git add .
git commit -m "Actualizacion automatica %date% %time%"
git push
echo.
echo ========================================
echo ¡Cambios subidos a GitHub correctamente!
echo ========================================
pause
