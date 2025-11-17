#!/bin/bash
# Create Schema in Supabase from Alembic Migrations
# This script runs Alembic migrations against Supabase

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Creating Schema in Supabase from Alembic Migrations ===${NC}\n"

# Get Supabase database URL
SUPABASE_DB_URL="postgresql://postgres:postgres@localhost:54322/postgres"

# Check if Supabase is running
if ! supabase status > /dev/null 2>&1; then
    echo -e "${RED}Error: Supabase is not running${NC}"
    echo "Please start Supabase first: supabase start"
    exit 1
fi

echo -e "${GREEN}✓ Supabase is running${NC}\n"

# Update Alembic config to point to Supabase
echo -e "${YELLOW}Step 1: Updating Alembic configuration...${NC}"
cd backend

# Backup original alembic.ini
cp alembic.ini alembic.ini.backup

# Update database URL in alembic.ini
sed -i '' "s|sqlalchemy.url = .*|sqlalchemy.url = $SUPABASE_DB_URL|g" alembic.ini

echo -e "${GREEN}✓ Alembic config updated${NC}\n"

# Activate virtual environment and run migrations
echo -e "${YELLOW}Step 2: Running Alembic migrations...${NC}"

if [ -d ".venv" ]; then
    source .venv/bin/activate
else
    echo -e "${YELLOW}Warning: Virtual environment not found. Using system Python.${NC}"
fi

# Install dependencies if needed
pip install -q alembic sqlalchemy asyncpg psycopg2-binary 2>/dev/null || true

# Run migrations
alembic upgrade head || {
    echo -e "${RED}Error: Failed to run migrations${NC}"
    # Restore backup
    mv alembic.ini.backup alembic.ini
    exit 1
}

echo -e "${GREEN}✓ Migrations completed${NC}\n"

# Restore original alembic.ini
mv alembic.ini.backup alembic.ini

# Verify tables were created
echo -e "${YELLOW}Step 3: Verifying schema...${NC}"
psql "$SUPABASE_DB_URL" -c "\dt" 2>&1 | head -30

echo -e "\n${GREEN}=== Schema Creation Complete ===${NC}"
echo -e "View your schema in Supabase Studio: http://localhost:54323"

