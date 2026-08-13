@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

echo === Heina Suite: build gas-web\index.html and open in browser ===
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install from https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo [1/2] First run: npm install ...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
  echo.
)

echo [2/2] npm run deploy (build + verify + GAS bundle) ...
call npm run deploy
if errorlevel 1 (
  echo [ERROR] Build failed.
  pause
  exit /b 1
)

set "IDX_FILE=%~dp0gas-web\index.html"
set "BUNDLE=%~dp0deploy\apps-script-bundle"
if not exist "%IDX_FILE%" (
  echo [ERROR] Missing: %IDX_FILE%
  pause
  exit /b 1
)

echo.
echo GAS bundle (paste to Apps Script): %BUNDLE%
echo   - index.html
echo   - Code.gs
echo   - 複製到AppsScript.txt
echo.
echo Opening preview: %IDX_FILE%
start "" "%IDX_FILE%"
echo Done.
pause
