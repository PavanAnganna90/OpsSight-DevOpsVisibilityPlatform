# Vercel Root Directory Configuration

## Important: Set Root Directory in Vercel Dashboard

The `rootDirectory` property **cannot** be set in `vercel.json` - it must be configured in the Vercel Dashboard.

## Steps to Configure Root Directory

1. Go to your Vercel project dashboard: https://vercel.com/dashboard
2. Select your project (OpsSight-DevOpsVisibilityPlatform)
3. Go to **Settings** → **General**
4. Scroll down to **Root Directory**
5. Click **Edit**
6. Set Root Directory to: `frontend`
7. Click **Save**

## Why This Matters

- When `rootDirectory` is set to `frontend` in the dashboard:
  - All commands run from the `frontend/` directory
  - `outputDirectory` in `vercel.json` should be `.next` (not `frontend/.next`)
  - Build commands don't need `cd frontend`

- Currently, since `rootDirectory` is NOT set in dashboard:
  - Commands in `vercel.json` use `cd frontend` explicitly
  - `outputDirectory` is set to `frontend/.next` (relative to repo root)

## Recommendation

**Option 1 (Recommended):** Set `rootDirectory` in Vercel Dashboard to `frontend`
- Then update `vercel.json` to remove `cd frontend` from commands
- Set `outputDirectory` to `.next`

**Option 2 (Current):** Keep current setup with explicit `cd frontend` in commands
- Works fine, but requires `cd` in every command
- `outputDirectory` must be `frontend/.next`

## Current Configuration

The current `vercel.json` is configured for **Option 2** (no rootDirectory set in dashboard):
- Commands explicitly `cd frontend`
- `outputDirectory` is `frontend/.next`

This works correctly, but setting `rootDirectory` in the dashboard would simplify the configuration.

