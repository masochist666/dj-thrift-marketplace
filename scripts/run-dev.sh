#!/bin/bash

echo "🎶 Starting DJ Thrift Marketplace Development Servers..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if PostgreSQL is running
echo "🗄️ Checking PostgreSQL..."
if ! pg_isready -q; then
    echo "⚠️ PostgreSQL is not running. Please start PostgreSQL first."
    echo "You can start it with: sudo systemctl start postgresql"
    read -p "Press Enter to continue anyway..."
fi

# Check if Redis is running
echo "🔴 Checking Redis..."
if ! redis-cli ping &> /dev/null; then
    echo "⚠️ Redis is not running. Please start Redis first."
    echo "You can start it with: redis-server"
    read -p "Press Enter to continue anyway..."
fi

# Function to cleanup on exit
cleanup() {
    echo "🛑 Stopping all servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend
echo "🔧 Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "✅ Development servers started!"
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop all servers..."

# Wait for user to stop
wait
