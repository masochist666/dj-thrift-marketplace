@echo off
echo 🎶 Starting DJ Thrift Marketplace Development Servers...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

REM Check if PostgreSQL is running
echo 🗄️ Checking PostgreSQL...
pg_isready -q
if %errorlevel% neq 0 (
    echo ⚠️ PostgreSQL is not running. Please start PostgreSQL first.
    echo You can start it with: net start postgresql-x64-15
    pause
)

REM Check if Redis is running
echo 🔴 Checking Redis...
redis-cli ping >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️ Redis is not running. Please start Redis first.
    echo You can start it with: redis-server
    pause
)

REM Start backend
echo 🔧 Starting backend server...
start "DJ Thrift Backend" cmd /k "cd backend && npm run dev"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
echo 🎨 Starting frontend server...
start "DJ Thrift Frontend" cmd /k "cd frontend && npm run dev"

echo ✅ Development servers started!
echo.
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:5000
echo.
echo Press any key to stop all servers...
pause >nul

REM Kill all Node.js processes
taskkill /f /im node.exe >nul 2>&1
echo 🛑 All servers stopped.
pause
