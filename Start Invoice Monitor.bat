@echo off
REM ============================================================
REM  Invoice Monitor — Windows Launcher
REM  Double-click this file to start the control panel.
REM ============================================================

cd /d "%~dp0"

echo.
echo ============================================
echo   Invoice Monitor — Starting up...
echo ============================================
echo.

REM Check for Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    where python3 >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: Python 3 is not installed.
        echo Please install Python from https://www.python.org/downloads/
        echo Make sure to check "Add Python to PATH" during installation.
        echo.
        pause
        exit /b 1
    )
    set PY=python3
) else (
    set PY=python
)

echo Using:
%PY% --version

REM Check if dependencies are installed
%PY% -c "import flask" 2>nul
if %errorlevel% neq 0 (
    echo.
    echo Installing dependencies (first run only^)...
    echo.
    %PY% -m pip install -r requirements.txt flask --quiet
    if %errorlevel% neq 0 (
        echo.
        echo ERROR: Failed to install dependencies.
        echo Try running manually: %PY% -m pip install -r requirements.txt flask
        echo.
        pause
        exit /b 1
    )
    echo Dependencies installed.
)

echo.
echo Launching control panel in your browser...
echo.

%PY% control_panel.py

pause
