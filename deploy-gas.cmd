@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

echo === Heina Suite: deploy (build + verify + GAS bundle) ===
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

echo Running: npm run deploy ...
call npm run deploy
if errorlevel 1 (
  echo [ERROR] Deploy failed.
  pause
  exit /b 1
)

set "BUNDLE=%~dp0deploy\apps-script-bundle"
echo.
echo OK. Bundle folder:
echo   %BUNDLE%
echo.
echo Open guide: %BUNDLE%\複製到AppsScript.txt
echo.
pause
