# Vercel Deployment Quick Start Guide

**Quick reference for deploying OpsSight to Vercel**

---

## Prerequisites

- [ ] GitHub account
- [ ] Vercel account (sign up at [vercel.com](https://vercel.com))
- [ ] Supabase project created
- [ ] Environment variables documented

---

## Step 1: Prepare Repository

```bash
# Ensure code is pushed to GitHub
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

---

## Step 2: Deploy to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your GitHub repository
4. Configure project:
   - **Framework Preset:** Next.js
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm install`
5. Add Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
6. Click "Deploy"

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel

# Deploy to production
vercel --prod
```

---

## Step 3: Verify Deployment

1. Check deployment status in Vercel dashboard
2. Visit your deployment URL
3. Test key features:
   - [ ] Authentication
   - [ ] API endpoints
   - [ ] Database queries
   - [ ] Real-time features

---

## Step 4: Set Up Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your domain
3. Configure DNS records as instructed
4. Wait for SSL certificate (automatic)

---

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Verify all dependencies in `package.json`
- Ensure environment variables are set

### API Routes Not Working
- Verify `vercel.json` configuration
- Check function logs in Vercel dashboard
- Ensure runtime and maxDuration are set correctly

### Database Connection Issues
- Verify Supabase connection string
- Check RLS policies
- Ensure service role key is used server-side only

---

## Useful Commands

```bash
# View deployment logs
vercel logs

# Pull environment variables
vercel env pull .env.local

# List deployments
vercel ls

# Remove deployment
vercel rm <deployment-url>
```

---

## Next Steps

- [ ] Set up monitoring
- [ ] Configure CI/CD
- [ ] Set up staging environment
- [ ] Review performance metrics
- [ ] Update documentation

