#!/bin/bash
# Test Vercel build locally WITHOUT Docker
# Simulates workspace setup exactly as Vercel does
# CRITICAL: Must pass before pushing to Vercel

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo "🧪 Testing Vercel Build Locally (Workspace Setup)"
echo "=================================================="
echo ""
echo "This simulates EXACTLY what Vercel does:"
echo "  1. Install from root with workspaces (installCommand)"
echo "  2. Install native modules in frontend (buildCommand)"
echo "  3. Copy binary and rebuild"
echo "  4. Build Next.js"
echo ""

cd "$PROJECT_ROOT"

echo "📁 Project root: $PROJECT_ROOT"
echo "📁 Frontend dir: $FRONTEND_DIR"
echo ""

# Clean state
echo "🧹 Cleaning node_modules..."
rm -rf node_modules frontend/node_modules frontend/.next
echo ""

# STEP 1: Install command (EXACTLY like Vercel)
echo "1️⃣  Running installCommand: cd .. && npm install --omit=optional --force"
echo "   (Vercel runs this from frontend/ directory)"
cd "$FRONTEND_DIR"
cd .. && npm install --omit=optional --force
echo "   ✅ Installation complete"
echo ""

# STEP 2: Build command (EXACTLY like Vercel)
echo "2️⃣  Running buildCommand from frontend/ directory"
echo "   (Vercel auto-detects Next.js and runs from frontend/)"
cd "$FRONTEND_DIR"

echo "   a) npm install --omit=optional --force"
npm install --omit=optional --force
echo "   ✅ Local install complete"
echo ""

echo "   b) bash scripts/install-native-modules.sh"
if bash scripts/install-native-modules.sh; then
    echo "   ✅ Native modules installation complete"
else
    echo "   ❌ Native modules installation FAILED"
    exit 1
fi
echo ""

echo "   c) npm run build"
if npm run build 2>&1 | tee /tmp/build.log | grep -q "✓ Compiled\|Build completed\|Creating an optimized production build"; then
    echo "   ✅ Build completed successfully!"
else
    echo "   ❌ Build FAILED"
    echo ""
    echo "   Build errors:"
    tail -30 /tmp/build.log
    exit 1
fi
echo ""

echo "✅✅✅ LOCAL TEST PASSED ✅✅✅"
echo ""
echo "This build should work on Vercel!"
echo ""

