@echo off
chcp 65001 >nul
title Prospecta - carregar base de empresas
cd /d "%~dp0"

echo ==========================================
echo   PROSPECTA - carregando base de empresas
echo ==========================================
echo.
echo   Isso preenche o banco com 380 empresas de demonstracao.
echo   Rode UMA vez, com o 1-INICIAR.bat aberto e rodando.
echo.

if not exist ".env.local" (
  echo [X] Falta o arquivo .env.local nesta pasta.
  pause
  exit /b 1
)

call npm run seed

echo.
echo   Se apareceu "companies: 380", deu certo:
echo   volte no navegador e recarregue a pagina (F5).
echo.
pause
