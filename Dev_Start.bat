@echo off
title [DEV MODE] Signal Monitor Server
echo ====================================================
echo  Starting Development Server... (npm start)
echo  DO NOT CLOSE THIS WINDOW! (Server will stop)
echo ====================================================

:: 1. Move to current directory
cd /d "%~dp0"

:: 2. Open browser automatically after 2 seconds
timeout /t 2 /nobreak >nul
start http://localhost:3000

:: 3. Run the server
npm start