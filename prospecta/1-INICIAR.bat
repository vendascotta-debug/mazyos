@echo off
chcp 65001 >nul
title Prospecta - servidor
cd /d "%~dp0"

echo ==========================================
echo   PROSPECTA - iniciando
echo ==========================================
echo.

if not exist ".env.local" (
  echo [X] Falta o arquivo de configuracao .env.local
  echo.
  echo     Antes de iniciar, crie o arquivo .env.local nesta pasta
  echo     com a conexao do Supabase. O modelo esta em .env.example
  echo.
  echo     Pasta: %cd%
  echo.
  pause
  exit /b 1
)

rem Olha SO a linha da conexao - o texto de exemplo nos comentarios nao conta.
findstr /R /C:"^DATABASE_URL=.*COLE_A_STRING" ".env.local" >nul
if not errorlevel 1 (
  echo [X] O arquivo .env.local ainda esta com o texto de exemplo.
  echo.
  echo     Abra o .env.local nesta pasta, cole a string de conexao do
  echo     Neon no lugar de COLE_A_STRING_DO_NEON_AQUI e salve.
  echo.
  echo     Pasta: %cd%
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [1/2] Primeira execucao - instalando dependencias. Pode levar alguns minutos...
  call npm install
  echo.
)

echo [2/2] Subindo o servidor. O navegador abre sozinho em alguns segundos.
echo.
echo   Endereco: http://localhost:3000
echo.
echo   DEIXE ESTA JANELA ABERTA enquanto estiver usando o Prospecta.
echo   Para desligar: feche a janela ou aperte Ctrl + C.
echo.

start "" cmd /c "timeout /t 12 >nul & start """" http://localhost:3000"
call npm run dev

echo.
echo Servidor encerrado.
pause
