# OpsSight Vercel + Supabase Deployment Plan

**Date:** November 17, 2025  
**Agent:** BMAD Master  
**Status:** 🎯 Strategic Deployment Plan  
**Target Platforms:** Vercel (Frontend) + Supabase (Backend/Database)

---

## Executive Summary

This document provides a comprehensive deployment strategy for migrating OpsSight DevOps Visibility Platform from Docker-based local deployment to production-ready Vercel (Next.js frontend) and Supabase (PostgreSQL database + backend services) infrastructure.

**Key Objectives:**
1. Deploy Next.js frontend to Vercel with serverless functions
2. Migrate PostgreSQL database to Supabase
3. Adapt FastAPI backend for Vercel serverless functions or Supabase Edge Functions
4. Maintain data integrity and zero-downtime migration
5. Implement production-ready CI/CD workflows

---

## 1. Architecture Overview

### Current Architecture
- **Frontend:** Next.js 15.3.3 (React 18)
- **Backend:** FastAPI (Python) with asyncpg
- **Database:** PostgreSQL with SQLAlchemy ORM
- **Migrations:** Alembic
- **Cache:** Redis
- **Deployment:** Docker Compose

### Target Architecture
- **Frontend:** Vercel (Next.js with serverless functions)
- **Database:** Supabase PostgreSQL (managed)
- **Backend API:** Vercel Serverless Functions (FastAPI) OR Supabase Edge Functions
- **Cache:** Supabase Realtime + Vercel Edge Config (or Supabase Redis)
- **Auth:** Supabase Auth (replacing custom OAuth)
- **Storage:** Supabase Storage (for file uploads)

---

## 2. Pre-Deployment Assessment

### 2.1 Database Schema Analysis

**Current Database Features:**
- Multi-tenancy (organization-based)
- RBAC (Role-Based Access Control)
- Time-series metrics (TimescaleDB extensions)
- JSONB columns for flexible data
- UUID primary keys
- Foreign key relationships
- Indexes for performance

**Migration Considerations:**
- ✅ Supabase supports all PostgreSQL features
- ✅ JSONB fully supported
- ✅ UUID support native
- ⚠️ TimescaleDB extensions need verification
- ⚠️ Custom functions/triggers need migration
- ⚠️ Row-Level Security (RLS) policies to implement

### 2.2 Backend API Assessment

**Current FastAPI Endpoints:**
- RESTful API with async support
- WebSocket support (real-time)
- Authentication middleware
- RBAC middleware
- Rate limiting
- CORS configuration

**Vercel Serverless Considerations:**
- ✅ FastAPI works with Vercel serverless functions
- ⚠️ WebSocket not supported (use Supabase Realtime)
- ✅ Middleware can be adapted
- ⚠️ Long-running tasks need background jobs
- ✅ Environment variables supported

### 2.3 Frontend Assessment

**Current Next.js Setup:**
- App Router (Next.js 15)
- Server Components
- API Routes
- Environment variables
- TypeScript

**Vercel Compatibility:**
- ✅ Full Next.js 15 support
- ✅ App Router optimized
- ✅ Server Components supported
- ✅ API Routes become serverless functions
- ✅ Environment variables managed in dashboard

---

## 3. Migration Strategy

### Phase 1: Supabase Database Setup

