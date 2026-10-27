@echo off
title PropAI - Lyka Realty Platform Launcher
echo ========================================================
echo   Starting PropAI - Lyka Realty Full-Stack Platform
echo ========================================================
echo.

echo Launching Backend (FastAPI on http://127.0.0.1:8000)...
start "PropAI Backend" cmd /k "cd /d "%~dp0" && python run.py"

echo Launching Frontend (Next.js on http://localhost:3000)...
start "PropAI Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ========================================================
echo   Platform URLs:
echo   - Frontend: http://localhost:3000
echo   - Backend:  http://127.0.0.1:8000
echo   - Swagger:  http://127.0.0.1:8000/docs
echo.
echo   Role-Based Demo Staff Logins (Password: password123):
echo   - Real Estate Agent 1: agent@lykarealty.ae (Rajesh Sharma)
echo   - Real Estate Agent 2: agent2@lykarealty.ae (Sarah Jenkins)
echo   - Sales Manager:       manager@lykarealty.ae (Fatima Al Zaabi)
echo   - System Administrator:admin@lykarealty.ae (Alexander Vance)
echo ========================================================
echo.
pause
