# Local Vercel Testing Guide

This guide shows you how to test Vercel builds locally before deploying.

## ⚠️ Important: Why Local Tests Missed Some Issues

We recently discovered that **local tests didn't catch a dependency error** that only appeared on Vercel. Here's why:

### The Issue:
- **Local test:** We ran `cd frontend && npm install --no-workspaces`
  - This only installed `frontend/package.json` dependencies
  - Root `package.json` dependencies were **NOT** installed
  
- **Vercel build:** Runs `npm install` from **root directory**
  - Detects workspace setup (`package.json` has `"workspaces"`)
  - Installs **ALL** workspace dependencies including root `package.json`
  - This is why root `package.json` dependency errors only appear on Vercel

### The Solution:
Always test using **workspace setup** to match Vercel's behavior.

## 🎯 Quick Start

### Option 1: Test with Workspace Setup (Recommended)

This matches Vercel's exact behavior:

```bash
cd frontend
./scripts/test-vercel-workspace.sh
```

This script:
- ✅ Installs from root with workspace setup (like Vercel)
- ✅ Includes root package.json dependencies
- ✅ Would catch dependency issues like `string-width-cjs`

### Option 2: Using Vercel CLI

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

### Option 3: Using Docker (Most Accurate)

Simulate Vercel's Linux build environment with workspace setup:

```bash
cd frontend
./scripts/simulate-vercel.sh
```

**Updated script now:**
- ✅ Installs from root package.json (workspace setup)
- ✅ Includes root package.json dependencies
- ✅ Would catch dependency issues like `string-width-cjs`

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

### 3. Test Build Locally (Workspace-Aware)

**IMPORTANT:** Always test with workspace setup to match Vercel:

```bash
# From project root
npm install --omit=optional --force

# Then build frontend
cd frontend
npm run build
```

Or use the automated script:
```bash
cd frontend
./scripts/test-vercel-workspace.sh
```

### 4. Test Build with Vercel CLI

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

### 5. Test Development Server

```bash
vercel dev
```

This starts a local server that:
- Simulates Vercel's routing
- Uses your Vercel project settings
- Handles API routes like Vercel Functions
- Shows preview URLs like Vercel deployments

## 🔍 What Gets Tested

When you run `vercel build` or workspace test, it tests:

✅ **Build Process**
- Dependency installation (with `--omit=optional --force`)
- **Root package.json dependencies** (workspace setup)
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

### Test Workspace Installation

```bash
# From project root - this is what Vercel does
npm install --omit=optional --force

# Check for errors
echo $?  # Should be 0
```

### Compare with Vercel Build Logs

The local build output should match what you see in Vercel's build logs. If they differ, check:
- Node.js version (Vercel uses Node 20.x)
- Package versions
- **Workspace setup** (root package.json dependencies)

## 🚀 Before Deploying

Run these commands to ensure your build works:

```bash
# 1. Test workspace installation (catches root package.json issues)
cd <project-root>
npm install --omit=optional --force

# 2. Clean previous builds
cd frontend
rm -rf .next .vercel/output

# 3. Test local Vercel build
npm run build:vercel:prod

# 4. If successful, deploy
vercel --prod
```

## 📝 Notes

- **Workspace Setup:** Always test with workspace setup to match Vercel's behavior
- **Root Dependencies:** Check root `package.json` for invalid dependencies (like `string-width-cjs@^4.2.3`)
- **Native Modules:** The Docker simulation is more accurate for testing native modules (lightningcss, etc.) since it runs on Linux like Vercel does
- **Environment Variables:** Make sure to pull env vars before building: `npm run vercel:env`
- **Build Time:** Local builds may be faster/slower than Vercel depending on your machine
- **Output Location:** Vercel builds output to `.vercel/output/`, not `.next/`

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

# Test workspace setup
cd <project-root>
npm install --omit=optional --force  # Test like Vercel does
```

## ❓ Troubleshooting

**Build fails locally but works on Vercel:**
- Check Node.js version: Vercel uses 20.x
- Verify workspace setup: Are you testing from root or frontend directory?
- Check root package.json: Are there invalid dependencies?

**Build works locally but fails on Vercel:**
- **Most common:** Root package.json has invalid dependency (like `string-width-cjs@^4.2.3`)
- Test with workspace setup: `npm install --omit=optional --force` from root
- Check `vercel.json` configuration
- Verify build command matches exactly

**Native module errors:**
- Use the Docker simulation script for accurate Linux testing
- Check `vercel.json` for explicit Linux binary installation
- Verify package versions match

## 💡 Lessons Learned

1. **Always test with workspace setup** - Don't use `--no-workspaces` flag
2. **Check root package.json** - Dependencies there can cause Vercel build failures
3. **Use automated scripts** - They ensure consistent testing
4. **Test before pushing** - Catch issues locally before they block deployments
