@echo off
setlocal
title Fluxo - Iniciar
cd /d "%~dp0"

set "MARIADB_BIN=C:\Program Files\MariaDB 11.4\bin"
set "MARIADB_DATA=C:/ProgramData/MariaDB/Data"

echo ============================================
echo   Fluxo - iniciando servicos
echo ============================================
echo.

rem ---- 1) MariaDB (porta 3306) ----
call :porta_ativa 3306
if not errorlevel 1 (
    echo [MariaDB] Ja esta rodando na porta 3306.
    goto backend
)

if not exist "%MARIADB_BIN%\mariadbd.exe" (
    echo [MariaDB] ERRO: nao encontrei "%MARIADB_BIN%\mariadbd.exe".
    goto fim_erro
)

echo [MariaDB] Iniciando...
start "Fluxo - MariaDB" /min "%MARIADB_BIN%\mariadbd.exe" --datadir="%MARIADB_DATA%" --console

set /a TENTATIVAS=0
:espera_mariadb
call :porta_ativa 3306
if not errorlevel 1 goto mariadb_ok
set /a TENTATIVAS+=1
if %TENTATIVAS% GEQ 20 (
    echo [MariaDB] ERRO: a porta 3306 nao abriu em 20 segundos. Veja a janela "Fluxo - MariaDB".
    goto fim_erro
)
timeout /t 1 /nobreak >nul
goto espera_mariadb

:mariadb_ok
echo [MariaDB] Pronto na porta 3306.

rem ---- 2) Backend (porta 3001) ----
:backend
call :porta_ativa 3001
if not errorlevel 1 (
    echo [Backend] Ja esta rodando na porta 3001.
) else (
    echo [Backend] Iniciando na porta 3001...
    start "Fluxo - Backend" cmd /k "cd /d backend && npm start"
)

rem ---- 3) Frontend (porta 3000) ----
call :porta_ativa 3000
if not errorlevel 1 (
    echo [Frontend] Ja esta rodando na porta 3000.
) else (
    echo [Frontend] Iniciando na porta 3000...
    start "Fluxo - Frontend" cmd /k "npm run dev"
)

rem ---- 4) Navegador ----
echo.
echo Aguardando os servicos subirem...
timeout /t 8 /nobreak >nul
start "" "http://localhost:3000"

rem ---- 5) Endereco para o celular ----
set "IP_REDE="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "(Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } | Select-Object -First 1).IPv4Address.IPAddress"`) do set "IP_REDE=%%i"

echo.
echo ============================================
echo   Fluxo no ar
echo   No computador: http://localhost:3000
if defined IP_REDE (
    echo   No celular ^(mesma rede Wi-Fi^): http://%IP_REDE%:3000
) else (
    echo   Nao consegui descobrir o IP da rede. Rode "ipconfig" e use o
    echo   "IPv4" do adaptador Wi-Fi: http://SEU_IP:3000
)
echo.
echo   Para parar tudo: parar-fluxo.bat
echo ============================================
echo.
pause
exit /b 0

:fim_erro
echo.
echo Nao foi possivel iniciar o Fluxo.
pause
exit /b 1

rem ---- Funcao: errorlevel 0 se a porta %1 esta em LISTENING ----
:porta_ativa
netstat -ano | findstr /C:":%~1 " | findstr /C:"LISTENING" >nul
exit /b %errorlevel%
