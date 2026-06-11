@echo off
title BINGO RESET DEBUG MODE

echo ================================
echo   BINGO FRONTEND RESET (DEBUG)
echo ================================

echo.
echo [1] Stopping node processes...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo [2] Removing node_modules...
rd /s /q node_modules 2>nul

echo.
echo [3] Removing package-lock.json...
del package-lock.json 2>nul

echo.
echo [4] Cleaning npm cache...
npm cache clean --force

echo.
echo [5] Installing dependencies...
npm install

echo.
echo [6] Starting dev server...
npm run dev

echo.
echo ================================
echo   PROCESS FINISHED / CRASHED
echo ================================
echo.

pause