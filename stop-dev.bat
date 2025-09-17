@echo off
echo Stopping Golf Tournament App Development Environment...
echo.

echo Killing Node.js processes (Backend servers)...
taskkill /f /im node.exe >nul 2>&1

echo Killing Expo processes (Frontend servers)...
taskkill /f /im "expo.exe" >nul 2>&1
taskkill /f /im "metro.exe" >nul 2>&1

echo Waiting for processes to terminate...
timeout /t 2 /nobreak >nul

echo.
echo ✅ Development environment stopped!
echo All servers have been terminated.
echo.
echo Press any key to continue...
pause >nul