@echo off
title Energy Resilience API — Backend Server
echo ================================================
echo  Energy Resilience API — Backend Server
echo  http://127.0.0.1:8000
echo  Swagger UI: http://127.0.0.1:8000/docs
echo ================================================
echo.
cd /d "%~dp0"
call C:\Users\ss146\miniconda3\Scripts\activate.bat project
:loop
echo [%TIME%] Starting uvicorn...
python scripts/run_api.py
echo [%TIME%] Server stopped (exit code %ERRORLEVEL%). Restarting in 3s...
timeout /t 3 /nobreak >nul
goto loop
