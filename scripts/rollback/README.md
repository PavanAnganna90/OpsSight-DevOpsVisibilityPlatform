# OpsSight Database Rollback System

A comprehensive database rollback and backup management system for the OpsSight DevOps Platform.

## Features

- **Schema Rollback**: Rollback database schema using Alembic migrations
- **Data Rollback**: Restore database from backup files
- **Full Rollback**: Combined schema and data rollback
- **Backup Management**: Create, list, verify, and cleanup backups
- **Dry Run Mode**: Test rollback operations without making changes
- **Validation**: Post-rollback state validation
- **Comprehensive Logging**: Detailed logging with timestamps

## Prerequisites

- PostgreSQL client tools (`pg_dump`, `psql`)
- Python 3.8+
- Alembic (for schema rollback)
- Database connection configured in environment

## Installation

```bash
# Install required tools (Ubuntu/Debian)
sudo apt-get install postgresql-client

# Install Python dependencies
pip install -r requirements.txt
```

## Usage

### Basic Commands

```bash
# Create a backup
python scripts/rollback/rollback_procedures.py --create-backup

# List available backups
python scripts/rollback/rollback_procedures.py --list-backups

# Verify backup integrity
python scripts/rollback/rollback_procedures.py --verify-backup backups/backup_staging_20240115_143000.sql

# Schema rollback to specific revision
python scripts/rollback/rollback_procedures.py --type schema --to-revision abc123def456

# Data rollback from backup
python scripts/rollback/rollback_procedures.py --type data --backup-file backups/backup_staging_20240115_143000.sql

# Full rollback (schema + data)
python scripts/rollback/rollback_procedures.py --type full --to-revision abc123def456 --backup-file backups/backup_staging_20240115_143000.sql
```

### Environment-Specific Operations

```bash
# Production environment
python scripts/rollback/rollback_procedures.py --environment production --create-backup

# Staging environment (default)
python scripts/rollback/rollback_procedures.py --environment staging --create-backup
```

### Dry Run Mode

```bash
# Test rollback without making changes
python scripts/rollback/rollback_procedures.py --type schema --to-revision abc123def456 --dry-run
```

### Backup Management

```bash
# Clean up backups older than 30 days
python scripts/rollback/rollback_procedures.py --cleanup-backups 30

# Clean up migration artifacts
python scripts/rollback/rollback_procedures.py --cleanup
```

## Configuration

### Environment Variables

```bash
# Database connection
export DATABASE_URL="postgresql://username:password@localhost:5432/opssight"

# Or individual components
export PGHOST="localhost"
export PGPORT="5432"
export PGUSER="postgres"
export PGPASSWORD="password"
export PGDATABASE="opssight"
```

### Settings

The script uses the application's settings from `app.core.config` for database connection details.

## Backup File Format

Backup files are created in the following format:
- **Location**: `backups/` directory
- **Naming**: `backup_{environment}_{timestamp}.sql`
- **Example**: `backup_staging_20240115_143000.sql`

## Safety Features

1. **Automatic Backup**: Creates backup before any rollback operation
2. **Connection Termination**: Safely terminates database connections before restoration
3. **Integrity Verification**: Verifies backup files before restoration
4. **Dry Run Mode**: Test operations without making changes
5. **Comprehensive Logging**: Detailed logging for audit trails
6. **Validation**: Post-rollback state validation

## Rollback Types

### Schema Rollback
- Uses Alembic to downgrade database schema
- Requires target revision ID
- Creates backup before rollback
- Validates revision exists

### Data Rollback
- Restores database from backup file
- Drops and recreates database
- Verifies backup integrity
- Handles connection management

### Full Rollback
- Combines data and schema rollback
- Executes data rollback first (if backup provided)
- Then executes schema rollback
- Provides complete restoration

## Error Handling

The system includes comprehensive error handling:
- **Connection Errors**: Graceful handling of database connection issues
- **File Errors**: Validation of backup file existence and integrity
- **Command Errors**: Proper error reporting for failed operations
- **Rollback on Failure**: Automatic rollback on database restoration errors

## Logging

Logs are created in the following format:
- **Filename**: `rollback_{environment}_{timestamp}.log`
- **Level**: INFO, WARNING, ERROR, CRITICAL
- **Output**: Both file and console

## Best Practices

1. **Always Test First**: Use `--dry-run` before actual rollback
2. **Verify Backups**: Use `--verify-backup` to check backup integrity
3. **Monitor Logs**: Review logs for any warnings or errors
4. **Environment Separation**: Use environment-specific rollbacks
5. **Regular Cleanup**: Clean up old backups to save space

## Troubleshooting

### Common Issues

1. **pg_dump not found**:
   ```bash
   sudo apt-get install postgresql-client
   ```

2. **Permission denied**:
   ```bash
   # Check database user permissions
   # Ensure PGPASSWORD is set correctly
   ```

3. **Backup file corrupt**:
   ```bash
   # Verify backup integrity
   python scripts/rollback/rollback_procedures.py --verify-backup backup_file.sql
   ```

4. **Connection timeout**:
   ```bash
   # Check database connectivity
   psql -h localhost -U postgres -d opssight -c "SELECT 1;"
   ```

## Security Considerations

- **Password Security**: Use environment variables for database passwords
- **Backup Security**: Secure backup files with appropriate permissions
- **Access Control**: Limit access to rollback scripts
- **audit Logging**: All operations are logged for security auditing

## Examples

### Complete Rollback Workflow

```bash
# 1. Create backup before making changes
python scripts/rollback/rollback_procedures.py --create-backup

# 2. Test rollback in dry-run mode
python scripts/rollback/rollback_procedures.py --type full --to-revision abc123def456 --dry-run

# 3. Execute actual rollback
python scripts/rollback/rollback_procedures.py --type full --to-revision abc123def456 --backup-file backups/backup_staging_20240115_143000.sql

# 4. Verify final state
python scripts/rollback/rollback_procedures.py --list-backups
```

### Production Rollback

```bash
# Production rollback (extra caution)
python scripts/rollback/rollback_procedures.py \
  --environment production \
  --type full \
  --to-revision abc123def456 \
  --backup-file backups/backup_production_20240115_143000.sql
```

## Support

For issues or questions:
1. Check the logs in `rollback_*.log`
2. Review this documentation
3. Contact the DevOps team
4. Create an issue in the project repository