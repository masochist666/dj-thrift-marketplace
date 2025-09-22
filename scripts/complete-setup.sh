#!/bin/bash

echo "🎶 DJ Thrift Marketplace - Complete Setup"
echo "=========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "Download from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js detected"
node --version

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    echo "Install with: sudo apt-get install postgresql postgresql-contrib"
    echo "Or download from: https://www.postgresql.org/download/"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "⚠️ PostgreSQL is not running. Please start PostgreSQL first."
    echo "Start with: sudo systemctl start postgresql"
    read -p "Press Enter to continue anyway..."
fi

# Check if Redis is installed
if ! command -v redis-cli &> /dev/null; then
    echo "❌ Redis is not installed. Please install Redis first."
    echo "Install with: sudo apt-get install redis-server"
    echo "Or download from: https://redis.io/download"
    exit 1
fi

# Check if Redis is running
if ! redis-cli ping &> /dev/null; then
    echo "⚠️ Redis is not running. Please start Redis first."
    echo "Start with: sudo systemctl start redis"
    read -p "Press Enter to continue anyway..."
fi

echo ""
echo "📦 Installing dependencies..."

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "🔧 Setting up environment files..."

# Copy backend environment file
if [ ! -f backend/.env ]; then
    cp backend/env.example backend/.env
    echo "✅ Created backend/.env file"
    echo "⚠️ Please configure your environment variables in backend/.env"
else
    echo "✅ Backend .env file already exists"
fi

# Copy frontend environment file
if [ ! -f frontend/.env.local ]; then
    cp frontend/env.local.example frontend/.env.local
    echo "✅ Created frontend/.env.local file"
    echo "⚠️ Please configure your environment variables in frontend/.env.local"
else
    echo "✅ Frontend .env.local file already exists"
fi

echo ""
echo "🗄️ Setting up database..."

# Run database migrations
echo "Running database migrations..."
cd backend
npm run migrate
if [ $? -ne 0 ]; then
    echo "❌ Database migration failed. Please check your database connection."
    echo "Make sure PostgreSQL is running and credentials are correct in .env"
    exit 1
fi

# Seed database with sample data
echo "Seeding database with sample data..."
npm run seed
if [ $? -ne 0 ]; then
    echo "⚠️ Database seeding failed, but continuing..."
fi

cd ..

echo ""
echo "🎨 Building frontend..."

# Build frontend
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed. Please check for errors."
    exit 1
fi
cd ..

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "🚀 Next steps:"
echo "1. Configure your environment variables in:"
echo "   - backend/.env (database, AWS, Stripe, etc.)"
echo "   - frontend/.env.local (API URLs)"
echo ""
echo "2. Start the development servers:"
echo "   - Run: ./scripts/run-dev.sh"
echo "   - Or manually: npm run dev"
echo ""
echo "3. Access the application:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:5000"
echo "   - API Docs: http://localhost:5000/api/v1"
echo ""
echo "4. For production deployment:"
echo "   - Run: docker-compose up --build"
echo ""
echo "🎵 Happy coding! The DJ Thrift Marketplace is ready to go!"
echo ""
