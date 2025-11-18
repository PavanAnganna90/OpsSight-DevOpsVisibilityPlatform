# Your Vercel Environment Variable Values

## 🔍 How to Get Your Actual Values

### For Supabase Cloud (Production - Recommended)

**You need to create a Supabase project first:**

1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com
   - Sign in (or create free account)
   - Click "New Project"

2. **Create Project**
   - Name: `opsight-production` (or your choice)
   - Database Password: Choose a strong password
   - Region: Select closest to you
   - Wait 2-3 minutes for setup

3. **Get Your Credentials**
   - In Supabase Dashboard → **Settings** → **API**
   - You'll see:
     ```
     Project URL: https://xxxxx.supabase.co
     anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     ```

4. **Copy These Values**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

### For Supabase Local (Development/Testing)

**If you have Supabase running locally:**

Run this command to get your local credentials:

```bash
cd "/Users/pavan/Documents/OpsSight Devops Visibility Platform"
supabase status
```

This will show:
```
         API URL: http://127.0.0.1:54321
         anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
         service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ Note:** Local URLs (`127.0.0.1`) won't work in Vercel production. Use Supabase Cloud for Vercel deployment.

---

## 📝 Complete Environment Variables Template

### Required Variables (Copy these to Vercel)

```env
# Database Backend
DATABASE_BACKEND=supabase

# Supabase Configuration
# ⬇️ REPLACE THESE WITH YOUR ACTUAL VALUES ⬇️
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key-here

# Application Environment
NODE_ENV=production
```

### Optional Variables (Recommended)

```env
# Application Info
NEXT_PUBLIC_APP_NAME=OpsSight
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_APP_ENV=production
```

---

## 🚀 Quick Setup Steps

### Step 1: Create Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in project details
4. Wait for project creation (2-3 minutes)

### Step 2: Get Credentials

1. In Supabase Dashboard → **Settings** → **API**
2. Copy:
   - **Project URL** → Use for `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → Use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → Use for `SUPABASE_SERVICE_ROLE_KEY`

### Step 3: Add to Vercel

1. Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Add each variable:
   - Variable name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://xxxxx.supabase.co` (your actual URL)
   - Environment: Select "Production", "Preview", "Development"
   - Click "Save"
3. Repeat for all variables

### Step 4: Deploy

After adding variables, deploy:
- Vercel will automatically use the environment variables
- Your app will connect to Supabase

---

## 🔐 Security Notes

- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Safe to expose (has `NEXT_PUBLIC_` prefix)
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` - **NEVER** add `NEXT_PUBLIC_` prefix (server-side only!)
- ✅ Store all values in Vercel Environment Variables (encrypted)
- ❌ Never commit these values to Git

---

## 📋 Example Values (For Reference Only)

**These are example formats - you need your own actual values:**

```env
# Example format (NOT actual values - get yours from Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.example-signature
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjE2MjM5MDIyLCJleHAiOjE5MzE4MTUwMjJ9.example-signature
DATABASE_BACKEND=supabase
NODE_ENV=production
```

---

## 🆘 Don't Have Supabase Project Yet?

**Create one now:**

1. Visit: https://app.supabase.com
2. Sign up (free)
3. Create new project
4. Get credentials from Settings → API
5. Use those values in Vercel

**Free Tier Includes:**
- 500 MB database storage
- 2 GB bandwidth/month
- Unlimited API requests
- Perfect for getting started!

---

**Need help?** See the complete guide: `docs/vercel-environment-variables-guide.md`

