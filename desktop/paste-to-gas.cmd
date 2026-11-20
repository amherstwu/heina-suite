@echo off
rem ② 確認無誤後：開啟 bundle 貼到 Google Apps Script
cd /d "%~dp0.."
call "%~dp0..\deploy-gas.cmd" %*
