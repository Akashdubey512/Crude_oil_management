@echo off
title Energy Resilience — React Frontend
echo ================================================
echo  Energy Resilience Frontend Dev Server
echo  http://localhost:5173
echo ================================================
echo.
cd /d "%~dp0frontend"
call C:\Users\ss146\miniconda3\Scripts\activate.bat base
:loop
echo [%TIME%] Starting Vite dev server...
npm run dev
echo [%TIME%] Dev server stopped. Restarting in 3s...
timeout /t 3 /nobreak >nul
goto loop
