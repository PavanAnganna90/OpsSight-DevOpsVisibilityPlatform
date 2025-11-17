# Vercel Free Tier Deployment Guide

**Complete guide for deploying OpsSight to Vercel Free Tier**

---

## 🎯 Overview

Vercel Free Tier includes:
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Serverless functions (10s execution limit)
- ✅ Automatic SSL/TLS
- ✅ Global CDN
- ✅ Preview deployments for every PR

**Limitations:**
- ⚠️ Function execution: 10 seconds max (upgrade to Pro for 60s)
- ⚠️ Build time: 45 minutes max
- ⚠️ No persistent storage (use Supabase for database)

---

## 📋 Prerequisites

1. **GitHub Account** - Your code must be in a GitHub repository
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com) (free)
3. **Supabase Account** - For database (free tier available)

---

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Your Repository

```bash
# Ensure all code is committed and pushed
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Step 2: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/new](https://vercel.com/new)
   - Click "Import Git Repository"
   - Authorize GitHub if needed
   - Select your repository

2. **Configure Project Settings**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `frontend` (IMPORTANT!)
   - **Build Command:** `npm run build` (or leave default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)

3. **Add Environment Variables**
   
   Click "Environment Variables" and add these:

   **Required Variables:**
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # Database Backend Selection
   DATABASE_BACKEND=supabase
   
   # Application Configuration
   NODE_ENV=production
   NEXT_PUBLIC_APP_NAME=OpsSight
   NEXT_PUBLIC_APP_VERSION=1.0.0
   NEXT_PUBLIC_APP_ENV=production
   ```

   **Optional Variables:**
   ```env
   # GitHub OAuth (if using)
   NEXT_PUBLIC_GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   
   # Analytics & Monitoring
   NEXT_PUBLIC_ENABLE_ANALYTICS=true
   NEXT_PUBLIC_ENABLE_MONITORING=true
   ```

   **⚠️ Important:**
   - Variables starting with `NEXT_PUBLIC_` are exposed to the browser
   - Never expose `SUPABASE_SERVICE_ROLE_KEY` with `NEXT_PUBLIC_` prefix
   - Use Vercel's environment variable encryption

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (2-5 minutes)
   - Your app will be live at `your-project.vercel.app`

### Step 3: Configure Backend API Routes

Since Vercel only hosts the frontend, you have two options:

#### Option A: Use Supabase Directly (Recommended for Free Tier)

Your frontend API routes (`frontend/src/app/api/**`) will run as Vercel Serverless Functions. These can connect directly to Supabase.

**Example API Route:**
```typescript
// frontend/src/app/api/pipelines/route.ts
import { createServerAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServerAdminClient();
  const { data, error } = await supabase.from('pipelines').select('*');
  return Response.json({ data, error });
}
```

#### Option B: Deploy Backend Separately

Deploy your FastAPI backend to:
- **Railway** (free tier available)
- **Render** (free tier available)
- **Fly.io** (free tier available)
- **Heroku** (paid only)

Then update `NEXT_PUBLIC_API_BASE_URL` to point to your backend.

### Step 4: Verify Deployment

1. **Check Build Logs**
   - Go to your project → Deployments
   - Click on the latest deployment
   - Review build logs for errors

2. **Test Your App**
   - Visit `https://your-project.vercel.app`
   - Test key features:
     - [ ] Page loads correctly
     - [ ] API routes work (`/api/pipelines`)
     - [ ] Database queries succeed
     - [ ] Authentication works (if configured)

3. **Check Function Logs**
   - Go to Functions tab in Vercel dashboard
   - Monitor for errors or timeouts

---

## 🔧 Configuration Files

### vercel.json (Already Created)

Your `vercel.json` is configured correctly:

```json
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/.next",
  "framework": "nextjs",
  "functions": {
    "api/**/*.ts": {
      "runtime": "nodejs20.x",
      "maxDuration": 30
    }
  }
}
```

