@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

rem 動漫情報系統 heina-suite — 建置 GAS 正式 bundle 後本機預覽（port 5280）

if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"

set "HEINA_PORT=5280"
set "HEINA_URL=http://127.0.0.1:%HEINA_PORT%/preview/"
set "BUNDLE_DIR=%~dp0deploy\apps-script-bundle"
set "GAS_INDEX=%~dp0gas-web\index.html"

title 動漫情報系統 - GAS 本機預覽

echo.
echo  ========================================
echo   動漫情報系統（heina-suite）
echo   App Script 正式版 · 本機預覽
echo   %HEINA_URL%
echo  ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [錯誤] 找不到 Node.js
  echo 請安裝：https://nodejs.org/
  pause
  exit /b 1
)

if not exist "package.json" (
  echo [錯誤] 請在 heina-suite 資料夾執行
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo [1/3] 首次執行：npm install ...
  call npm install
  if errorlevel 1 (
    echo [錯誤] npm install 失敗
    pause
    exit /b 1
  )
  echo.
) else (
  echo [1/3] 依賴已就緒
)

echo.
echo [2/3] 建置 App Script 正式 bundle（npm run deploy）…
echo       產物：deploy\apps-script-bundle\index.html + Code.gs
echo       （約 1～3 分鐘，請稍候）
echo.
call npm run deploy
if errorlevel 1 (
  echo.
  echo [錯誤] 建置失敗，請修正上方錯誤後再試。
  pause
  exit /b 1
)

if not exist "%BUNDLE_DIR%\index.html" (
  echo [錯誤] 找不到 %BUNDLE_DIR%\index.html
  pause
  exit /b 1
)

if not exist "%GAS_INDEX%" (
  echo [錯誤] 找不到 %GAS_INDEX%
  pause
  exit /b 1
)

echo.
node scripts/write-preview-hub-meta.mjs >nul 2>&1

echo.
echo [3/3] 重啟本機預覽伺服器（gas-web + 預覽首頁 /preview/）…

node scripts/stop-gas-preview.mjs %HEINA_PORT% >nul 2>&1

set "_PREVIEW_OK=0"

echo 啟動預覽伺服器（背景）…
start "heina-suite-gas-preview" /D "%~dp0" /min cmd /k "node scripts/preview-gas-server.mjs %HEINA_PORT%"

echo 等待預覽伺服器（最多約 30 秒）…
set /a _tries=0
:wait_loop
set /a _tries+=1
if !_tries! GTR 30 (
  echo [警告] 等待逾時，改以直接開啟 HTML 檔預覽。
  set "_PREVIEW_OK=2"
  goto open_browser
)
node scripts/ensure-gas-preview.mjs %HEINA_PORT% >nul 2>&1
if not errorlevel 1 (
  set "_PREVIEW_OK=1"
  goto open_browser
)
timeout /t 1 /nobreak >nul
goto wait_loop

:open_browser
echo 開啟瀏覽器…
if "!_PREVIEW_OK!"=="2" (
  node scripts/open-gas-preview.mjs file
) else (
  node scripts/open-gas-preview.mjs http %HEINA_PORT%
)

echo.
echo  ----------------------------------------
echo  本機預覽 = 與貼上 Apps Script 相同的前端
echo  Bundle 資料夾：
echo    %BUNDLE_DIR%
echo.
if "!_PREVIEW_OK!"=="1" (
  echo  預覽網址：%HEINA_URL%
  echo  停止預覽：關閉 heina-suite-gas-preview 視窗
) else (
  echo  已用 gas-web\index.html 直接開啟
)
echo  確認無誤後執行 deploy-gas.cmd 貼到 Apps Script
echo  ----------------------------------------
pause
endlocal
