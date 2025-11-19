# Local Vercel Testing vs Vercel Cloud Differences

## ARCHITECT Analysis

### Key Differences

#### 1. **Workspace Hoisting Behavior**

**Local Environment:**
- npm workspace hoisting depends on:
  - npm version
  - `package-lock.json` state
  - Local cache
  - Operating system
- May hoist packages differently than expected
- Can have inconsistent behavior between runs

**Vercel Cloud:**
- Always hoists packages to root `node_modules`
- Consistent behavior across all builds
- Clean environment with fresh clone
- Predictable hoisting patterns

**Impact:**
- Native modules may be in different locations
- Binary paths need to handle both root and local cases

---

#### 2. **Native Module Resolution**

**Local Environment:**
- Native binaries may be found in:
  - `frontend/node_modules/` (local installation)
  - `../node_modules/` (workspace hoisted)
  - Platform-specific packages installed automatically

**Vercel Cloud:**
- Native binaries always in root `node_modules` when hoisted
- Platform-specific packages need explicit installation
- Must manually copy binaries to where packages expect them

**Impact:**
- Script must detect both locations
- Must copy binaries to correct destination
- Rebuild commands may behave differently

---

#### 3. **Build Context**

**Local Environment:**
- Full project tree available
- Existing `node_modules` may affect behavior
- Local cache may mask issues
- Can run from any directory

**Vercel Cloud:**
- Clean, isolated environment
- Fresh git clone (no cache)
- Specific working directory (`frontend/`)
- No local dependencies

**Impact:**
- Must handle clean installs
- Path detection must be robust
- Cannot rely on pre-existing state

---

#### 4. **Package Installation**

**Local Environment:**
- Optional dependencies may install automatically
- Platform-specific packages installed for local OS
- May have cached packages

**Vercel Cloud:**
- Optional dependencies may not install (npm bug)
- Platform-specific packages must be explicitly installed
- Always Linux x64-gnu environment

**Impact:**
- Must explicitly install platform-specific packages
- Must handle optional dependency installation manually
- Must copy binaries after installation

---

#### 5. **Error Visibility**

**Local Environment:**
- May work due to local cache/state
- Errors may be masked
- Inconsistent behavior

**Vercel Cloud:**
- Always fresh, exposes all issues
- Consistent error messages
- Easier to debug (clean state)

**Impact:**
- Local testing may not catch all issues
- Need Docker/Vercel CLI to simulate cloud
- Build logs are more reliable

---

## Solution: Robust Script Approach

### Current Script Logic

1. **Install native packages** (explicitly for Linux)
2. **Detect binary location** (root or local)
3. **Detect package location** (where it expects binary)
4. **Copy binary to correct location**
5. **Rebuild packages** (ensure correct linking)

### Key Patterns

- Always check both root and local locations
- Handle workspace hoisting variations
- Copy to wherever package actually is (not where we think)
- Rebuild after copying to ensure linking

---

## Testing Strategy

### Local Testing

1. **Docker Test** (`test-vercel-exact.sh`):
   - Simulates Vercel environment exactly
   - Uses same base image (node:20-alpine)
   - Matches Vercel's build commands
   - Should catch 99% of issues

2. **Workspace Test** (`test-vercel-workspace.sh`):
   - Tests workspace installation
   - Validates dependency resolution
   - Checks for hoisting issues

3. **Direct Build** (`npm run build`):
   - Quick validation
   - May miss workspace-specific issues
   - Not reliable for final validation

### Vercel Cloud

- Always run Docker test before pushing
- Check build logs carefully
- Use consistent commit messages for debugging

---

## Known Issues

### npm Optional Dependencies Bug

- Reference: https://github.com/npm/cli/issues/4828
- Issue: Optional dependencies not always installed
- Solution: Explicitly install platform-specific packages

### Workspace Hoisting Inconsistency

- Issue: Packages may hoist differently
- Solution: Script handles both root and local cases
- Detection logic checks actual locations

### Native Binary Path Resolution

- Issue: Packages look for binaries in different locations
- Solution: Copy to multiple possible locations
- Rebuild ensures correct linking

---

## Recommendations

1. **Always test with Docker** before pushing to Vercel
2. **Use explicit platform packages** for native modules
3. **Handle workspace hoisting** in all scripts
4. **Rebuild after copying binaries** to ensure linking
5. **Check build logs** for actual paths used

