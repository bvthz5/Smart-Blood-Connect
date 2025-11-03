@echo off
echo Smart Blood Connect - Development Environment
echo ============================================

echo.
echo Starting backend server with synchronous donor matching fallback...
echo.

cd /d "c:\Users\lenovo\OneDrive\Desktop\smartBlood\backend"
call .venv\Scripts\activate.bat
python run.py

echo.
echo Backend server stopped.
pause