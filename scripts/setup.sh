#!/bin/bash

# DJ Thrift Marketplace Setup Script
echo "🎶 Setting up DJ Thrift Marketplace..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Setup backend
echo "🔧 Setting up backend..."
cd backend
npm install

# Copy environment file
if [ ! -f .env ]; then
    cp env.example .env
    echo "📝 Created .env file. Please configure your environment variables."
fi

cd ..

# Setup frontend
echo "🎨 Setting up frontend..."
cd frontend
npm install

# Copy environment file
if [ ! -f .env.local ]; then
    cp .env.local.example .env.local
    echo "📝 Created .env.local file. Please configure your environment variables."
fi

cd ..

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p backend/logs

# Check if PostgreSQL is running
echo "🗄️ Checking PostgreSQL..."
if ! pg_isready -q; then
    echo "⚠️ PostgreSQL is not running. Please start PostgreSQL before running the application."
fi

# Check if Redis is running
echo "🔴 Checking Redis..."
if ! redis-cli ping &> /dev/null; then
    echo "⚠️ Redis is not running. Please start Redis before running the application."
fi

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure your environment variables in backend/.env and frontend/.env.local"
echo "2. Start PostgreSQL and Redis"
echo "3. Run 'npm run migrate' to set up the database"
echo "4. Run 'npm run dev' to start the development servers"
echo ""
echo "Happy coding! 🎵"

