@echo off
echo 🎶 DJ Thrift Marketplace - Complete Setup
echo ==========================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js detected
node --version

REM Check if PostgreSQL is installed
pg_isready -q >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️ PostgreSQL is not running. Please start PostgreSQL first.
    echo You can start it with: net start postgresql-x64-15
    echo Or install PostgreSQL from: https://www.postgresql.org/download/
    pause
)

REM Check if Redis is installed
redis-cli ping >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️ Redis is not running. Please start Redis first.
    echo You can start it with: redis-server
    echo Or install Redis from: https://redis.io/download
    pause
)

echo.
echo 📦 Installing dependencies...

REM Install root dependencies
echo Installing root dependencies...
call npm install

REM Install backend dependencies
echo Installing backend dependencies...
cd backend
call npm install
cd ..

REM Install frontend dependencies
echo Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo.
echo 🔧 Setting up environment files...

REM Copy backend environment file
if not exist backend\.env (
    copy backend\env.example backend\.env
    echo ✅ Created backend/.env file
    echo ⚠️ Please configure your environment variables in backend/.env
) else (
    echo ✅ Backend .env file already exists
)

REM Copy frontend environment file
if not exist frontend\.env.local (
    copy frontend\env.local.example frontend\.env.local
    echo ✅ Created frontend/.env.local file
    echo ⚠️ Please configure your environment variables in frontend/.env.local
) else (
    echo ✅ Frontend .env.local file already exists
)

echo.
echo 🗄️ Setting up database...

REM Run database migrations
echo Running database migrations...
cd backend
call npm run migrate
if %errorlevel% neq 0 (
    echo ❌ Database migration failed. Please check your database connection.
    echo Make sure PostgreSQL is running and credentials are correct in .env
    pause
    exit /b 1
)

REM Seed database with sample data
echo Seeding database with sample data...
call npm run seed
if %errorlevel% neq 0 (
    echo ⚠️ Database seeding failed, but continuing...
)

cd ..

echo.
echo 🎨 Building frontend...

REM Build frontend
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Frontend build failed. Please check for errors.
    pause
    exit /b 1
)
cd ..

echo.
echo ✅ Setup completed successfully!
echo.
echo 🚀 Next steps:
echo 1. Configure your environment variables in:
echo    - backend/.env (database, AWS, Stripe, etc.)
echo    - frontend/.env.local (API URLs)
echo.
echo 2. Start the development servers:
echo    - Run: scripts\run-dev.bat
echo    - Or manually: npm run dev
echo.
echo 3. Access the application:
echo    - Frontend: http://localhost:3000
echo    - Backend API: http://localhost:5000
echo    - API Docs: http://localhost:5000/api/v1
echo.
echo 4. For production deployment:
echo    - Run: docker-compose up --build
echo.
echo 🎵 Happy coding! The DJ Thrift Marketplace is ready to go!
echo.
pause

