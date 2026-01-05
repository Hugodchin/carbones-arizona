@echo off
echo ========================================
echo  Reset de contraseña Oracle SYSTEM
echo ========================================
echo.
echo Este script cambiará la contraseña del usuario SYSTEM
echo.
set /p SYS_PASS="Ingresa la contraseña actual de SYS (la que pusiste al instalar Oracle): "
echo.
echo Conectando a Oracle...
echo ALTER USER SYSTEM IDENTIFIED BY "BASEDEDATOSARIZONA2025"; | sqlplus -S sys/%SYS_PASS%@localhost:1521/XE as sysdba
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Contraseña cambiada exitosamente!
    echo Usuario: SYSTEM
    echo Nueva contraseña: BASEDEDATOSARIZONA2025
) else (
    echo.
    echo ✗ Error cambiando la contraseña
    echo Verifica que la contraseña de SYS sea correcta
)
echo.
pause
