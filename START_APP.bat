@echo off
echo ========================================
echo    SmartBlood Connect Startup Script
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.12 or higher
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 18 or higher
    pause
    exit /b 1
)

echo [1/4] Checking environment...
echo.

REM Check if .env file exists
if not exist "backend\.env" (
    echo WARNING: backend\.env file not found
    echo Please create .env file from .env.example
    pause
    exit /b 1
)

echo [2/4] Starting Backend Server...
echo.
cd backend
start "SmartBlood Backend" cmd /k "python run.py"
timeout /t 5 /nobreak >nul

echo [3/4] Starting Frontend Server...
echo.
cd ..\frontend
start "SmartBlood Frontend" cmd /k "npm run dev"

echo [4/4] Application Started Successfully!
echo.
echo ========================================
echo   Backend:  http://127.0.0.1:5000
echo   Frontend: http://localhost:3000
echo   API Docs: http://127.0.0.1:5000/apidocs
echo ========================================
echo.
echo Press any key to open browser...
pause >nul

start http://localhost:3000

echo.
echo Application is running in separate windows.
echo Close this window to keep servers running.
echo.
pause
