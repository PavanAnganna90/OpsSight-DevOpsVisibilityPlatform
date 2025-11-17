#!/bin/bash
# OpsSight Database Migration Script: PostgreSQL → Supabase
# This script exports the current database and imports it to Supabase

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SOURCE_HOST="${SOURCE_HOST:-localhost}"
SOURCE_PORT="${SOURCE_PORT:-5432}"
SOURCE_DB="${SOURCE_DB:-opsight_dev}"
SOURCE_USER="${SOURCE_USER:-postgres}"
MIGRATION_DIR="./supabase_migration"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${GREEN}=== OpsSight Database Migration to Supabase ===${NC}\n"

# Check if Supabase connection string is set
if [ -z "$SUPABASE_DB_URL" ]; then
    echo -e "${RED}Error: SUPABASE_DB_URL environment variable is not set${NC}"
    echo "Please set it to your Supabase connection string:"
    echo "export SUPABASE_DB_URL='postgresql://postgres.xxxx:password@xxxx.pooler.supabase.com:5432/postgres'"
    exit 1
fi

# Create migration directory
mkdir -p "$MIGRATION_DIR"
cd "$MIGRATION_DIR"

echo -e "${YELLOW}Step 1: Exporting schema from source database...${NC}"
pg_dump \
  -h "$SOURCE_HOST" \
  -U "$SOURCE_USER" \
  -p "$SOURCE_PORT" \
  -d "$SOURCE_DB" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --format=directory \
  -f "schema_dump_$TIMESTAMP" \
  || {
    echo -e "${RED}Error: Failed to export schema${NC}"
    exit 1
  }

echo -e "${GREEN}✓ Schema exported successfully${NC}\n"

# Ask if user wants to export data
read -p "Do you want to export data as well? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Step 2: Exporting data from source database...${NC}"
    pg_dump \
      -h "$SOURCE_HOST" \
      -U "$SOURCE_USER" \
      -p "$SOURCE_PORT" \
      -d "$SOURCE_DB" \
      --data-only \
      --no-owner \
      --no-privileges \
      --format=directory \
      -f "data_dump_$TIMESTAMP" \
      || {
        echo -e "${RED}Error: Failed to export data${NC}"
        exit 1
      }
    echo -e "${GREEN}✓ Data exported successfully${NC}\n"
    EXPORT_DATA=true
else
    EXPORT_DATA=false
fi

echo -e "${YELLOW}Step 3: Importing schema to Supabase...${NC}"
pg_restore \
  --dbname="$SUPABASE_DB_URL" \
  --format=directory \
  --schema-only \
  --no-owner \
  --no-privileges \
  --single-transaction \
  --verbose \
  "schema_dump_$TIMESTAMP" \
  2>&1 | tee "restore_schema_$TIMESTAMP.log" \
  || {
    echo -e "${RED}Error: Failed to import schema${NC}"
    echo "Check restore_schema_$TIMESTAMP.log for details"
    exit 1
  }

echo -e "${GREEN}✓ Schema imported successfully${NC}\n"

if [ "$EXPORT_DATA" = true ]; then
    echo -e "${YELLOW}Step 4: Importing data to Supabase...${NC}"
    pg_restore \
      --dbname="$SUPABASE_DB_URL" \
      --format=directory \
      --data-only \
      --no-owner \
      --no-privileges \
      --jobs=4 \
      --verbose \
      "data_dump_$TIMESTAMP" \
      2>&1 | tee "restore_data_$TIMESTAMP.log" \
      || {
        echo -e "${RED}Error: Failed to import data${NC}"
        echo "Check restore_data_$TIMESTAMP.log for details"
        exit 1
      }
    echo -e "${GREEN}✓ Data imported successfully${NC}\n"
fi

echo -e "${YELLOW}Step 5: Updating database statistics...${NC}"
psql "$SUPABASE_DB_URL" -c "VACUUM VERBOSE ANALYZE;" \
  || {
    echo -e "${YELLOW}Warning: Failed to update statistics (non-critical)${NC}"
  }

echo -e "${GREEN}✓ Statistics updated${NC}\n"

echo -e "${YELLOW}Step 6: Verifying migration...${NC}"
echo "Tables in Supabase:"
psql "$SUPABASE_DB_URL" -c "\dt" || echo -e "${YELLOW}Warning: Could not list tables${NC}"

echo -e "\n${GREEN}=== Migration Complete ===${NC}"
echo -e "Migration files saved in: $MIGRATION_DIR"
echo -e "Next steps:"
echo -e "  1. Review the imported schema in Supabase dashboard"
echo -e "  2. Set up Row-Level Security (RLS) policies"
echo -e "  3. Update application connection strings"
echo -e "  4. Test the application with Supabase"

