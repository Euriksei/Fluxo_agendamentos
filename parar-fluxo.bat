@echo off
setlocal
title Fluxo - Parar
cd /d "%~dp0"

set "MARIADB_BIN=C:\Program Files\MariaDB 11.4\bin"

echo ============================================
echo   Fluxo - parando servicos
echo ============================================
echo.

call :parar_porta 3000 Frontend
call :parar_porta 3001 Backend

rem ---- MariaDB (porta 3306) ----
netstat -ano | findstr /C:":3306 " | findstr /C:"LISTENING" >nul
if errorlevel 1 (
    echo [MariaDB] Nao estava rodando.
) else (
    echo [MariaDB] Desligando...
    "%MARIADB_BIN%\mariadb-admin.exe" -u root shutdown
    if errorlevel 1 (
        echo [MariaDB] ERRO ao desligar. Feche a janela "Fluxo - MariaDB" manualmente.
    ) else (
        echo [MariaDB] Desligado.
    )
)

echo.
echo Pronto. As janelas "Fluxo - Backend" e "Fluxo - Frontend" podem ser fechadas.
pause
exit /b 0

rem ---- Funcao: encerra o processo que escuta na porta %1 (nome %2) ----
:parar_porta
set "ACHOU="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /C:":%~1 " ^| findstr /C:"LISTENING"') do (
    if not "%%p"=="0" (
        set "ACHOU=1"
        taskkill /PID %%p /F >nul 2>&1
    )
)
if defined ACHOU (
    echo [%~2] Encerrado ^(porta %~1^).
) else (
    echo [%~2] Nao estava rodando ^(porta %~1^).
)
exit /b 0
