@echo off
echo Starting Golf Tournament App Development Environment...
echo.

echo Starting Backend Server (localhost:3001)...
start cmd /k "cd backend && node src/server.js"

echo Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo Starting Frontend Web App (localhost:8087)...
start cmd /k "cd golf-tournament-app && npx expo start --web --port 8087"

echo.
echo ✅ Development environment started!
echo 📊 Backend API: http://localhost:3001/api
echo 🌐 Web App: http://localhost:8087
echo.
echo Press any key to continue...
pause >nul