# Deploying with Supabase Cloud

This guide covers deploying OpsSight with Supabase Cloud (managed Supabase instance).

## Prerequisites

- Supabase account ([sign up](https://supabase.com))
- Supabase project created

## Setup Steps

### 1. Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **New Project**
3. Fill in project details:
   - **Name:** opsight-production (or your preferred name)
   - **Database Password:** Choose a strong password
   - **Region:** Select closest region
4. Click **Create new project**

### 2. Get Project Credentials

After project creation, get your credentials:

1. Go to **Project Settings** > **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key**
   - **service_role key** (keep this secret!)

### 3. Configure Environment Variables

Set these in your deployment environment (Vercel, Railway, etc.):

```env
# Database Backend
DATABASE_BACKEND=supabase

# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Other required settings
APP_NAME=OpsSight
APP_ENV=production
DEBUG=False
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30
CSRF_SECRET=your-csrf-secret-here
REDIS_URL=redis://your-redis-host:6379/0
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=https://your-domain.com/auth/callback
```

### 4. Migrate Database Schema

#### Option A: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

#### Option B: Using SQL Editor

1. Go to **SQL Editor** in Supabase Dashboard
2. Run the schema creation script:

```sql
-- Copy contents from scripts/create-supabase-schema.py
-- Or export from local Supabase and import here
```

#### Option C: Using Python Script

```bash
# Set environment variables
export SUPABASE_URL=https://xxxxx.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Run schema creation
cd backend
python scripts/create-supabase-schema.py
```

### 5. Configure Row-Level Security (RLS)

Enable RLS policies in Supabase Dashboard:

1. Go to **Authentication** > **Policies**
2. Create policies for each table
3. Test policies using SQL Editor

Example policies:

```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data"
ON users FOR SELECT
USING (auth.uid() = id);

-- Policy: Service role can do everything
CREATE POLICY "Service role full access"
ON users FOR ALL
USING (auth.role() = 'service_role');
```

### 6. Deploy Application

#### Vercel Deployment

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

#### Railway Deployment

1. Create new project on Railway
2. Connect GitHub repository
3. Set environment variables
4. Deploy

#### Docker Deployment

```bash
# Build and run
docker build -t opsight-backend ./backend
docker run -d \
  -e DATABASE_BACKEND=supabase \
  -e SUPABASE_URL=https://xxxxx.supabase.co \
  -e SUPABASE_SERVICE_ROLE_KEY=your-key \
  opsight-backend
```

## Security Best Practices

### 1. Use Service Role Key Only Server-Side

- **Never** expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code
- Use `SUPABASE_ANON_KEY` for client-side operations
- Service role key bypasses RLS - use carefully

### 2. Enable RLS on All Tables

```sql
-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Create appropriate policies
CREATE POLICY "policy_name"
ON table_name FOR operation
USING (condition);
```

### 3. Use Environment Variables

Store credentials in environment variables, never in code:

```bash
# Good
export SUPABASE_SERVICE_ROLE_KEY=secret-key

# Bad (don't do this)
SUPABASE_SERVICE_ROLE_KEY="secret-key"  # in code
```

### 4. Monitor API Usage

- Check **Project Settings** > **Usage** regularly
- Set up billing alerts
- Monitor API rate limits

## Database Management

### Accessing Database

```bash
# Using Supabase CLI
supabase db connect

# Using psql
psql postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### Running Migrations

```bash
# Create migration
supabase migration new migration_name

# Apply migration
supabase db push

# Or use SQL Editor in dashboard
```

### Backing Up Data

1. Go to **Database** > **Backups** in Supabase Dashboard
2. Create manual backup
3. Or enable automatic daily backups (Pro plan)

## Monitoring

### Supabase Dashboard

- **Database:** View tables, run queries
- **API Logs:** Monitor API requests
- **Auth Logs:** View authentication events
- **Usage:** Track API calls, storage, bandwidth

### Application Monitoring

- Monitor backend logs for Supabase errors
- Set up alerts for connection failures
- Track API response times

## Troubleshooting

### Connection Errors

- Verify `SUPABASE_URL` is correct
- Check `SUPABASE_SERVICE_ROLE_KEY` is valid
- Ensure project is not paused
- Check network connectivity

### RLS Policy Issues

- Review policies in Supabase Dashboard
- Test policies using SQL Editor
- Check service role key is used for admin operations

### Rate Limiting

- Free tier: 500 requests/second
- Check usage in dashboard
- Implement caching for frequently accessed data
- Consider upgrading plan if needed

### Schema Migration Failures

- Check migration SQL syntax
- Verify table names match
- Ensure foreign key constraints are correct
- Review Supabase logs

## Cost Optimization

### Free Tier Limits

- **Database:** 500 MB storage
- **API:** 500 requests/second
- **Bandwidth:** 5 GB/month
- **Auth:** 50,000 monthly active users

### Optimization Tips

1. Use connection pooling
2. Implement caching (Redis)
3. Optimize queries
4. Use indexes appropriately
5. Monitor usage regularly

## Next Steps

- Set up authentication providers
- Configure real-time subscriptions (if needed)
- Set up monitoring and alerts
- Create backup strategy
- Review and optimize RLS policies

