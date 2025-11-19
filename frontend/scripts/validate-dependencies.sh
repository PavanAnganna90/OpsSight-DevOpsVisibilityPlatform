#!/bin/bash
# Script to validate all dependencies in root package.json
# This checks for invalid versions that would cause Vercel build failures
# Run this before pushing to catch dependency issues early

set -e

echo "🔍 Validating Root Package.json Dependencies"
echo "============================================="
echo ""

# Get project root
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "📁 Checking: $PROJECT_ROOT/package.json"
echo ""

# List of *-cjs packages that are known to have version issues
CJS_PACKAGES=("string-width-cjs" "strip-ansi-cjs" "wrap-ansi-cjs")

echo "1️⃣  Checking *-cjs packages for invalid versions..."
echo ""

ERRORS=0

for pkg in "${CJS_PACKAGES[@]}"; do
    # Get version from package.json
    VERSION=$(grep "\"$pkg\":" package.json | sed -E 's/.*"'"$pkg"'":\s*"([^"]+)".*/\1/')
    
    if [ -z "$VERSION" ]; then
        continue
    fi
    
    # Remove ^ or ~ prefix
    CLEAN_VERSION=$(echo "$VERSION" | sed 's/^[\^~]//')
    
    # Extract major version
    MAJOR_VERSION=$(echo "$CLEAN_VERSION" | cut -d. -f1)
    
    # Check available versions
    AVAILABLE=$(npm view "$pkg" versions --json 2>/dev/null | tail -1 || echo "[]")
    
    # Check if the major version exists
    if echo "$AVAILABLE" | grep -q "\"$MAJOR_VERSION\." || echo "$AVAILABLE" | grep -q "^$MAJOR_VERSION\."; then
        echo "   ✅ $pkg: $VERSION (valid)"
    else
        # Get latest version
        LATEST=$(npm view "$pkg" version 2>/dev/null || echo "unknown")
        echo "   ❌ $pkg: $VERSION (INVALID - latest: $LATEST)"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""

if [ $ERRORS -gt 0 ]; then
    echo "❌ Found $ERRORS invalid dependency version(s)"
    echo ""
    echo "💡 Fix by updating package.json with valid versions"
    exit 1
else
    echo "✅ All *-cjs packages have valid versions"
fi

echo ""
echo "2️⃣  Testing workspace installation..."
echo "   (This is what Vercel does)"
echo ""

# Clean and test install
rm -rf node_modules package-lock.json frontend/node_modules frontend/package-lock.json 2>/dev/null || true

if npm install --omit=optional --force 2>&1 | grep -q "ETARGET\|No matching version"; then
    echo "   ❌ Installation failed - check dependency errors above"
    exit 1
else
    echo "   ✅ Installation successful"
fi

echo ""
echo "✅ All dependencies validated!"
echo "   Your build should succeed on Vercel"

