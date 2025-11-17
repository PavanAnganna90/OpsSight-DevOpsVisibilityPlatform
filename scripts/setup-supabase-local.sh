#!/bin/bash
# Setup Supabase Local Development Environment
# This script sets up Supabase locally using Docker

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== OpsSight Supabase Local Setup ===${NC}\n"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    echo "Please start Docker Desktop and try again"
    exit 1
fi

echo -e "${GREEN}✓ Docker is running${NC}\n"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}Supabase CLI not found. Installing...${NC}"
    
    # Try different installation methods
    if command -v brew &> /dev/null; then
        echo "Installing via Homebrew..."
        brew install supabase/tap/supabase
    elif command -v npm &> /dev/null; then
        echo "Installing via npm..."
        npm install -g supabase
    else
        echo -e "${RED}Error: Cannot install Supabase CLI${NC}"
        echo "Please install manually:"
        echo "  macOS: brew install supabase/tap/supabase"
        echo "  Or: npm install -g supabase"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Supabase CLI installed${NC}\n"

# Initialize Supabase if not already initialized
if [ ! -d "supabase" ]; then
    echo -e "${YELLOW}Initializing Supabase project...${NC}"
    supabase init
    echo -e "${GREEN}✓ Supabase initialized${NC}\n"
else
    echo -e "${GREEN}✓ Supabase already initialized${NC}\n"
fi

# Start Supabase
echo -e "${YELLOW}Starting Supabase local development...${NC}"
supabase start

echo -e "\n${GREEN}=== Supabase Local Setup Complete ===${NC}\n"

# Display status
echo -e "${BLUE}Supabase Status:${NC}"
supabase status

echo -e "\n${BLUE}Access Points:${NC}"
echo -e "  Studio: ${GREEN}http://localhost:54323${NC}"
echo -e "  API URL: ${GREEN}http://localhost:54321${NC}"
echo -e "  DB URL: ${GREEN}postgresql://postgres:postgres@localhost:54322/postgres${NC}"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "  1. Save credentials to .env.local:"
echo "     supabase status > .env.local"
echo "  2. Migrate database schema:"
echo "     ./scripts/migrate-to-supabase-local.sh"
echo "  3. Start frontend:"
echo "     cd frontend && npm run dev"

