@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
call "%~dp0open-local-preview.bat"
