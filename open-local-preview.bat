@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

rem 動漫情報系統 heina-suite（port 5280，避開 MCurator 5173）

if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"

set "HEINA_PORT=5280"
set "HEINA_URL=http://127.0.0.1:%HEINA_PORT%/#/lookup"

title 動漫情報系統 - 本機預覽

echo.
echo  ========================================
echo   動漫情報系統（heina-suite）
echo   %HEINA_URL%
echo   （避開 MCurator / 5173）
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
  echo 首次執行：npm install ...
  call npm install
  if errorlevel 1 (
    echo [錯誤] npm install 失敗
    pause
    exit /b 1
  )
  echo.
)

rem 已在聽 5280：直接開瀏覽器（需確認是本專案再使用）
netstat -ano | findstr "LISTENING" | findstr ":%HEINA_PORT% " >nul 2>&1
if not errorlevel 1 (
  echo port %HEINA_PORT% 已在運作，開啟瀏覽器…
  start "" "%HEINA_URL%"
  echo.
  echo 若畫面不對，請先關閉占用 %HEINA_PORT% 的程式後再試。
  pause
  exit /b 0
)

echo 啟動開發伺服器（背景）…
start "heina-suite-dev" /D "%~dp0" /min cmd /k "npm run dev"

echo 等待伺服器就緒（最多約 60 秒）…
set /a _tries=0
:wait_loop
set /a _tries+=1
if %_tries% GTR 60 (
  echo [錯誤] 等待逾時：http://127.0.0.1:%HEINA_PORT% 未回應
  echo 請查看最小化視窗「heina-suite-dev」的錯誤
  pause
  exit /b 1
)
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri 'http://127.0.0.1:%HEINA_PORT%/' -UseBasicParsing -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
  timeout /t 1 /nobreak >nul
  goto wait_loop
)

echo 已就緒，開啟瀏覽器…
start "" "%HEINA_URL%"
echo.
echo 完成。要停止預覽：關閉標題為 heina-suite-dev 的視窗。
pause
endlocal
