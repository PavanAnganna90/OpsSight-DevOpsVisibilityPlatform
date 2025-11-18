# Vercel Environment Variables Guide

**Complete guide for getting your Supabase environment variable values**

---

## 🔍 Where to Get Your Values

### Option 1: Supabase Cloud (Recommended for Production)

If you're using **Supabase Cloud** (free tier available):

1. **Go to Supabase Dashboard**
   - Visit [app.supabase.com](https://app.supabase.com)
   - Sign in or create account
   - Create a new project (or select existing)

2. **Get Your Credentials**
   - Go to **Project Settings** → **API**
   - Copy the following values:

```env
# Your Supabase Project URL
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
# Replace xxxxx with your actual project reference

# Anon/Public Key (safe to expose in frontend)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcHJvamVjdC1yZWYiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.xxxxx

# Service Role Key (KEEP SECRET - server-side only!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcHJvamVjdC1yZWYiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjE2MjM5MDIyLCJleHAiOjE5MzE4MTUwMjJ9.xxxxx
```

**⚠️ Important:**
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Safe for frontend (has `NEXT_PUBLIC_` prefix)
- `SUPABASE_SERVICE_ROLE_KEY` - **NEVER** add `NEXT_PUBLIC_` prefix (server-side only!)

---

### Option 2: Supabase Local (For Development/Testing)

If you're using **Supabase Local** (Docker-based):

1. **Start Supabase Locally**
   ```bash
   cd /Users/pavan/Documents/OpsSight\ Devops\ Visibility\ Platform
   ./scripts/setup-supabase-local.sh
   ```

2. **Get Local Credentials**
   ```bash
   supabase status
   ```

   This will show:
   ```
   API URL: http://127.0.0.1:54321
   anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Use Local Values for Vercel** (if testing locally first)
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase status>
   SUPABASE_SERVICE_ROLE_KEY=<from supabase status>
   ```

   **Note:** Local URLs won't work in Vercel production. Use Supabase Cloud for production.

---

## 📝 Complete Environment Variables for Vercel

### Required Variables

```env
# Database Backend Selection
DATABASE_BACKEND=supabase

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application Environment
NODE_ENV=production
```

### Optional Variables (Recommended)

```env
# Application Info
NEXT_PUBLIC_APP_NAME=OpsSight
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_APP_ENV=production

# GitHub OAuth (if using)
NEXT_PUBLIC_GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

---

## 🚀 Quick Setup Steps

### Step 1: Create Supabase Project (Cloud)

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in:
   - **Name:** opsight-production
   - **Database Password:** (choose strong password)
   - **Region:** (select closest)
4. Wait 2-3 minutes for project creation

### Step 2: Get Your Credentials

1. In Supabase Dashboard, go to **Settings** → **API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### Step 3: Add to Vercel

1. In Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable:
   - Click "Add New"
   - Enter variable name
   - Enter value
   - Select environment (Production, Preview, Development)
   - Click "Save"

### Step 4: Migrate Database Schema

After adding variables, migrate your schema:

**Option A: Using Supabase Dashboard**
1. Go to **SQL Editor** in Supabase
2. Run the schema from `scripts/create-supabase-schema.py` or
3. Use migration: `supabase/migrations/20251117_initial_schema.sql`

**Option B: Using Supabase CLI**
```bash
# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

---

## 🔐 Security Best Practices

### ✅ DO:
- Use `NEXT_PUBLIC_` prefix for frontend-safe variables
- Keep `SUPABASE_SERVICE_ROLE_KEY` without `NEXT_PUBLIC_` prefix
- Store secrets in Vercel Environment Variables (encrypted)
- Use different projects for dev/staging/production

### ❌ DON'T:
- Never commit `.env` files to Git
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code
- Never use production keys in development
- Never share service role keys publicly

---

## 🧪 Testing Your Values

### Test Locally First

```bash
# Create .env.local in frontend directory
cd frontend
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-local-service-role-key>
DATABASE_BACKEND=supabase
NODE_ENV=development
EOF

# Test connection
npm run dev
# Visit http://localhost:3000/api/pipelines
```

### Test in Vercel

1. Deploy with environment variables set
2. Check function logs in Vercel dashboard
3. Test API routes: `https://your-project.vercel.app/api/pipelines`

---

## 📋 Checklist

Before deploying to Vercel:

- [ ] Supabase project created (cloud or local)
- [ ] Credentials copied from Supabase dashboard
- [ ] Environment variables added to Vercel
- [ ] Database schema migrated
- [ ] Tested locally (optional but recommended)
- [ ] Verified no secrets in code
- [ ] Ready to deploy!

---

## 🆘 Troubleshooting

### "Invalid API key" Error
- Verify you copied the correct key
- Check for extra spaces or newlines
- Ensure `NEXT_PUBLIC_` prefix is correct

### "Connection refused" Error
- Verify Supabase URL is correct
- Check if project is paused (cloud)
- Verify network connectivity

### "RLS policy violation" Error
- Check Row-Level Security policies
- Use service role key for admin operations
- Review Supabase logs

---

## 📚 Additional Resources

- [Supabase Dashboard](https://app.supabase.com)
- [Supabase Docs](https://supabase.com/docs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

**Need help?** Check the deployment guide: `docs/vercel-free-tier-deployment.md`

