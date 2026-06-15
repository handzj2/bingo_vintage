@echo off
echo Removing backend files accidentally committed to frontend...

cd /d D:\DEV\nodes_apps\bingo_vintage\frontend

REM Root level backend files
git rm --cached --ignore-unmatch data-source.ts
git rm --cached --ignore-unmatch src/app.module.ts
git rm --cached --ignore-unmatch src/main.ts

REM Backend module folders inside frontend/src
git rm --cached -r --ignore-unmatch src/modules/
git rm --cached -r --ignore-unmatch src/common/

REM Other backend artifacts
git rm --cached -r --ignore-unmatch database/
git rm --cached -r --ignore-unmatch dist/
git rm --cached -r --ignore-unmatch test/

echo Done removing tracked files.
echo.

git commit -m "fix: remove backend NestJS files from frontend repo"
git push origin main

echo.
echo Pushed. Vercel will now redeploy cleanly.
pause
