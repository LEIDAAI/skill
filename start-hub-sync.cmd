@echo off
cd /d "%~dp0"
node "%~dp0hub-sync-server.cjs"
if errorlevel 1 pause
