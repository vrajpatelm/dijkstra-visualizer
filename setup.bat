@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo   Dijkstra Visualizer - Automated AI / Developer Setup
echo ========================================================

:: 1. Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python not found in PATH. Please install Python 3.10+ and add it to PATH.
    exit /b 1
)

:: 2. Create virtual environment if it does not exist
if not exist ".venv" (
    echo [INFO] Creating Python virtual environment in .venv ...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        exit /b 1
    )
) else (
    echo [INFO] Virtual environment .venv already exists.
)

:: 3. Activate virtual environment
call .venv\Scripts\activate.bat

:: 4. Install dependencies
echo [INFO] Installing dependencies from requirements.txt ...
python -m pip install --upgrade pip
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Dependency installation failed.
    exit /b 1
)

:: 5. Validate Django configuration
echo [INFO] Running Django system checks ...
python manage.py check
if %errorlevel% neq 0 (
    echo [ERROR] Django configuration check failed.
    exit /b 1
)

echo ========================================================
echo   Setup Complete!
echo   To launch the server run:
echo     .venv\Scripts\activate
echo     python manage.py runserver 8000
echo   Then open http://127.0.0.1:8000/ in your browser.
echo ========================================================

if "%1"=="--run" (
    echo [INFO] Launching server on port 8000 ...
    python manage.py runserver 8000
)

