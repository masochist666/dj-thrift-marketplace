@echo off
echo 🎶 Setting up DJ Thrift Marketplace...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo ✅ Node.js detected
node --version

REM Install root dependencies
echo 📦 Installing root dependencies...
call npm install

REM Setup backend
echo 🔧 Setting up backend...
cd backend
call npm install

REM Copy environment file
if not exist .env (
    copy env.example .env
    echo 📝 Created .env file. Please configure your environment variables.
)

cd ..

REM Setup frontend
echo 🎨 Setting up frontend...
cd frontend
call npm install

REM Copy environment file
if not exist .env.local (
    copy .env.local.example .env.local
    echo 📝 Created .env.local file. Please configure your environment variables.
)

cd ..

REM Create logs directory
echo 📁 Creating logs directory...
if not exist backend\logs mkdir backend\logs

echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Configure your environment variables in backend\.env and frontend\.env.local
echo 2. Start PostgreSQL and Redis
echo 3. Run 'npm run migrate' to set up the database
echo 4. Run 'npm run dev' to start the development servers
echo.
echo Happy coding! 🎵
pause

