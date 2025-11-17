# OpsSight Local Deployment Guide (Free Tier)

**Date:** November 17, 2025  
**Focus:** Free Tier + Local Development  
**Target:** Supabase Local + Vercel Free Tier

---

## Overview

This guide sets up OpsSight for local development using:
- **Supabase Local** (via Docker) - Free, unlimited
- **Vercel Free Tier** - For production deployment
- **Local Development** - Full control, no costs

---

## Prerequisites

- Docker & Docker Compose installed
- Node.js 20+ installed
- Git installed
- Vercel account (free tier)

---

## Step 1: Set Up Supabase Locally

### Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Or via npm
npm install -g supabase
```

### Initialize Supabase Project

```bash
# Navigate to project root
cd "/Users/pavan/Documents/OpsSight Devops Visibility Platform"

# Initialize Supabase
supabase init

# Start Supabase locally (uses Docker)
supabase start
```

This will:
- Start PostgreSQL database
- Start Supabase Studio (dashboard)
- Start Auth service
- Start Storage service
- Start Realtime service

**Access Points:**
- **Studio:** http://localhost:54323
- **API URL:** http://localhost:54321
- **DB URL:** postgresql://postgres:postgres@localhost:54322/postgres

### Get Local Credentials

```bash
# Get all local credentials
supabase status

# Save to .env.local
supabase status | grep -E "(API URL|anon key|service_role key)" > .env.local
```

---

## Step 2: Migrate Database to Local Supabase

### Export Current Schema

```bash
# Export schema from current PostgreSQL
pg_dump \
  -h localhost \
  -U postgres \
  -p 5432 \
  -d opsight_dev \
  --schema-only \
  --no-owner \
  --no-privileges \
  -f supabase/migrations/$(date +%Y%m%d%H%M%S)_initial_schema.sql
```

### Apply Migration

```bash
# Apply migration to local Supabase
supabase db reset

# Or apply specific migration
supabase migration up
```

---

## Step 3: Configure Environment Variables

### Create `.env.local` (Frontend)

```env
# Supabase Local
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key

# Database (for direct access if needed)
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Create `backend/.env.local`

```env
# Supabase Local
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# Keep existing config
DEBUG=True
APP_ENV=development
```

---

## Step 4: Install Supabase Client Libraries

### Frontend

```bash
cd frontend
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

### Backend

```bash
cd backend
pip install supabase
```

---

## Step 5: Update Frontend to Use Supabase

### Create Supabase Client

```typescript
// frontend/src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Update API Routes

```typescript
// frontend/src/app/api/pipelines/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Server-side only
);

export async function GET(request: NextRequest) {
  const { data, error } = await supabase
    .from('pipelines')
    .select('*');
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ pipelines: data });
}
```

---

## Step 6: Update Backend to Use Supabase

### Create Supabase Client

```python
# backend/app/core/supabase.py
from supabase import create_client, Client
import os

supabase_url = os.getenv("SUPABASE_URL", "http://localhost:54321")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(supabase_url, supabase_key)
```

### Update Database Queries

```python
# backend/app/api/pipelines.py
from app.core.supabase import supabase

async def get_pipelines():
    response = supabase.table('pipelines').select('*').execute()
    return response.data
```

---

## Step 7: Deploy to Vercel Free Tier

### Prepare for Deployment

```bash
# Ensure code is committed
git add .
git commit -m "Add Supabase integration"
git push origin main
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy (from project root)
vercel

# For production
vercel --prod
```

### Set Environment Variables in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `NEXT_PUBLIC_SUPABASE_URL` (your Supabase project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

**Note:** For free tier, you can use Supabase cloud free tier or keep local Supabase running.

---

## Step 8: Set Up Supabase Cloud (Free Tier) - Optional

If you want cloud deployment:

1. Go to [supabase.com](https://supabase.com)
2. Create free account
3. Create new project
4. Get credentials:
   - Project URL
   - Anon key
   - Service role key
5. Migrate schema:
   ```bash
   # Link to cloud project
   supabase link --project-ref your-project-ref
   
   # Push migrations
   supabase db push
   ```

---

## Local Development Workflow

### Start Services

```bash
# Start Supabase
supabase start

# Start Frontend (in one terminal)
cd frontend
npm run dev

# Start Backend (in another terminal, if needed)
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

### Stop Services

```bash
# Stop Supabase
supabase stop

# Or reset (clears data)
supabase stop --no-backup
```

---

## Free Tier Limits

### Vercel Free Tier
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Serverless functions (10s timeout)
- ✅ Automatic SSL
- ⚠️ No custom domains (can use vercel.app subdomain)

### Supabase Free Tier (Cloud)
- ✅ 500MB database
- ✅ 1GB file storage
- ✅ 2GB bandwidth/month
- ✅ Unlimited API requests
- ✅ 2 projects

### Supabase Local (Docker)
- ✅ Unlimited everything
- ✅ Full control
- ✅ No costs
- ✅ Works offline

---

## Troubleshooting

### Supabase Won't Start
```bash
# Check Docker is running
docker ps

# Reset Supabase
supabase stop
supabase start
```

### Database Connection Issues
```bash
# Check Supabase status
supabase status

# Verify credentials
supabase status | grep "DB URL"
```

### Migration Errors
```bash
# Reset database
supabase db reset

# Check migration files
ls -la supabase/migrations/
```

---

## Next Steps

1. ✅ Set up Supabase locally
2. ✅ Migrate database schema
3. ✅ Update frontend to use Supabase
4. ✅ Update backend to use Supabase
5. ✅ Test locally
6. ✅ Deploy to Vercel free tier
7. ✅ Set up Supabase cloud (optional)

---

**Status:** Ready for Implementation

