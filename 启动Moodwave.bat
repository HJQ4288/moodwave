@echo off
chcp 936 >nul
setlocal
title Moodwave 启动器
cd /d "%~dp0"

echo ==================================================
echo    Moodwave - 人脸情绪识别歌曲推荐
echo ==================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [X] 没有检测到 Node.js
  echo     请先安装 LTS 版本：https://nodejs.org/zh-cn
  echo     安装完成后重新双击本文件即可。
  echo.
  pause
  exit /b 1
)

set HAS_CURL=1
where curl >nul 2>nul
if errorlevel 1 set HAS_CURL=0

if "%HAS_CURL%"=="1" (
  curl -s -o nul --max-time 2 http://127.0.0.1:5173
  if not errorlevel 1 (
    echo [OK] 本地服务已经在运行，直接打开浏览器。
    start "" "http://127.0.0.1:5173"
    ping -n 5 127.0.0.1 >nul
    exit /b 0
  )
)

if not exist "node_modules\vite\package.json" (
  echo [1/2] 首次运行，正在安装依赖，约 1-2 分钟，请勿关闭窗口...
  call npm install --registry=https://registry.npmmirror.com
  if errorlevel 1 (
    echo.
    echo [X] 依赖安装失败，请检查网络后重试。
    pause
    exit /b 1
  )
  echo       依赖安装完成。
  echo.
) else (
  echo [1/2] 依赖已就绪。
)

echo [2/2] 正在启动本地服务...
start "Moodwave Dev Server" cmd /k "npm run dev"

if "%HAS_CURL%"=="0" (
  echo       等待 8 秒让服务起来...
  ping -n 9 127.0.0.1 >nul
  goto ready
)

echo       等待服务就绪...
set /a tries=0
:wait
ping -n 2 127.0.0.1 >nul
curl -s -o nul --max-time 2 http://127.0.0.1:5173
if not errorlevel 1 goto ready
set /a tries+=1
if %tries% LSS 40 goto wait
echo.
echo [X] 服务 40 秒内没有起来，请查看 "Moodwave Dev Server" 窗口里的报错。
pause
exit /b 1

:ready
start "" "http://127.0.0.1:5173"
echo.
echo ==================================================
echo   已启动：http://127.0.0.1:5173
echo   浏览器已自动打开；若没有，请手动访问上面的地址。
echo   用完关闭：关掉 "Moodwave Dev Server" 那个黑窗口即可。
echo ==================================================
ping -n 7 127.0.0.1 >nul
exit /b 0
