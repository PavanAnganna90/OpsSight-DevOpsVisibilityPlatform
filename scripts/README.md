# OpsSight Database Migration Scripts

This directory contains comprehensive migration scripts and utilities for the OpsSight DevOps platform database schema enhancements.

## Overview

The migration system handles the transition from the initial database schema to an enhanced multi-tenant, RBAC-enabled, time-series optimized schema with comprehensive audit logging.

## Migration Components

### 1. Data Migration (`migration/data_migration.py`)

**Purpose**: Handles data migration for all schema enhancements including multi-tenancy, RBAC, time-series setup, and audit logging initialization.

**Features**:
- Multi-tenant organization setup
- User account migration with RBAC assignment
- TimescaleDB hypertable configuration
- Audit logging system initialization
- Pre and post-migration validation
- Comprehensive logging and error handling

**Usage**:
```bash
# Staging environment migration
python scripts/migration/data_migration.py --environment staging

# Production migration
python scripts/migration/data_migration.py --environment production

# Dry run (simulation)
python scripts/migration/data_migration.py --dry-run
```

### 2. Rollback Procedures (`rollback/rollback_procedures.py`)

**Purpose**: Provides safe rollback capabilities for both schema and data changes.

**Features**:
- Schema rollback using Alembic
- Data rollback from backups
- Full rollback combining schema and data
- Automatic backup creation before rollback
- Migration artifact cleanup
- Post-rollback validation

**Usage**:
```bash
# Schema rollback to specific revision
python scripts/rollback/rollback_procedures.py --type schema --to-revision d8b40ecdc203

# Data rollback from backup
python scripts/rollback/rollback_procedures.py --type data --backup-file backup_staging_20241211.sql

# Full rollback (schema + data)
python scripts/rollback/rollback_procedures.py --type full --to-revision d8b40ecdc203 --backup-file backup.sql

# Cleanup migration artifacts
python scripts/rollback/rollback_procedures.py --cleanup
```

### 3. Testing Suite (`testing/migration_test_suite.py`)

**Purpose**: Comprehensive validation of migration success and system integrity.

**Features**:
- Schema validation
- Data integrity testing
- Foreign key constraint verification
- Multi-tenancy isolation testing
- RBAC functionality validation
- Time-series operations testing
- Audit logging verification
- Performance impact assessment
- Rollback procedure testing

**Usage**:
```bash
# Full test suite
python scripts/testing/migration_test_suite.py --test-type all

# Specific test types
python scripts/testing/migration_test_suite.py --test-type integrity
python scripts/testing/migration_test_suite.py --test-type performance
python scripts/testing/migration_test_suite.py --test-type rollback
```

## Migration Process

### Pre-Migration Checklist

1. **Environment Preparation**:
   - Ensure database is at head revision (`80bd6a3c3fa1`)
   - Verify TimescaleDB extension availability
   - Confirm backup procedures are in place
   - Test network connectivity and permissions

2. **Backup Creation**:
   ```bash
   # Create full database backup
   pg_dump -h localhost -U postgres -d opssight -f pre_migration_backup.sql
   ```

3. **Validation**:
   ```bash
   # Run pre-migration validation
   python scripts/testing/migration_test_suite.py --test-type schema
   ```

### Migration Execution

1. **Staging Environment**:
   ```bash
   # Execute data migration
   python scripts/migration/data_migration.py --environment staging
   
   # Validate migration
   python scripts/testing/migration_test_suite.py --environment staging
   ```

2. **Production Environment**:
   ```bash
   # Dry run first
   python scripts/migration/data_migration.py --environment production --dry-run
   
   # Execute migration
   python scripts/migration/data_migration.py --environment production
   
   # Comprehensive validation
   python scripts/testing/migration_test_suite.py --environment production
   ```

### Post-Migration Validation

1. **Data Integrity**:
   - Verify all users have organization assignments
   - Confirm RBAC role assignments
   - Validate foreign key relationships
   - Check audit logging functionality

2. **Performance Validation**:
   - Monitor query performance
   - Verify index usage
   - Check TimescaleDB hypertable operation
   - Assess system resource utilization

3. **Functional Testing**:
   - Test API endpoints
   - Verify authentication and authorization
   - Validate multi-tenant data isolation
   - Confirm audit trail generation

## Rollback Procedures

### When to Rollback

- Migration validation failures
- Performance degradation
- Data integrity issues
- Functional regression
- Production incidents

### Rollback Execution

1. **Schema Rollback**:
   ```bash
   python scripts/rollback/rollback_procedures.py --type schema --to-revision d8b40ecdc203
   ```

2. **Data Rollback**:
   ```bash
   python scripts/rollback/rollback_procedures.py --type data --backup-file pre_migration_backup.sql
   ```

3. **Validation**:
   ```bash
   python scripts/testing/migration_test_suite.py --test-type all
   ```

## Schema Migration Chain

The migration follows this sequence:

1. **d8b40ecdc203** - Initial database schema
2. **85f9e3f15142** - Multi-tenancy schema implementation
3. **85832f9f86ce** - RBAC schema enhancement
4. **b521a10e8182** - Time-series data modeling
5. **80bd6a3c3fa1** - Audit logging system (current head)

## File Structure

```
scripts/
├── migration/
│   └── data_migration.py          # Main data migration script
├── rollback/
│   └── rollback_procedures.py     # Rollback utilities
├── testing/
│   └── migration_test_suite.py    # Comprehensive test suite
└── README.md                      # This documentation
```

## Dependencies

- Python 3.8+
- SQLAlchemy 2.0+
- Alembic
- PostgreSQL 13+
- TimescaleDB (optional but recommended)
- OpsSight application models

## Logging

All scripts generate comprehensive logs:
- **Migration logs**: `migration_{environment}_{timestamp}.log`
- **Rollback logs**: `rollback_{environment}_{timestamp}.log`
- **Test logs**: `migration_test_{environment}_{timestamp}.log`

## Error Handling

The migration system includes robust error handling:
- Automatic rollback on critical failures
- Detailed error logging and reporting
- Validation checkpoints throughout the process
- Safe abort mechanisms for production environments

## Performance Considerations

- **Large datasets**: Consider chunked processing for very large tables
- **Downtime**: Estimate 5-15 minutes for typical installations
- **Resource usage**: Monitor CPU and memory during migration
- **Index rebuilding**: May require additional time for large datasets

## Security Considerations

- **Backup encryption**: Ensure backups are encrypted in transit and at rest
- **Access controls**: Limit migration script execution to authorized personnel
- **Audit trails**: All migration activities are logged in the audit system
- **Sensitive data**: Migration preserves all data privacy and security settings

## Support and Troubleshooting

### Common Issues

1. **Schema version mismatch**: Ensure all Alembic migrations are applied
2. **Permission errors**: Verify database user has appropriate privileges
3. **TimescaleDB unavailable**: Migration will continue without hypertable features
4. **Foreign key violations**: Check data consistency before migration

### Recovery Procedures

1. **Partial failure**: Use targeted rollback procedures
2. **Complete failure**: Restore from pre-migration backup
3. **Performance issues**: Review query execution plans and index usage
4. **Data corruption**: Validate with test suite and restore if necessary

### Contact Information

For migration support, contact the OpsSight development team or refer to the project documentation. 