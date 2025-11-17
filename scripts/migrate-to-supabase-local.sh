#!/bin/bash
# Migrate Database to Local Supabase
# Exports from current PostgreSQL and imports to local Supabase

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Database Migration to Local Supabase ===${NC}\n"

# Check if Supabase is running
if ! supabase status > /dev/null 2>&1; then
    echo -e "${RED}Error: Supabase is not running${NC}"
    echo "Please start Supabase first:"
    echo "  supabase start"
    echo "  Or run: ./scripts/setup-supabase-local.sh"
    exit 1
fi

# Get Supabase database URL
SUPABASE_DB_URL="postgresql://postgres:postgres@localhost:54322/postgres"

# Source database configuration
# Try Docker container first, then localhost
SOURCE_HOST="${SOURCE_HOST:-opssightdevopsvisibilityplatform-db-1}"
SOURCE_PORT="${SOURCE_PORT:-5432}"
SOURCE_DB="${SOURCE_DB:-opsight}"
SOURCE_USER="${SOURCE_USER:-postgres}"

# Check if using Docker container
if docker ps | grep -q "$SOURCE_HOST"; then
    echo "Using Docker container: $SOURCE_HOST"
    USE_DOCKER=true
else
    echo "Using localhost PostgreSQL"
    SOURCE_HOST="localhost"
    USE_DOCKER=false
fi

MIGRATION_DIR="./supabase_migration"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$MIGRATION_DIR"
cd "$MIGRATION_DIR"

echo -e "${YELLOW}Step 1: Exporting schema from source database...${NC}"

if [ "$USE_DOCKER" = true ]; then
    # Export from Docker container
    docker exec "$SOURCE_HOST" pg_dump \
      -U "$SOURCE_USER" \
      -d "$SOURCE_DB" \
      --schema-only \
      --no-owner \
      --no-privileges \
      > "schema_$TIMESTAMP.sql" 2>&1 || {
        echo -e "${RED}Error: Failed to export schema from Docker container${NC}"
        exit 1
      }
else
    # Export from localhost
    PGPASSWORD="${SOURCE_PASSWORD:-postgres}" pg_dump \
      -h "$SOURCE_HOST" \
      -U "$SOURCE_USER" \
      -p "$SOURCE_PORT" \
      -d "$SOURCE_DB" \
      --schema-only \
      --no-owner \
      --no-privileges \
      -f "schema_$TIMESTAMP.sql" \
      2>&1 | grep -v "password:" || {
        echo -e "${RED}Error: Failed to export schema${NC}"
        echo "Make sure PostgreSQL is running and credentials are correct"
        exit 1
      }
fi

echo -e "${GREEN}✓ Schema exported${NC}\n"

# Ask about data migration (skip if --no-data flag is set)
if [ "$1" = "--no-data" ]; then
    EXPORT_DATA=false
    echo -e "${YELLOW}Skipping data export (--no-data flag set)${NC}\n"
elif [ "$1" = "--with-data" ]; then
    EXPORT_DATA=true
    echo -e "${YELLOW}Exporting data (--with-data flag set)${NC}\n"
else
    read -p "Export data as well? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        EXPORT_DATA=true
    else
        EXPORT_DATA=false
    fi
fi

if [ "$EXPORT_DATA" = true ]; then
    echo -e "${YELLOW}Step 2: Exporting data...${NC}"
    
    if [ "$USE_DOCKER" = true ]; then
        docker exec "$SOURCE_HOST" pg_dump \
          -U "$SOURCE_USER" \
          -d "$SOURCE_DB" \
          --data-only \
          --no-owner \
          --no-privileges \
          > "data_$TIMESTAMP.sql" 2>&1 || {
            echo -e "${RED}Error: Failed to export data from Docker container${NC}"
            exit 1
          }
    else
        PGPASSWORD="${SOURCE_PASSWORD:-postgres}" pg_dump \
          -h "$SOURCE_HOST" \
          -U "$SOURCE_USER" \
          -p "$SOURCE_PORT" \
          -d "$SOURCE_DB" \
          --data-only \
          --no-owner \
          --no-privileges \
          -f "data_$TIMESTAMP.sql" \
          2>&1 | grep -v "password:" || {
            echo -e "${RED}Error: Failed to export data${NC}"
            exit 1
          }
    fi
    echo -e "${GREEN}✓ Data exported${NC}\n"
fi

echo -e "${YELLOW}Step 3: Resetting Supabase database...${NC}"
cd ..
supabase db reset --db-url "$SUPABASE_DB_URL" || {
    echo -e "${YELLOW}Warning: Could not reset via CLI, importing directly...${NC}"
}

echo -e "${YELLOW}Step 4: Importing schema to Supabase...${NC}"
psql "$SUPABASE_DB_URL" -f "$MIGRATION_DIR/schema_$TIMESTAMP.sql" \
  2>&1 | grep -v "password:" || {
    echo -e "${RED}Error: Failed to import schema${NC}"
    exit 1
  }

echo -e "${GREEN}✓ Schema imported${NC}\n"

if [ "$EXPORT_DATA" = true ]; then
    echo -e "${YELLOW}Step 5: Importing data...${NC}"
    psql "$SUPABASE_DB_URL" -f "$MIGRATION_DIR/data_$TIMESTAMP.sql" \
      2>&1 | grep -v "password:" || {
        echo -e "${RED}Error: Failed to import data${NC}"
        exit 1
      }
    echo -e "${GREEN}✓ Data imported${NC}\n"
fi

echo -e "${YELLOW}Step 6: Updating statistics...${NC}"
psql "$SUPABASE_DB_URL" -c "VACUUM ANALYZE;" \
  2>&1 | grep -v "password:" || echo -e "${YELLOW}Warning: Could not update statistics${NC}"

echo -e "\n${GREEN}=== Migration Complete ===${NC}\n"

echo -e "${BLUE}Verification:${NC}"
psql "$SUPABASE_DB_URL" -c "\dt" 2>&1 | grep -v "password:" | head -20

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "  1. Review schema in Supabase Studio: http://localhost:54323"
echo "  2. Set up Row-Level Security (RLS) policies"
echo "  3. Update application to use Supabase"
echo "  4. Test the application"

