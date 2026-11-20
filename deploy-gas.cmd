@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

set "BUNDLE=%~dp0deploy\apps-script-bundle"
set "GUIDE=%BUNDLE%\複製到AppsScript.txt"

title 動漫情報系統 - 貼到 Apps Script

echo.
echo  ========================================
echo   動漫情報系統 · 貼到 Google Apps Script
echo  ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [錯誤] 找不到 Node.js
  pause
  exit /b 1
)

if /i "%~1"=="skip" goto open_bundle

:rebuild
echo 正在用目前程式碼重新建置 Apps Script 檔（index.html + Code.gs）…
echo.
if not exist "node_modules\" (
  call npm install
  if errorlevel 1 (
    echo [錯誤] npm install 失敗
    pause
    exit /b 1
  )
)
if /i "%~1"=="full" (
  call npm run deploy
) else (
  call npm run build:gas
)
if errorlevel 1 (
  echo [錯誤] 建置失敗
  pause
  exit /b 1
)

:open_bundle
if not exist "%BUNDLE%\index.html" (
  echo [錯誤] 缺少 %BUNDLE%\index.html
  echo 請先執行 open-local-preview.bat 完成建置與預覽。
  pause
  exit /b 1
)

echo 開啟 bundle 資料夾與操作說明…
start "" explorer "%BUNDLE%"
if exist "%GUIDE%" start "" notepad "%GUIDE%"

echo.
echo  請將以下兩個檔貼到 Apps Script 專案：
echo    [A] index.html  → HTML 檔名必須為 index
echo    [B] Code.gs
echo.
echo  貼上後：部署 ^> 新增部署作業 ^> 網路應用程式
echo.
echo  預設每次貼上前都會重新建置。
echo  只要開舊檔：deploy-gas.cmd skip
echo  完整檢查後建置：deploy-gas.cmd full
echo.
pause
endlocal
