@echo off
setlocal
cd /d "%~dp0"
echo [1/3] Procurement 整合診斷...
call npm run test:procurement
if errorlevel 1 goto :fail

echo.
echo [2/3] TypeScript + Build 驗證...
call npm run build
if errorlevel 1 goto :fail

echo.
echo [3/3] 完成：進貨系統整合與建置皆通過。
exit /b 0

:fail
echo.
echo 診斷失敗：請查看上方錯誤訊息。
exit /b 1
