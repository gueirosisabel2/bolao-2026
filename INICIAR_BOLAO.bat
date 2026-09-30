@echo off
chcp 65001 > nul
title BOLÃO DANI & CAPITÃO 2026
echo ========================================================
echo        🎯 BOLÃO PALPITE VOTOS DANI E CAPITÃO 2026
echo ========================================================
echo.
echo Iniciando o servidor local...
echo.

start "" "http://localhost:3000"

node server.js

pause