**Note:** Free tier limits functions to 10 seconds, but config allows 30s (will be capped at 10s).

### next.config.js

Ensure your Next.js config is optimized:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize for Vercel
  output: 'standalone', // For better performance
  experimental: {
    serverActions: true,
  },
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

module.exports = nextConfig;
```

---

## 🌐 Custom Domain Setup (Free Tier)

1. **Add Domain**
   - Go to Project Settings → Domains
   - Click "Add Domain"
   - Enter your domain (e.g., `opssight.com`)

2. **Configure DNS**
   - Add CNAME record:
     - **Name:** `@` or `www`
     - **Value:** `cname.vercel-dns.com`
   - Or add A record (if provided by Vercel)

3. **SSL Certificate**
   - Vercel automatically provisions SSL
   - Wait 1-24 hours for certificate

---

## 📊 Monitoring & Analytics

### Vercel Analytics (Free Tier)

Enable in Project Settings → Analytics:
- Real-time visitor analytics
- Performance metrics
- Web Vitals

### Function Logs

Monitor serverless functions:
- Go to Functions tab
- View real-time logs
- Set up alerts for errors

---

## 🐛 Troubleshooting

### Build Fails

**Error: "Module not found"**
```bash
# Solution: Check package.json dependencies
cd frontend
npm install
npm run build
```

**Error: "Build timeout"**
- Free tier: 45 minutes max
- Optimize build: Remove unused dependencies
- Use `.vercelignore` to exclude files

### API Routes Not Working

**Error: "Function timeout"**
- Free tier: 10 seconds max
- Optimize queries
- Use database indexes
- Consider caching

**Error: "Database connection failed"**
- Verify Supabase credentials
- Check RLS policies
- Ensure service role key is correct

### Environment Variables Not Working

**Issue: Variables not available**
- Ensure variables are set in Vercel dashboard
- Redeploy after adding variables
- Check variable names match code exactly

---

## 💰 Free Tier Limits

| Resource | Free Tier Limit |
|----------|----------------|
| Bandwidth | 100 GB/month |
| Function Execution | 10 seconds |
| Build Time | 45 minutes |
| Deployments | Unlimited |
| Team Members | 1 (yourself) |
| Custom Domains | Unlimited |

**Upgrade to Pro ($20/month) for:**
- 1TB bandwidth
- 60s function execution
- Team collaboration
- Advanced analytics

---

## 🔄 Continuous Deployment

Vercel automatically deploys:
- ✅ Every push to `main` branch → Production
- ✅ Every PR → Preview deployment
- ✅ Every commit → Preview deployment

**Disable auto-deploy:**
- Go to Project Settings → Git
- Uncheck "Automatic deployments"

---

## 📝 Environment Variables Checklist

Before deploying, ensure these are set:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- [ ] `DATABASE_BACKEND=supabase`
- [ ] `NODE_ENV=production`
- [ ] `NEXT_PUBLIC_APP_NAME`
- [ ] `NEXT_PUBLIC_APP_VERSION`

---

## 🎯 Next Steps

1. **Deploy Backend** (if not using Supabase only)
   - Deploy FastAPI to Railway/Render
   - Update API URLs

2. **Set Up Monitoring**
   - Enable Vercel Analytics
   - Set up error tracking (Sentry free tier)

3. **Optimize Performance**
   - Enable image optimization
   - Use Vercel Edge Functions
   - Implement caching

4. **Set Up CI/CD**
   - Already automatic with Vercel
   - Add GitHub Actions for testing

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase + Vercel Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)

---

## ✅ Quick Deploy Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel account created
- [ ] Project imported from GitHub
- [ ] Root directory set to `frontend`
- [ ] Environment variables added
- [ ] Supabase project configured
- [ ] Build successful
- [ ] App accessible at `.vercel.app` domain
- [ ] Custom domain configured (optional)
- [ ] Monitoring enabled

---

**Ready to deploy?** Follow Step 2 above to get started!

