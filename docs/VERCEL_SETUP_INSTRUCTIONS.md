# ⚠️ CRITICAL: Vercel Root Directory Setup Required

## Problem
The build is failing because Vercel cannot find the `frontend` directory. This is because **Root Directory must be set in the Vercel Dashboard**.

## Solution: Set Root Directory in Vercel Dashboard

### Step-by-Step Instructions:

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Sign in if needed

2. **Select Your Project**
   - Find and click on: **OpsSight-DevOpsVisibilityPlatform**

3. **Navigate to Settings**
   - Click on **Settings** tab (top navigation)

4. **Go to General Settings**
   - In the left sidebar, click **General**

5. **Find Root Directory Section**
   - Scroll down to find **Root Directory** section
   - It should currently show: `./` (root of repository)

6. **Edit Root Directory**
   - Click **Edit** button next to Root Directory
   - Change from: `./` 
   - Change to: `frontend`
   - Click **Save**

7. **Redeploy**
   - After saving, Vercel will automatically trigger a new deployment
   - Or manually trigger: **Deployments** → **Redeploy**

## Why This Is Required

- `vercel.json` **cannot** contain `rootDirectory` (invalid schema property)
- Root Directory **must** be set in the Vercel Dashboard
- When Root Directory is set to `frontend`:
  - All commands run from `frontend/` directory automatically
  - No need for `cd frontend` in commands
  - `outputDirectory` should be `.next` (not `frontend/.next`)

## Current Configuration

After setting Root Directory in dashboard:
- ✅ `vercel.json` is already configured correctly
- ✅ Commands will run from `frontend/` directory
- ✅ Output directory is `.next` (correct for frontend root)

## Verification

After setting Root Directory, verify:
1. Go to **Settings** → **General**
2. Root Directory should show: `frontend`
3. Next deployment should succeed

## Alternative: If Root Directory Setting Doesn't Work

If you cannot set Root Directory in dashboard (some Vercel plans may have restrictions), you can:

1. Keep current `vercel.json` with `cd frontend` commands
2. Ensure `frontend/` directory exists in repository
3. Verify directory structure is correct

But **setting Root Directory in dashboard is the recommended approach**.

