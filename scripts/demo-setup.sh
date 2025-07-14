#!/bin/bash
# OpsSight Demo Environment Setup Script
# This script sets up a complete demo environment with all components and mock data

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DEMO_ENV_FILE=".env.demo"
FRONTEND_PORT=3000
BACKEND_PORT=8000
GRAFANA_PORT=3001
PROMETHEUS_PORT=9090
STORYBOOK_PORT=6006

echo -e "${BLUE}🚀 OpsSight Demo Environment Setup${NC}"
echo -e "${BLUE}=====================================${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}⏳ Waiting for ${service_name} to be ready...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ ${service_name} is ready!${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}   Attempt $attempt/$max_attempts - waiting for ${service_name}...${NC}"
        sleep 5
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ ${service_name} failed to start within expected time${NC}"
    return 1
}

# Check prerequisites
echo -e "\n${CYAN}🔍 Checking prerequisites...${NC}"

if ! command_exists docker; then
    echo -e "${RED}❌ Docker is required but not installed${NC}"
    exit 1
fi

if ! command_exists docker-compose; then
    echo -e "${RED}❌ Docker Compose is required but not installed${NC}"
    exit 1
fi

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is required but not installed${NC}"
    exit 1
fi

if ! command_exists python3; then
    echo -e "${RED}❌ Python 3 is required but not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites are installed${NC}"

# Create demo environment file
echo -e "\n${CYAN}📝 Setting up demo environment configuration...${NC}"

cat > $DEMO_ENV_FILE << EOF
# OpsSight Demo Environment Configuration
# This file contains all the configuration needed for the demo environment

# ============================================================================
# Application Configuration
# ============================================================================
NODE_ENV=development
ENVIRONMENT=demo
DEBUG=true

# ============================================================================
# Database Configuration
# ============================================================================
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opsight
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=opsight

# ============================================================================
# API Configuration
# ============================================================================
CORS_ORIGINS=http://localhost:${FRONTEND_PORT}
API_BASE_URL=http://localhost:${BACKEND_PORT}
NEXT_PUBLIC_API_URL=http://localhost:${BACKEND_PORT}

# ============================================================================
# Authentication (Demo Credentials)
# ============================================================================
SECRET_KEY=demo_secret_key_not_for_production_use_only
JWT_SECRET=demo_jwt_secret_not_for_production
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=30

# GitHub OAuth (Demo - these won't work for real OAuth)
GITHUB_CLIENT_ID=demo_github_client_id
GITHUB_CLIENT_SECRET=demo_github_client_secret
NEXT_PUBLIC_GITHUB_CLIENT_ID=demo_github_client_id

# ============================================================================
# External Services (Demo Mode)
# ============================================================================
# Slack Integration (Demo)
SLACK_BOT_TOKEN=xoxb-demo-token
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/demo/webhook
SLACK_CLIENT_ID=demo_slack_client_id
SLACK_CLIENT_SECRET=demo_slack_client_secret

# Email Service (Demo - uses local SMTP)
SMTP_SERVER=localhost
SMTP_PORT=1025
SMTP_USERNAME=demo
SMTP_PASSWORD=demo
FROM_EMAIL=demo@opsight.local

# ============================================================================
# Monitoring Configuration
# ============================================================================
PROMETHEUS_MULTIPROC_DIR=/tmp/metrics
PROMETHEUS_METRICS_PORT=9090
GRAFANA_ADMIN_PASSWORD=admin

# ============================================================================
# Frontend Configuration
# ============================================================================
NEXT_PUBLIC_APP_VERSION=1.0.0-demo
NEXT_PUBLIC_APP_NAME=OpsSight Demo
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_STORYBOOK_URL=http://localhost:${STORYBOOK_PORT}

# ============================================================================
# Demo Data Configuration
# ============================================================================
DEMO_MODE=true
SEED_DATA=true
MOCK_EXTERNAL_APIS=true
DEMO_USER_EMAIL=demo@opsight.local
DEMO_USER_NAME=Demo User
EOF

echo -e "${GREEN}✅ Demo environment file created: ${DEMO_ENV_FILE}${NC}"

# Copy to required locations
cp $DEMO_ENV_FILE .env
cp $DEMO_ENV_FILE frontend/.env.local
cp $DEMO_ENV_FILE backend/.env

# Install frontend dependencies
echo -e "\n${CYAN}📦 Installing frontend dependencies...${NC}"
cd frontend
npm install --silent
cd ..

# Install backend dependencies
echo -e "\n${CYAN}🐍 Installing backend dependencies...${NC}"
cd backend
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install -r requirements.txt --quiet
cd ..

# Start Docker services
echo -e "\n${CYAN}🐳 Starting Docker services...${NC}"
docker-compose down --remove-orphans >/dev/null 2>&1 || true
docker-compose up -d --build

# Wait for database to be ready
wait_for_service "http://localhost:5432" "PostgreSQL" || true

# Run database migrations and seed data
echo -e "\n${CYAN}🌱 Setting up database and seed data...${NC}"
cd backend
source .venv/bin/activate

# Create database tables
python -c "
from app.database.database import init_db
init_db()
print('✅ Database tables created')
"

# Run seed data script
python app/scripts/seed_data.py
echo -e "${GREEN}✅ Mock data seeded successfully${NC}"
cd ..

# Start backend server in background
echo -e "\n${CYAN}🚀 Starting backend server...${NC}"
cd backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT --reload &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
wait_for_service "http://localhost:${BACKEND_PORT}/api/v1/health" "Backend API"

# Start frontend in background
echo -e "\n${CYAN}⚡ Starting frontend development server...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to be ready
wait_for_service "http://localhost:${FRONTEND_PORT}" "Frontend"

