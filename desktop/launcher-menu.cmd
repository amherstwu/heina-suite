@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0.."

title 動漫情報系統 - 啟動選單

:menu
cls
echo.
echo   ╔══════════════════════════════════════╗
echo   ║     動漫情報系統 · Heina Suite       ║
echo   ╠══════════════════════════════════════╣
echo   ║  1  本機預覽（建置 GAS + 開瀏覽器）  ║
echo   ║  2  貼到 Apps Script（開 bundle）    ║
echo   ║  3  停止本機預覽                     ║
echo   ║  4  開發模式（熱重載，非正式版）     ║
echo   ║  5  重新安裝桌面捷徑                 ║
echo   ║  Q  離開                             ║
echo   ╚══════════════════════════════════════╝
echo.
choice /C 12345Q /N /M "  請選擇 [1-5 或 Q]: "

if errorlevel 7 exit /b 0
if errorlevel 6 goto install
if errorlevel 5 goto dev
if errorlevel 4 goto stop
if errorlevel 3 goto paste
if errorlevel 2 goto preview
if errorlevel 1 goto preview
goto menu

:preview
call "%~dp0preview-gas.cmd"
goto menu

:paste
call "%~dp0paste-to-gas.cmd"
goto menu

:stop
call "%~dp0stop-preview.cmd"
goto menu

:dev
call "%~dp0dev-hotreload.cmd"
goto menu

:install
call "%~dp0install-shortcuts.cmd"
goto menu
