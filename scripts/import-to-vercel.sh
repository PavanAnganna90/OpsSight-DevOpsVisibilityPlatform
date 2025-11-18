#!/bin/bash
# Script to help import environment variables to Vercel
# This script displays the variables in a format easy to copy-paste

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Vercel Environment Variables Import Helper             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ ! -f "import.env" ]; then
    echo -e "${RED}Error: import.env file not found${NC}"
    echo "Please ensure import.env exists in the project root"
    exit 1
fi

echo -e "${GREEN}Reading environment variables from import.env...${NC}"
echo ""

# Extract variables (excluding comments and empty lines)
echo -e "${YELLOW}=== REQUIRED VARIABLES ===${NC}"
echo ""
grep -v '^#' import.env | grep -v '^$' | grep -E '^(DATABASE_BACKEND|NEXT_PUBLIC_SUPABASE|SUPABASE_SERVICE_ROLE_KEY|NODE_ENV|NEXT_PUBLIC_APP)' | while IFS='=' read -r key value; do
    echo -e "${GREEN}$key${NC}=${value}"
done

echo ""
echo -e "${YELLOW}=== OPTIONAL VARIABLES (Commented out) ===${NC}"
echo ""
grep '^#.*=' import.env | sed 's/^# /  /' | head -10

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Go to: https://vercel.com/dashboard"
echo "2. Select your project → Settings → Environment Variables"
echo "3. Copy each variable above and add to Vercel"
echo "4. Or use Vercel CLI: vercel env add <VARIABLE_NAME>"
echo ""
echo -e "${YELLOW}Using Vercel CLI? Run:${NC}"
echo "  vercel env add DATABASE_BACKEND"
echo "  vercel env add NEXT_PUBLIC_SUPABASE_URL"
echo "  vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  vercel env add SUPABASE_SERVICE_ROLE_KEY"
echo "  vercel env add NODE_ENV"
echo ""

