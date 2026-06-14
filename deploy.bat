@echo off
echo ============================================
echo  BINGO VINTAGE - Git Commit and Push
echo ============================================
echo.

REM Navigate to repo root (change this path to your actual folder)
cd /d "D:\DEV\bingo_vintage"

echo Current directory:
cd
echo.

REM Show what files changed
echo Files to be committed:
git status
echo.

REM Stage all changes
git add .

REM Commit with message
git commit -m "fix: deploy config, SSL fix, health server, type fixes"

REM Push to GitHub
git push origin main

echo.
echo ============================================
echo  Done! Check Railway for auto-deploy.
echo ============================================
pause