@echo off
rem Lumo'yu yerel sunucuyla açar (Node.js gerekir: https://nodejs.org)
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js bulunamadi. Lutfen https://nodejs.org adresinden kurun. & pause & exit /b 1)
node server.js --open
pause
