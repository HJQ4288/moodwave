@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Publish Moodwave to GitHub

where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js not found.
  echo     Install LTS first: https://nodejs.org/zh-cn
  echo.
  pause
  exit /b 1
)

node scripts\push-to-github.mjs
echo.
pause
