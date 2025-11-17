# Deploying with Supabase Local

This guide covers deploying OpsSight with Supabase running locally using Docker.

## Prerequisites

- Docker and Docker Compose
- Supabase CLI (optional, for migrations)

## Quick Start

### 1. Start Supabase Locally

```bash
# Clone Supabase (if not already done)
git clone https://github.com/supabase/supabase.git
cd supabase/docker

# Start Supabase
docker-compose up -d
```

Or use the provided script:

```bash
./scripts/setup-supabase-local.sh
```

### 2. Get Supabase Credentials

After starting Supabase, get the credentials:

```bash
# Check Supabase Studio (usually http://localhost:54323)
# Or check docker logs
docker-compose logs supabase-auth
```

Default local credentials:
- **URL:** `http://localhost:54321`
- **Anon Key:** Check `.env` file in Supabase directory
- **Service Role Key:** Check `.env` file in Supabase directory

### 3. Configure Environment

Create `backend/.env`:

```env
# Database Backend
DATABASE_BACKEND=supabase

# Supabase Configuration
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Other required settings
APP_NAME=OpsSight
APP_ENV=development
DEBUG=True
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30
CSRF_SECRET=your-csrf-secret-here
REDIS_URL=redis://localhost:6379/0
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:8000/auth/callback
```

### 4. Migrate Database Schema

```bash
# Use the migration script
./scripts/migrate-to-supabase-local.sh

# Or manually
cd backend
python scripts/create-supabase-schema.py
```

### 5. Start Application

```bash
# Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Frontend (in another terminal)
cd frontend
npm run dev
```

## Access Supabase Studio

Supabase Studio is available at: **http://localhost:54323**

Use it to:
- View database tables
- Run SQL queries
- Manage Row-Level Security policies
- View API documentation

## Database Connection

Supabase local uses PostgreSQL. You can connect directly:

```bash
# Connection string
psql postgresql://postgres:postgres@localhost:54322/postgres

# Or using Supabase CLI
supabase db connect
```

## Migrations

### Using Supabase CLI

```bash
# Initialize Supabase (if not done)
supabase init

# Create migration
supabase migration new create_initial_schema

# Apply migration
supabase db reset
```

### Using Python Script

```bash
cd backend
python scripts/create-supabase-schema.py
```

## Row-Level Security (RLS)

Supabase supports Row-Level Security. Enable it in Supabase Studio:

1. Go to **Authentication** > **Policies**
2. Create policies for your tables
3. Test policies using Supabase Studio

Example policy:

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data"
ON users FOR SELECT
USING (auth.uid() = id);
```

## Troubleshooting

### Supabase Not Starting

```bash
# Check Docker containers
docker ps

# Check logs
docker-compose logs

# Restart Supabase
docker-compose restart
```

### Connection Errors

- Verify `SUPABASE_URL` is correct
- Check `SUPABASE_SERVICE_ROLE_KEY` is set (not anon key)
- Ensure Supabase containers are running

### Schema Migration Issues

- Check PostgreSQL logs: `docker-compose logs db`
- Verify schema script has correct table names
- Ensure all models are imported in schema script

### Port Conflicts

If ports are already in use:

1. Stop conflicting services
2. Or modify `docker-compose.yml` to use different ports
3. Update `SUPABASE_URL` accordingly

## Stopping Supabase

```bash
# Stop Supabase
docker-compose down

# Stop and remove volumes (deletes data)
docker-compose down -v
```

## Next Steps

- Set up Row-Level Security policies
- Configure authentication providers
- Set up real-time subscriptions (if needed)
- Migrate to Supabase Cloud (see `deploy-with-supabase-cloud.md`)

