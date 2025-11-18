# Complete Vercel Environment Variables

**Your Supabase credentials are ready!**

---

## ✅ Your Supabase Credentials

### Project Information
- **Project URL:** `https://kpeurmkfyyvqvjyaywpt.supabase.co`
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwZXVybWtmeXl2cXZqeWF5d3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTUyNTYsImV4cCI6MjA3ODk3MTI1Nn0.vZInIGAxTsjUSLK768YnWuOw_u0Pwkdt7LXIGVWoPyc`

### ⚠️ You Still Need: Service Role Key

**To get your Service Role Key:**

1. Go to: https://app.supabase.com/project/kpeurmkfyyvqvjyaywpt
2. Navigate to: **Settings** → **API**
3. Scroll down to find **service_role** key (it's different from anon key)
4. Copy the full key (it will be a long JWT token)

---

## 📝 Complete Environment Variables for Vercel

### Copy These to Vercel Dashboard

```env
# Database Backend Selection
DATABASE_BACKEND=supabase

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://kpeurmkfyyvqvjyaywpt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwZXVybWtmeXl2cXZqeWF5d3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTUyNTYsImV4cCI6MjA3ODk3MTI1Nn0.vZInIGAxTsjUSLK768YnWuOw_u0Pwkdt7LXIGVWoPyc
SUPABASE_SERVICE_ROLE_KEY=<GET_THIS_FROM_SUPABASE_DASHBOARD>

# Application Environment
NODE_ENV=production
```

### Optional (Recommended)

```env
# Application Info
NEXT_PUBLIC_APP_NAME=OpsSight
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_APP_ENV=production
```

---

## 🔐 Key Differences

### Anon Key (Public - Safe for Frontend)
- ✅ Has `NEXT_PUBLIC_` prefix
- ✅ Safe to expose in browser
- ✅ Respects Row-Level Security (RLS)
- ✅ Limited permissions

### Service Role Key (Secret - Server-Side Only)
- ⚠️ **NO** `NEXT_PUBLIC_` prefix
- ⚠️ **NEVER** expose in frontend
- ⚠️ Bypasses RLS (full access)
- ⚠️ Use only in API routes/server-side

---

## 🚀 Steps to Add to Vercel

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your project (or create new)

2. **Navigate to Environment Variables**
   - Project → **Settings** → **Environment Variables**

3. **Add Each Variable**
   
   **Variable 1:**
   - Name: `DATABASE_BACKEND`
   - Value: `supabase`
   - Environment: Production, Preview, Development
   - Save

   **Variable 2:**
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://kpeurmkfyyvqvjyaywpt.supabase.co`
   - Environment: Production, Preview, Development
   - Save

   **Variable 3:**
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwZXVybWtmeXl2cXZqeWF5d3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTUyNTYsImV4cCI6MjA3ODk3MTI1Nn0.vZInIGAxTsjUSLK768YnWuOw_u0Pwkdt7LXIGVWoPyc`
   - Environment: Production, Preview, Development
   - Save

   **Variable 4:**
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: `<GET_FROM_SUPABASE_DASHBOARD>` (see instructions below)
   - Environment: Production, Preview, Development
   - Save

   **Variable 5:**
   - Name: `NODE_ENV`
   - Value: `production`
   - Environment: Production
   - Save

4. **Redeploy**
   - After adding variables, trigger a new deployment
   - Or push a new commit to trigger auto-deploy

---

## 🔍 How to Get Service Role Key

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com/project/kpeurmkfyyvqvjyaywpt

2. **Navigate to API Settings**
   - Click **Settings** (gear icon) in left sidebar
   - Click **API** in settings menu

3. **Find Service Role Key**
   - Scroll down to **Project API keys** section
   - Look for **service_role** key (it's separate from anon key)
   - Click **Reveal** or **Copy** button
   - It will look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long JWT token)

4. **Copy the Full Key**
   - Make sure to copy the entire key (it's long!)
   - It starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`

5. **Add to Vercel**
   - Paste as `SUPABASE_SERVICE_ROLE_KEY` value
   - **Important:** Do NOT add `NEXT_PUBLIC_` prefix!

---

## ✅ Verification Checklist

Before deploying, verify:

- [ ] `DATABASE_BACKEND=supabase` added
- [ ] `NEXT_PUBLIC_SUPABASE_URL` added with your project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` added with your anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` added (get from Supabase dashboard)
- [ ] `NODE_ENV=production` added
- [ ] All variables set for Production environment
- [ ] Service role key does NOT have `NEXT_PUBLIC_` prefix

---

## 🧪 Test Your Configuration

After adding variables to Vercel:

1. **Deploy your project**
2. **Check deployment logs** for any errors
3. **Test API endpoint:** `https://your-project.vercel.app/api/pipelines`
4. **Check Supabase logs** in Supabase dashboard

---

## 🆘 Troubleshooting

### "Invalid API key" Error
- Verify you copied the complete key (no truncation)
- Check for extra spaces
- Ensure anon key has `NEXT_PUBLIC_` prefix
- Ensure service role key does NOT have `NEXT_PUBLIC_` prefix

### "Connection refused" Error
- Verify project URL is correct
- Check if Supabase project is paused
- Ensure project is active in Supabase dashboard

### "RLS policy violation" Error
- Use service role key for admin operations
- Check Row-Level Security policies in Supabase
- Review Supabase logs for details

---

## 📚 Next Steps

1. **Get Service Role Key** from Supabase dashboard
2. **Add all variables** to Vercel
3. **Migrate database schema** to Supabase (if not done)
4. **Deploy to Vercel**
5. **Test your deployment**

---

**Quick Link:** https://app.supabase.com/project/kpeurmkfyyvqvjyaywpt/settings/api

