@echo off
chcp 65001 >nul
cd /d "%~dp0.."

echo.
echo  安裝「動漫情報系統」桌面啟動器…
echo  會在桌面建立資料夾與捷徑。
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\scripts\install-desktop-launchers.ps1"

echo.
pause