#### 3.1 Create Supabase Project
1. Sign up at [supabase.com](https://supabase.com)
2. Create new project
3. Note project URL and API keys:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - Database connection string

#### 3.2 Database Migration Steps

**Step 1: Export Current Schema**
```bash
# Export schema only (no data)
pg_dump \
  -h localhost \
  -U postgres \
  -p 5432 \
  -d opsight_dev \
  --schema-only \
  --no-owner \
  --no-privileges \
  --format=directory \
  -f ./supabase_migration/schema_dump

# Export data separately
pg_dump \
  -h localhost \
  -U postgres \
  -p 5432 \
  -d opsight_dev \
  --data-only \
  --no-owner \
  --no-privileges \
  --format=directory \
  -f ./supabase_migration/data_dump
```

**Step 2: Import to Supabase**
```bash
# Use Supabase connection string (Session Pooler)
export SUPABASE_DB_URL="postgresql://postgres.xxxx:password@xxxx.pooler.supabase.com:5432/postgres"

# Restore schema
pg_restore \
  --dbname="$SUPABASE_DB_URL" \
  --format=directory \
  --schema-only \
  --no-owner \
  --no-privileges \
  --single-transaction \
  --verbose \
  ./supabase_migration/schema_dump

# Restore data (if migrating existing data)
pg_restore \
  --dbname="$SUPABASE_DB_URL" \
  --format=directory \
  --data-only \
  --no-owner \
  --no-privileges \
  --jobs=4 \
  --verbose \
  ./supabase_migration/data_dump
```

**Step 3: Verify Migration**
```bash
# Connect and verify tables
psql "$SUPABASE_DB_URL" -c "\dt"

# Check row counts
psql "$SUPABASE_DB_URL" -c "SELECT schemaname, tablename, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;"
```

**Step 4: Update Statistics**
```bash
# Update table statistics for query optimization
psql "$SUPABASE_DB_URL" -c "VACUUM VERBOSE ANALYZE;"
```

#### 3.3 Set Up Row-Level Security (RLS)

**Enable RLS on Tables:**
```sql
-- Example: Enable RLS on organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Create policy for organization-based access
CREATE POLICY "Users can only access their organization"
ON organizations
FOR ALL
USING (id IN (
  SELECT organization_id FROM users WHERE id = auth.uid()
));
```

**Key Tables Requiring RLS:**
- `organizations`
- `users`
- `projects`
- `teams`
- `clusters`
- `pipelines`
- `metrics`
- `alerts`

#### 3.4 Configure Supabase Migrations

**Initialize Supabase CLI:**
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref your-project-ref

# Initialize migrations
supabase migration new initial_schema
```

**Create Migration from Alembic:**
```bash
# Convert Alembic migrations to Supabase format
# Copy migration files to supabase/migrations/
cp backend/alembic_migrations/versions/*.py supabase/migrations/
```

---

### Phase 2: Backend Adaptation

#### 3.5 Option A: Vercel Serverless Functions (Recommended)

**Structure:**
```
api/
  ├── auth/
  │   └── route.ts          # /api/auth/*
  ├── pipelines/
  │   └── route.ts          # /api/pipelines/*
  ├── clusters/
  │   └── route.ts          # /api/clusters/*
  └── health/
      └── route.ts          # /api/health
```

**FastAPI to Next.js API Route Conversion:**

**Before (FastAPI):**
```python
@app.get("/api/v1/pipelines")
async def get_pipelines(db: Session = Depends(get_db)):
    return {"pipelines": [...]}
```

**After (Next.js API Route):**
```typescript
// api/pipelines/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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

**Configuration for Serverless Functions:**
```typescript
// api/pipelines/route.ts
export const runtime = 'nodejs';
export const maxDuration = 30; // seconds
export const dynamic = 'force-dynamic';
```

#### 3.6 Option B: Supabase Edge Functions (Alternative)

**For Complex Backend Logic:**
```typescript
// supabase/functions/pipelines/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  const { data } = await supabase.from('pipelines').select('*');
  
  return new Response(JSON.stringify({ pipelines: data }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

### Phase 3: Frontend Deployment

#### 3.7 Environment Variables Setup

**Create `.env.local` for Local Development:**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Backend API (if using separate backend)
NEXT_PUBLIC_API_URL=https://your-app.vercel.app/api

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_REALTIME=true
```

**Vercel Environment Variables:**
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add all variables for:
   - Production
   - Preview
   - Development

#### 3.8 Vercel Configuration

**Create `vercel.json`:**
```json
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/.next",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

**Update `next.config.js`:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // For Vercel optimization
  
  // Environment variables
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  
  // Image optimization
  images: {
    domains: ['xxxx.supabase.co'],
  },
  
  // Experimental features
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
```

#### 3.9 Deploy to Vercel

**Method 1: Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel --prod
```

**Method 2: GitHub Integration**
1. Push code to GitHub
2. Go to Vercel Dashboard → New Project
3. Import GitHub repository
4. Configure build settings:
   - Framework Preset: Next.js
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. Add environment variables
6. Deploy

---

## 4. Authentication Migration

### 4.1 Supabase Auth Setup

**Replace Custom OAuth with Supabase Auth:**

**Before (Custom):**
```typescript
// Custom GitHub OAuth
const response = await fetch('/api/auth/github');
```

**After (Supabase):**
```typescript
// Supabase Auth
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Sign in with GitHub
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

**Configure GitHub OAuth Provider:**
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable GitHub provider
3. Add GitHub OAuth App credentials:
   - Client ID
   - Client Secret
4. Set redirect URL: `https://your-project.supabase.co/auth/v1/callback`

### 4.2 User Migration

**Migrate Existing Users:**
```sql
-- Copy users to Supabase auth.users
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
SELECT 
  id,
  email,
  password_hash,
  created_at,
  created_at,
  updated_at
FROM public.users
WHERE password_hash IS NOT NULL;
```

---

## 5. Real-time Features Migration

### 5.1 Replace WebSocket with Supabase Realtime

**Before (WebSocket):**
```typescript
const ws = new WebSocket('ws://localhost:8000/ws');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle real-time updates
};
```

**After (Supabase Realtime):**
```typescript
const channel = supabase
  .channel('pipelines')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'pipelines',
  }, (payload) => {
    console.log('Change received!', payload);
    // Handle real-time updates
  })
  .subscribe();
```

---

## 6. Storage Migration

### 6.1 Supabase Storage Setup

**Replace File Uploads:**

**Before:**
```typescript
const formData = new FormData();
formData.append('file', file);
await fetch('/api/upload', {
  method: 'POST',
  body: formData,
});
```

**After:**
```typescript
const { data, error } = await supabase.storage
  .from('uploads')
  .upload(`${userId}/${fileName}`, file);

if (error) {
  console.error('Upload error:', error);
} else {
  const { data: urlData } = supabase.storage
    .from('uploads')
    .getPublicUrl(data.path);
  console.log('Public URL:', urlData.publicUrl);
}
```

---

## 7. CI/CD Pipeline

### 7.1 GitHub Actions for Vercel

**Create `.github/workflows/deploy.yml`:**
```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
          
      - name: Run tests
        run: |
          cd frontend
          npm run test:ci
          
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend
```

### 7.2 Supabase Migrations CI/CD

**Create `.github/workflows/supabase-migrations.yml`:**
```yaml
name: Supabase Migrations

on:
  push:
    branches: [main]
    paths:
      - 'supabase/migrations/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        
      - name: Run migrations
        run: |
          supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
```

---

## 8. Monitoring & Observability

### 8.1 Vercel Analytics

**Enable Vercel Analytics:**
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 8.2 Supabase Monitoring

**Use Supabase Dashboard:**
- Database performance metrics
- API request logs
- Auth event logs
- Storage usage
- Realtime connection metrics

---

## 9. Security Best Practices

### 9.1 Environment Variables
- ✅ Never commit `.env` files
- ✅ Use Vercel environment variables
- ✅ Use Supabase secrets management
- ✅ Rotate keys regularly

### 9.2 Row-Level Security
- ✅ Enable RLS on all tables
- ✅ Create policies for multi-tenancy
- ✅ Test policies thoroughly

### 9.3 API Security
- ✅ Use Supabase service role key only server-side
- ✅ Validate user permissions
- ✅ Implement rate limiting
- ✅ Use HTTPS everywhere

---

## 10. Migration Checklist

### Pre-Migration
- [ ] Create Supabase project
- [ ] Export current database schema
- [ ] Export current database data (if needed)
- [ ] Review and document all API endpoints
- [ ] List all environment variables
- [ ] Document authentication flow
- [ ] Identify WebSocket usage
- [ ] List file upload locations

### Database Migration
- [ ] Export schema with pg_dump
- [ ] Import schema to Supabase
- [ ] Verify all tables created
- [ ] Import data (if migrating)
- [ ] Set up RLS policies
- [ ] Create indexes
- [ ] Update sequences
- [ ] Run VACUUM ANALYZE

### Backend Migration
- [ ] Convert FastAPI endpoints to Next.js API routes
- [ ] Update database connection to Supabase
- [ ] Replace WebSocket with Supabase Realtime
- [ ] Migrate authentication to Supabase Auth
- [ ] Update file uploads to Supabase Storage
- [ ] Test all API endpoints
- [ ] Update environment variables

### Frontend Migration
- [ ] Install Supabase client library
- [ ] Update API calls to use Supabase
- [ ] Replace auth flows
- [ ] Update real-time subscriptions
- [ ] Migrate file uploads
- [ ] Update environment variables
- [ ] Test all features

### Deployment
- [ ] Set up Vercel project
- [ ] Configure build settings
- [ ] Add environment variables
- [ ] Deploy frontend
- [ ] Test production deployment
- [ ] Set up custom domain (optional)
- [ ] Configure SSL certificates
- [ ] Set up monitoring

### Post-Deployment
- [ ] Verify all features work
- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Update documentation
- [ ] Train team on new setup
- [ ] Set up backup strategy
- [ ] Plan rollback procedure

---

## 11. Rollback Plan

### If Migration Fails:
1. **Database Rollback:**
   - Keep original PostgreSQL database running
   - Switch connection strings back
   - No data loss

2. **Frontend Rollback:**
   - Vercel allows instant rollback to previous deployment
   - Use Vercel dashboard → Deployments → Rollback

3. **Backend Rollback:**
   - Revert API route changes
   - Redeploy previous version

---

## 12. Cost Estimation

### Vercel Pricing
- **Hobby:** Free (limited)
- **Pro:** $20/month (recommended)
  - Unlimited deployments
  - 100GB bandwidth
  - Team collaboration

### Supabase Pricing
- **Free Tier:** Good for development
  - 500MB database
  - 1GB file storage
  - 2GB bandwidth
- **Pro:** $25/month (recommended)
  - 8GB database
  - 100GB file storage
  - 250GB bandwidth

**Estimated Monthly Cost:** $45/month (Pro plans)

---

## 13. Resources & Documentation

### Official Documentation
- [Vercel Next.js Deployment](https://vercel.com/docs/frameworks/nextjs)
- [Supabase Migration Guide](https://supabase.com/docs/guides/platform/migrating-to-supabase)
- [Supabase PostgreSQL Guide](https://supabase.com/docs/guides/database)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)

### Tools
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Vercel CLI](https://vercel.com/docs/cli)
- [pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html)

---

## 14. Next Steps

1. **Review this plan** with the team
2. **Set up Supabase project** and test connection
3. **Create migration scripts** for database
4. **Convert one API endpoint** as proof of concept
5. **Deploy to Vercel staging** environment
6. **Test thoroughly** before production migration
7. **Schedule migration window** (if needed)
8. **Execute migration** following checklist
9. **Monitor** post-deployment
10. **Document** any issues and solutions

---

**Status:** ✅ **Plan Complete - Ready for Execution**

**Last Updated:** November 17, 2025

