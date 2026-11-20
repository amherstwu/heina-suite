@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0.."

title 動漫情報系統 - 停止本機預覽

if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"

echo.
echo  停止本機預覽（port 5280）…
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [錯誤] 找不到 Node.js
  pause
  exit /b 1
)

node scripts/stop-gas-preview.mjs 5280

echo.
echo  也可手動關閉標題為 heina-suite-gas-preview 的視窗。
echo.
pause
endlocal
