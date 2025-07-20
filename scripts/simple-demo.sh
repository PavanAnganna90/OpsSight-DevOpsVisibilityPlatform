#!/bin/bash
# Simple OpsSight Demo Script (No Docker Compose Required)
# This script launches the frontend and backend directly for immediate testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_PORT=3000
BACKEND_PORT=8000
STORYBOOK_PORT=6006

echo -e "${BLUE}🚀 OpsSight Simple Demo Setup${NC}"
echo -e "${BLUE}=============================${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "\n${CYAN}🔍 Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is required but not installed${NC}"
    echo -e "${YELLOW}📥 Install Node.js from: https://nodejs.org/${NC}"
    exit 1
fi

if ! command_exists python3; then
    echo -e "${RED}❌ Python 3 is required but not installed${NC}"
    echo -e "${YELLOW}📥 Install Python 3 from: https://python.org/${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites are installed${NC}"

# Create simple environment file
echo -e "\n${CYAN}📝 Setting up environment configuration...${NC}"

cat > .env.simple << EOF
# Simple Demo Environment Configuration
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:${BACKEND_PORT}
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_APP_VERSION=1.0.0-demo
NEXT_PUBLIC_STORYBOOK_URL=http://localhost:${STORYBOOK_PORT}
DEMO_MODE=true
EOF

# Copy environment file
cp .env.simple frontend/.env.local
cp .env.simple backend/.env

# Install frontend dependencies
echo -e "\n${CYAN}📦 Installing frontend dependencies...${NC}"
cd frontend
npm install
cd ..

# Check if backend virtual environment exists
echo -e "\n${CYAN}🐍 Setting up backend...${NC}"
cd backend
if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}Creating Python virtual environment...${NC}"
    python3 -m venv .venv
fi

echo -e "${YELLOW}Activating virtual environment and installing dependencies...${NC}"
source .venv/bin/activate
pip install -r requirements.txt
cd ..

# Create process management script
cat > start-services.sh << 'EOF'
#!/bin/bash

# Function to cleanup on exit
cleanup() {
    echo "🧹 Stopping services..."
    kill $FRONTEND_PID 2>/dev/null || true
    kill $BACKEND_PID 2>/dev/null || true
    kill $STORYBOOK_PID 2>/dev/null || true
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup EXIT INT TERM

echo "🚀 Starting OpsSight services..."

# Start backend
echo "📡 Starting backend API..."
cd backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Give backend time to start
sleep 3

# Start frontend
echo "⚡ Starting frontend..."
cd frontend
npm run dev -- --port 3000 &
FRONTEND_PID=$!
cd ..

# Start Storybook
echo "📚 Starting Storybook..."
cd frontend
npm run storybook -- --port 6006 --quiet &
STORYBOOK_PID=$!
cd ..

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

echo ""
echo "🎉 OpsSight Demo is Ready!"
echo "========================"
echo ""
echo "🌐 Primary Demo:        http://localhost:3000"
echo "📚 Component Library:   http://localhost:6006"
echo "🛠️  API Documentation:  http://localhost:8000/docs"
echo "🔍 API Health:          http://localhost:8000/api/v1/health"
echo ""
echo "💡 Press Ctrl+C to stop all services"
echo ""

# Keep script running
wait
EOF

chmod +x start-services.sh

# Create a simple cleanup script
cat > stop-demo.sh << EOF
#!/bin/bash
echo "🧹 Stopping OpsSight demo..."

# Kill any running processes on demo ports
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:6006 | xargs kill -9 2>/dev/null || true

# Clean up environment files
rm -f .env.simple frontend/.env.local backend/.env start-services.sh

echo "✅ Demo stopped and cleaned up"
EOF

chmod +x stop-demo.sh

echo -e "\n${GREEN}🎉 Setup Complete!${NC}"
echo -e "${GREEN}================${NC}"
echo ""
echo -e "${PURPLE}🚀 To start the demo:${NC}"
echo -e "   ${CYAN}./start-services.sh${NC}"
echo ""
echo -e "${PURPLE}🛑 To stop the demo:${NC}"
echo -e "   ${CYAN}./stop-demo.sh${NC} (or Ctrl+C in the running terminal)"
echo ""
echo -e "${YELLOW}📝 Note: This simplified setup runs without Docker.${NC}"
echo -e "${YELLOW}   For full features including monitoring, install Docker Compose.${NC}"
echo ""

# Ask if user wants to start now
echo -e "${CYAN}🤔 Would you like to start the demo now? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo -e "${GREEN}🚀 Starting demo...${NC}"
    ./start-services.sh
fi 