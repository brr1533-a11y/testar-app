@echo off
title Gestao Rural - servidor local
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js 20 ou superior e abra este arquivo novamente.
  pause
  exit /b 1
)
echo Instalando as dependencias do projeto...
call npm.cmd install --no-audit --no-fund
if errorlevel 1 (
  echo Nao foi possivel instalar. Confira a mensagem acima.
  pause
  exit /b 1
)
echo.
echo Pagina geral: http://localhost:3000/
echo Pagina Cafe:  http://localhost:3000/cafe
echo Pagina Gado:  http://localhost:3000/gado
echo Pagina Graos: http://localhost:3000/graos
echo Painel:       http://localhost:3000/app
echo Mantenha esta janela aberta enquanto usar o sistema.
echo.
call npm.cmd start
pause
