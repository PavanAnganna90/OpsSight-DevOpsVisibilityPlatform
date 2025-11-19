# Local Vercel Testing Guide

This guide shows you how to test Vercel builds locally before deploying.

## 🎯 Quick Start

### Option 1: Using Vercel CLI (Recommended)

The easiest way to simulate Vercel's build process:

```bash
# From the frontend directory
npm run build:vercel          # Test build locally
npm run build:vercel:prod     # Test production build
npm run dev:vercel            # Run local dev server (simulates Vercel environment)
```

**First time setup:**
```bash
npm run vercel:link           # Link project to Vercel
npm run vercel:env            # Pull environment variables
```

### Option 2: Using Test Script

Run the automated test script:

```bash
cd frontend
./scripts/test-vercel-build.sh
```

### Option 3: Using Docker (Most Accurate)

Simulate Vercel's Linux build environment exactly:

```bash
cd frontend
./scripts/simulate-vercel.sh
```

## 📋 Detailed Instructions

### 1. Link Your Project to Vercel

```bash
cd frontend
vercel link
```

This will:
- Prompt you to select an existing Vercel project or create a new one
- Create a `.vercel` directory with project settings
- Link your local code to your Vercel project

### 2. Pull Environment Variables

```bash
vercel env pull .env.local
```

This downloads all environment variables from your Vercel project to `.env.local`.

### 3. Test Build Locally

```bash
# Test development build
vercel build

# Test production build
vercel build --prod
```

This runs the **exact same build process** that Vercel uses:
- Uses the same Node.js version
- Respects `vercel.json` configuration
- Runs the same `buildCommand`
- Outputs to `.vercel/output/`

### 4. Test Development Server

```bash
vercel dev
```

This starts a local server that:
- Simulates Vercel's routing
- Uses your Vercel project settings
- Handles API routes like Vercel Functions
- Shows preview URLs like Vercel deployments

## 🔍 What Gets Tested

When you run `vercel build`, it tests:

✅ **Build Process**
- Dependency installation (with `--omit=optional --force`)
- Native module compilation (lightningcss, tailwindcss/oxide)
- Next.js build process
- Static page generation
- Error page generation (404, 500)

✅ **Configuration**
- `vercel.json` settings
- Environment variables
- Build commands
- Output directory structure

✅ **Output**
- Build artifacts
- Static files
- Serverless functions
- Routing configuration

## 🐛 Debugging Build Issues

### View Detailed Build Output

```bash
vercel build --debug
```

### Check Build Output

```bash
# After build completes, check the output
ls -la .vercel/output/
```

### Compare with Vercel Build Logs

The local build output should match what you see in Vercel's build logs. If they differ, check:
- Node.js version (Vercel uses Node 20.x)
- Package versions
- Environment variables

## 🚀 Before Deploying

Run these commands to ensure your build works:

```bash
# 1. Clean previous builds
rm -rf .next .vercel/output

# 2. Test local Vercel build
npm run build:vercel:prod

# 3. If successful, deploy
vercel --prod
```

## 📝 Notes

- **Native Modules**: The Docker simulation is more accurate for testing native modules (lightningcss, etc.) since it runs on Linux like Vercel does
- **Environment Variables**: Make sure to pull env vars before building: `npm run vercel:env`
- **Build Time**: Local builds may be faster/slower than Vercel depending on your machine
- **Output Location**: Vercel builds output to `.vercel/output/`, not `.next/`

## 🔗 Useful Commands

```bash
# Link/unlink project
vercel link
vercel unlink

# Pull/push environment variables
vercel env pull .env.local
vercel env add KEY_NAME

# Deploy
vercel                    # Preview deployment
vercel --prod            # Production deployment

# Inspect build
vercel inspect [url]     # Inspect a deployment
```

## ❓ Troubleshooting

**Build fails locally but works on Vercel:**
- Check Node.js version: Vercel uses 20.x
- Verify native modules: Use Docker simulation for Linux compatibility
- Check environment variables: Ensure all required vars are set

**Build works locally but fails on Vercel:**
- Check `vercel.json` configuration
- Verify build command matches exactly
- Check for platform-specific code (macOS vs Linux)

**Native module errors:**
- Use the Docker simulation script for accurate Linux testing
- Check `vercel.json` for explicit Linux binary installation
- Verify package versions match

