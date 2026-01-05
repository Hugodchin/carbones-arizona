@echo off
chcp 65001>nul
cd /d "%~dp0"
echo ========================================
echo  Actualizando Base de Datos
echo ========================================
echo.
echo Ejecutando export.sql...
echo.
sqlplus system/BASEDEDATOSARIZONA2025@localhost:1521/XEPDB1 @"BASE DE DATOS\export.sql"
echo.
echo ========================================
echo  Proceso completado
echo ========================================
pause
