# ✅ Ready to Deploy to Vercel!

**All environment variables are ready!**

---

## 🎯 Your Complete Environment Variables

### Copy These to Vercel Dashboard

**Go to:** Vercel Dashboard → Your Project → **Settings** → **Environment Variables**

Then add each of these:

#### 1. Database Backend
```
Variable Name: DATABASE_BACKEND
Value: supabase
Environment: Production, Preview, Development
```

#### 2. Supabase URL
```
Variable Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://kpeurmkfyyvqvjyaywpt.supabase.co
Environment: Production, Preview, Development
```

#### 3. Supabase Anon Key
```
Variable Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwZXVybWtmeXl2cXZqeWF5d3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTUyNTYsImV4cCI6MjA3ODk3MTI1Nn0.vZInIGAxTsjUSLK768YnWuOw_u0Pwkdt7LXIGVWoPyc
Environment: Production, Preview, Development
```

#### 4. Supabase Service Role Key
```
Variable Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwZXVybWtmeXl2cXZqeWF5d3B0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5NTI1NiwiZXhwIjoyMDc4OTcxMjU2fQ.vkCMbVqZaeiRlVG2DwW1CkXvtE6J4V7HR1MFv0OeR7g
Environment: Production, Preview, Development
```

#### 5. Node Environment
```
Variable Name: NODE_ENV
Value: production
Environment: Production
```

#### 6. Application Name (Optional)
```
Variable Name: NEXT_PUBLIC_APP_NAME
Value: OpsSight
Environment: Production, Preview, Development
```

#### 7. Application Version (Optional)
```
Variable Name: NEXT_PUBLIC_APP_VERSION
Value: 1.0.0
Environment: Production, Preview, Development
```

#### 8. Application Environment (Optional)
```
Variable Name: NEXT_PUBLIC_APP_ENV
Value: production
Environment: Production
```

---

## 🚀 Deployment Steps

### Step 1: Add Environment Variables to Vercel

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard

2. **Import Your Project** (if not already imported)
   - Click "Add New" → "Project"
   - Import from GitHub: `PavanAnganna90/OpsSight-DevOpsVisibilityPlatform`
   - **Important:** Set Root Directory to `frontend`

3. **Add Environment Variables**
   - Go to Project → **Settings** → **Environment Variables**
   - Add each variable listed above
   - Make sure to select appropriate environments

### Step 2: Configure Project Settings

**In Vercel Project Settings:**

- **Framework Preset:** Next.js
- **Root Directory:** `frontend` ⚠️ **CRITICAL!**
- **Build Command:** `npm run build` (default)
- **Output Directory:** `.next` (default)
- **Install Command:** `npm install` (default)

### Step 3: Deploy

**Option A: Automatic (Recommended)**
- Push a commit to GitHub
- Vercel will automatically deploy

**Option B: Manual**
- Go to Deployments tab
- Click "Redeploy" on latest deployment
- Or trigger new deployment

### Step 4: Verify Deployment

1. **Check Build Logs**
   - Go to Deployments → Latest deployment
   - Review build logs for errors

2. **Test Your App**
   - Visit: `https://your-project.vercel.app`
   - Test API: `https://your-project.vercel.app/api/pipelines`

3. **Check Function Logs**
   - Go to Functions tab
   - Monitor for any errors

---

## ✅ Pre-Deployment Checklist

Before deploying, ensure:

- [x] All environment variables added to Vercel
- [ ] Root directory set to `frontend`
- [ ] Database schema migrated to Supabase (if needed)
- [ ] Code pushed to GitHub
- [ ] Project imported in Vercel

---

## 🔍 Quick Reference

**Your Supabase Project:**
- Dashboard: https://app.supabase.com/project/kpeurmkfyyvqvjyaywpt
- API Settings: https://app.supabase.com/project/kpeurmkfyyvqvjyaywpt/settings/api
- Studio: https://app.supabase.com/project/kpeurmkfyyvqvjyaywpt/editor

**Your Vercel Project:**
- Dashboard: https://vercel.com/dashboard
- After import: https://vercel.com/dashboard/[your-project]

---

## 🆘 Troubleshooting

### Build Fails
- Check Root Directory is set to `frontend`
- Verify all environment variables are set
- Review build logs in Vercel

### API Routes Not Working
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set (no `NEXT_PUBLIC_` prefix)
- Check function logs in Vercel
- Verify Supabase project is active

### Database Connection Issues
- Verify Supabase URL is correct
- Check Supabase project is not paused
- Review Supabase logs in dashboard

---

## 📋 Next Steps After Deployment

1. **Migrate Database Schema** (if not done)
   - Use Supabase SQL Editor or migrations
   - See: `scripts/create-supabase-schema.py`

2. **Set Up Row-Level Security**
   - Go to Supabase Dashboard → Authentication → Policies
   - Create RLS policies for your tables

3. **Test Your Application**
   - Test authentication
   - Test API endpoints
   - Test database queries

4. **Set Up Custom Domain** (Optional)
   - Vercel Dashboard → Settings → Domains
   - Add your domain

---

**You're all set!** Add the variables to Vercel and deploy! 🚀

