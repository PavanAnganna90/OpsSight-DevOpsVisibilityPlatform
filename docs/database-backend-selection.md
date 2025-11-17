# Database Backend Selection Guide

OpsSight supports two database backends that can be switched at runtime via environment variables:

1. **SQLAlchemy (PostgreSQL)** - Traditional PostgreSQL with SQLAlchemy ORM
2. **Supabase** - Supabase PostgreSQL with Supabase client library

## Quick Start

Set the `DATABASE_BACKEND` environment variable to choose your backend:

```bash
# Use SQLAlchemy (default)
DATABASE_BACKEND=sqlalchemy

# Use Supabase
DATABASE_BACKEND=supabase
```

## Backend Comparison

### SQLAlchemy (PostgreSQL)

**Pros:**
- Full SQLAlchemy ORM features (relationships, eager loading, etc.)
- Direct database access
- Advanced query capabilities
- Better for complex queries and relationships

**Cons:**
- Requires managing database connections
- No built-in Row-Level Security (RLS)
- More setup required

**Use When:**
- You need advanced SQLAlchemy features
- You're running PostgreSQL locally or on your own infrastructure
- You need complex queries and relationships

### Supabase

**Pros:**
- Built-in Row-Level Security (RLS)
- Real-time subscriptions
- Simpler setup
- Managed PostgreSQL with additional features

**Cons:**
- Limited to Supabase query API
- Some SQLAlchemy features not available
- Requires Supabase account (for cloud)

**Use When:**
- You want RLS and real-time features
- You're using Supabase cloud or local instance
- You prefer simpler query API

## Configuration

### SQLAlchemy Configuration

```env
DATABASE_BACKEND=sqlalchemy
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

### Supabase Configuration

```env
DATABASE_BACKEND=supabase
SUPABASE_URL=http://localhost:54321  # or https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Switching Backends

You can switch backends at any time by changing the `DATABASE_BACKEND` environment variable and restarting the application. The adapter pattern ensures your code works with both backends without changes.

**Important:** Ensure your database schema is compatible between backends. Both use PostgreSQL, so schemas should be identical.

## Migration Between Backends

1. **Export data from current backend:**
   ```bash
   # For SQLAlchemy
   pg_dump -h localhost -U postgres dbname > backup.sql
   
   # For Supabase
   supabase db dump > backup.sql
   ```

2. **Import to new backend:**
   ```bash
   # For SQLAlchemy
   psql -h localhost -U postgres dbname < backup.sql
   
   # For Supabase
   supabase db reset
   psql -h localhost -U postgres -d postgres < backup.sql
   ```

3. **Update environment variables**

4. **Restart application**

## Code Examples

### Using Repositories (Works with Both Backends)

```python
from app.repositories.user import UserRepository
from app.core.database_factory import get_database_adapter

# Get adapter (automatically selects based on DATABASE_BACKEND)
adapter = await get_database_adapter()

# Create repository (works with both backends)
user_repo = UserRepository(adapter)

# Use repository methods (same API for both backends)
user = await user_repo.get_by_id(1)
users = await user_repo.get_all(skip=0, limit=10)
```

### Direct Adapter Usage

```python
from app.core.database_factory import get_database_adapter
from app.models.user import User

adapter = await get_database_adapter()

# Get by ID
user = await adapter.get_by_id(User, 1)

# Get all with filters
users = await adapter.get_all(
    User,
    skip=0,
    limit=10,
    filters={"is_active": True}
)

# Create
new_user = await adapter.create(User, {"email": "user@example.com"})

# Update
updated = await adapter.update(User, 1, {"email": "new@example.com"})

# Delete
deleted = await adapter.delete(User, 1)
```

## Best Practices

1. **Use Repositories:** Always use repository pattern instead of direct adapter access
2. **Environment Variables:** Store backend selection in environment variables, not code
3. **Testing:** Test with both backends to ensure compatibility
4. **Schema Compatibility:** Keep schemas identical between backends
5. **Migration Scripts:** Create scripts for migrating data between backends

## Troubleshooting

### "Invalid DATABASE_BACKEND" Error

Ensure `DATABASE_BACKEND` is set to either `sqlalchemy` or `supabase` (case-insensitive).

### Supabase Connection Errors

- Verify `SUPABASE_URL` is correct
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set (not anon key for server operations)
- Ensure Supabase instance is running (for local)

### SQLAlchemy Connection Errors

- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running and accessible
- Ensure database exists

### Schema Mismatches

Both backends use PostgreSQL, so schemas should be identical. If you see errors:

1. Compare table structures
2. Ensure migrations are applied to both databases
3. Check for backend-specific features (e.g., RLS policies in Supabase)

