#!/bin/bash
# Quick Demo Launch Script for OpsSight Platform
# This script provides immediate access to the platform with minimal setup

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 OpsSight Quick Demo Launch${NC}"
echo -e "${BLUE}============================${NC}"

# Check if Docker Compose is running
if ! docker-compose ps | grep -q "Up"; then
    echo -e "${YELLOW}⚡ Starting Docker services...${NC}"
    docker-compose up -d
    sleep 10
fi

# Quick environment setup
export NODE_ENV=development
export NEXT_PUBLIC_API_URL=http://localhost:8000
export NEXT_PUBLIC_DEMO_MODE=true

echo -e "\n${GREEN}🎉 OpsSight Demo is Ready!${NC}"
echo -e "${GREEN}========================${NC}"
echo ""
echo -e "${CYAN}🌐 Primary Demo URL:    http://localhost:3000${NC}"
echo -e "${CYAN}📚 Component Library:   http://localhost:6006${NC}"
echo -e "${CYAN}🛠️  API Documentation:  http://localhost:8000/docs${NC}"
echo -e "${CYAN}📊 Monitoring:          http://localhost:3001 (admin/admin)${NC}"
echo ""
echo -e "${YELLOW}💡 For full setup with mock data, run: ./scripts/demo-setup.sh${NC}"

# Open browser automatically (optional)
if command -v open >/dev/null 2>&1; then
    echo -e "${CYAN}🌐 Opening demo in browser...${NC}"
    open http://localhost:3000
elif command -v xdg-open >/dev/null 2>&1; then
    echo -e "${CYAN}🌐 Opening demo in browser...${NC}"
    xdg-open http://localhost:3000
fi

echo -e "\n${GREEN}✨ Enjoy exploring OpsSight!${NC}" 