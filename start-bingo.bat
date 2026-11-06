@echo off
setlocal EnableExtensions
title Bingo Vintage - Start Frontend + Backend

REM ============================================================
REM  Bingo Vintage launcher
REM  - Checks Node.js / npm
REM  - Installs dependencies if node_modules is missing
REM  - Starts backend (NestJS) and frontend (Next.js) in
REM    separate windows
REM ============================================================

cd /d "%~dp0"

echo.
echo  ========================================
echo   Bingo Vintage - Dev Starter
echo  ========================================
echo.

REM --- Node / npm ------------------------------------------------
where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not on PATH.
  echo         Install Node 20+ from https://nodejs.org and retry.
  pause
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm is not available on PATH.
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
for /f "tokens=*" %%v in ('npm -v') do set NPM_VER=%%v
echo [OK] Node %NODE_VER%  npm %NPM_VER%
echo.

REM --- Backend deps ---------------------------------------------
if not exist "backend\package.json" (
  echo [ERROR] backend\package.json not found. Run this .bat from the project root.
  pause
  exit /b 1
)

if not exist "backend\node_modules\" (
  echo [INFO] backend\node_modules missing - installing dependencies...
  pushd backend
  call npm ci
  if errorlevel 1 (
    echo [WARN] npm ci failed - trying npm install...
    call npm install
  )
  if errorlevel 1 (
    echo [ERROR] Backend dependency install failed.
    popd
    pause
    exit /b 1
  )
  popd
  echo [OK] Backend dependencies installed.
) else (
  echo [OK] Backend dependencies already present.
)

REM --- Frontend deps --------------------------------------------
if not exist "frontend\package.json" (
  echo [ERROR] frontend\package.json not found. Run this .bat from the project root.
  pause
  exit /b 1
)

if not exist "frontend\node_modules\" (
  echo [INFO] frontend\node_modules missing - installing dependencies...
  pushd frontend
  call npm ci
  if errorlevel 1 (
    echo [WARN] npm ci failed - trying npm install...
    call npm install
  )
  if errorlevel 1 (
    echo [ERROR] Frontend dependency install failed.
    popd
    pause
    exit /b 1
  )
  popd
  echo [OK] Frontend dependencies installed.
) else (
  echo [OK] Frontend dependencies already present.
)

echo.
echo [INFO] Starting backend  (NestJS start:dev) in a new window...
start "Bingo Backend" cmd /k "cd /d "%~dp0backend" && npm run start:dev"

timeout /t 3 /nobreak >nul

echo [INFO] Starting frontend (Next.js dev) in a new window...
start "Bingo Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo  ========================================
echo   Launched.
echo   - Backend window : NestJS watch mode
echo   - Frontend window: Next.js (usually http://localhost:3000)
echo   Backend API is typically http://localhost:3000 or :3001
echo     (check backend window / .env for PORT)
echo  ========================================
echo.
echo This window can be closed; services keep running in their own windows.
echo Press any key to exit this launcher...
pause >nul
endlocal
exit /b 0
