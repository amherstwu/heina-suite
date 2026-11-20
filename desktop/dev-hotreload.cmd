@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0.."

rem ④ 開發用熱重載（非 GAS 單檔版，改 UI 時用）

if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"

title 動漫情報系統 - 開發模式

echo.
echo  ========================================
echo   開發模式（Vite 熱重載）
echo   注意：此模式 NOT 等同 App Script 正式版
echo   上架前請用「① 本機預覽」
echo  ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [錯誤] 找不到 Node.js
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo npm install ...
  call npm install
  if errorlevel 1 pause & exit /b 1
)

call npm run dev
pause
endlocal