# Start Storybook in background
echo -e "\n${CYAN}📚 Starting Storybook...${NC}"
cd frontend
npm run storybook -- --port $STORYBOOK_PORT --quiet &
STORYBOOK_PID=$!
cd ..

# Wait for Storybook to be ready
wait_for_service "http://localhost:${STORYBOOK_PORT}" "Storybook"

# Create cleanup script
cat > cleanup-demo.sh << EOF
#!/bin/bash
echo "🧹 Cleaning up OpsSight demo environment..."

# Kill background processes
kill $BACKEND_PID 2>/dev/null || true
kill $FRONTEND_PID 2>/dev/null || true
kill $STORYBOOK_PID 2>/dev/null || true

# Stop Docker services
docker-compose down --remove-orphans

# Clean up environment files
rm -f $DEMO_ENV_FILE .env frontend/.env.local backend/.env

echo "✅ Demo environment cleaned up"
EOF

chmod +x cleanup-demo.sh

# Generate demo access information
echo -e "\n${GREEN}🎉 OpsSight Demo Environment is Ready!${NC}"
echo -e "${GREEN}=================================${NC}"
echo ""
echo -e "${PURPLE}📱 Main Application:${NC}"
echo -e "   🌐 Frontend:           ${CYAN}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "   📊 Demo Dashboard:     ${CYAN}http://localhost:${FRONTEND_PORT}/dashboard${NC}"
echo -e "   ⚙️  Settings:           ${CYAN}http://localhost:${FRONTEND_PORT}/settings${NC}"
echo ""
echo -e "${PURPLE}🔧 Development Tools:${NC}"
echo -e "   🛠️  API Documentation:  ${CYAN}http://localhost:${BACKEND_PORT}/docs${NC}"
echo -e "   📚 Storybook:          ${CYAN}http://localhost:${STORYBOOK_PORT}${NC}"
echo -e "   🔍 API Health:         ${CYAN}http://localhost:${BACKEND_PORT}/api/v1/health${NC}"
echo ""
echo -e "${PURPLE}📊 Monitoring Stack:${NC}"
echo -e "   📈 Grafana:            ${CYAN}http://localhost:${GRAFANA_PORT}${NC} (admin/admin)"
echo -e "   📊 Prometheus:         ${CYAN}http://localhost:${PROMETHEUS_PORT}${NC}"
echo -e "   🚨 AlertManager:       ${CYAN}http://localhost:9093${NC}"
echo ""
echo -e "${PURPLE}🎮 Demo Features:${NC}"
echo -e "   👤 Demo User:          ${CYAN}demo@opsight.local${NC}"
echo -e "   🎨 All 7 Themes:       ${CYAN}Available in Settings${NC}"
echo -e "   📱 Responsive Design:  ${CYAN}Test on mobile/tablet${NC}"
echo -e "   🌓 Color Modes:        ${CYAN}Light/Dark/High-contrast${NC}"
echo -e "   ♿ Accessibility:      ${CYAN}Full WCAG 2.1 AA support${NC}"
echo ""
echo -e "${PURPLE}📊 Mock Data Available:${NC}"
echo -e "   • 3 Teams with different roles"
echo -e "   • 2 Projects with complete DevOps pipelines"
echo -e "   • CI/CD pipeline data with success/failure rates"
echo -e "   • Kubernetes cluster metrics and health data"
echo -e "   • Ansible automation coverage reports"
echo -e "   • Infrastructure change tracking"
echo -e "   • Alert notifications and history"
echo -e "   • Git activity heatmaps"
echo -e "   • AWS cost analytics"
echo ""
echo -e "${YELLOW}💡 Quick Start Guide:${NC}"
echo -e "   1. Visit ${CYAN}http://localhost:${FRONTEND_PORT}${NC} to see the main dashboard"
echo -e "   2. Explore ${CYAN}http://localhost:${FRONTEND_PORT}/settings${NC} to test themes"
echo -e "   3. Check ${CYAN}http://localhost:${STORYBOOK_PORT}${NC} for component documentation"
echo -e "   4. View ${CYAN}http://localhost:${BACKEND_PORT}/docs${NC} for API details"
echo -e "   5. Monitor with ${CYAN}http://localhost:${GRAFANA_PORT}${NC} (admin/admin)"
echo ""
echo -e "${RED}🛑 To stop the demo:${NC}"
echo -e "   Run: ${CYAN}./cleanup-demo.sh${NC}"
echo ""
echo -e "${GREEN}🎊 Enjoy exploring OpsSight!${NC}"

# Save URLs to a file for easy reference
cat > demo-urls.txt << EOF
OpsSight Demo Environment URLs
==============================

Main Application:
- Frontend: http://localhost:${FRONTEND_PORT}
- Dashboard: http://localhost:${FRONTEND_PORT}/dashboard
- Settings: http://localhost:${FRONTEND_PORT}/settings

Development Tools:
- API Docs: http://localhost:${BACKEND_PORT}/docs
- Storybook: http://localhost:${STORYBOOK_PORT}
- API Health: http://localhost:${BACKEND_PORT}/api/v1/health

Monitoring:
- Grafana: http://localhost:${GRAFANA_PORT} (admin/admin)
- Prometheus: http://localhost:${PROMETHEUS_PORT}
- AlertManager: http://localhost:9093

Demo Credentials:
- Demo User: demo@opsight.local
- Grafana: admin/admin

Cleanup:
- Run: ./cleanup-demo.sh
EOF

echo -e "${CYAN}📄 URLs saved to demo-urls.txt for reference${NC}" 