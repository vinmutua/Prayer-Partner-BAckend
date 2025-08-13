@echo off
echo Stopping any running Node.js processes...
taskkill /f /im node.exe 2>nul

echo Building the project...
call npm run build

echo Starting the server...
call npm start

echo Server should be running on port 3000
pause
