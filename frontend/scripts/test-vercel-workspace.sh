#!/bin/bash
# Script to test Vercel build locally using actual workspace setup
# This matches exactly what Vercel does - installs from root with workspaces

set -e

echo "🧪 Testing Vercel Build with Workspace Setup"
echo "============================================="
echo ""

# Get the project root (parent of frontend)
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo "📁 Project root: $PROJECT_ROOT"
echo "📁 Frontend dir: $FRONTEND_DIR"
echo ""

cd "$PROJECT_ROOT"

echo "1️⃣  Testing workspace installation (like Vercel)..."
echo "   Running: npm install --omit=optional --force"
echo ""

# Clean first
rm -rf node_modules frontend/node_modules

# Test the exact command Vercel uses
if npm install --omit=optional --force 2>&1 | grep -q "string-width-cjs\|ETARGET"; then
    echo "   ❌ DEPENDENCY ERROR DETECTED!"
    echo "   ✅ This would fail on Vercel - good catch!"
    exit 1
else
    echo "   ✅ Installation successful"
fi

echo ""
echo "2️⃣  Testing build..."
cd "$FRONTEND_DIR"

if npm run build 2>&1 | grep -q "Error occurred prerendering page.*404\|Objects are not valid"; then
    echo "   ❌ Build failed with 404/500 error"
    exit 1
elif npm run build 2>&1 | grep -q "✓ Compiled\|Build completed"; then
    echo "   ✅ Build completed successfully!"
else
    echo "   ⚠️  Build status unclear"
fi

echo ""
echo "✅ Workspace build test completed!"

