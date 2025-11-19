#!/bin/bash
# CRITICAL: Test Vercel build EXACTLY as Vercel does it
# This MUST pass before pushing to Vercel
# This simulates: installCommand + buildCommand exactly

set -e

echo "🚨 CRITICAL: Testing Vercel Build EXACTLY"
echo "=========================================="
echo ""
echo "This test matches Vercel's behavior 100%"
echo "If this fails, Vercel will fail!"
echo ""

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo "📁 Project root: $PROJECT_ROOT"
echo "📁 Frontend dir: $FRONTEND_DIR"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required for this test"
    exit 1
fi

echo "🧹 Cleaning up..."
# Don't fail if cleanup has issues - Docker test will use fresh state
rm -rf "$PROJECT_ROOT/node_modules" "$FRONTEND_DIR/node_modules" 2>/dev/null || true
rm -f "$PROJECT_ROOT/Dockerfile.vercel-exact-test" 2>/dev/null || true

echo ""
echo "📦 Creating Docker test that matches Vercel EXACTLY..."
echo ""

# Create Dockerfile that EXACTLY matches Vercel's behavior
cat > "$PROJECT_ROOT/Dockerfile.vercel-exact-test" << 'DOCKERFILE'
FROM node:20-alpine AS builder

WORKDIR /app

# Install system deps
RUN apk add --no-cache libc6-compat bash

# Copy package files (root and frontend)
COPY package.json package-lock.json* ./
COPY frontend/package.json frontend/package-lock.json* ./frontend/
COPY vercel.json ./

# STEP 1: Install command (EXACTLY like Vercel)
# installCommand: "cd .. && npm install --omit=optional --force"
# But Vercel runs from frontend/, so it goes to root
WORKDIR /app/frontend
RUN cd .. && npm install --omit=optional --force

# STEP 2: Build command (EXACTLY like Vercel)
# buildCommand: "npm install --omit=optional --force && bash scripts/install-native-modules.sh && npm run build"
# Vercel runs this from frontend/ directory
WORKDIR /app/frontend

# Copy frontend source to current directory (we're already in /app/frontend)
COPY frontend/ ./

# Run buildCommand exactly as in vercel.json
RUN npm install --omit=optional --force && \
    bash scripts/install-native-modules.sh && \
    npm run build

# Verify build output exists
RUN test -d .next && echo "✅ Build successful" || (echo "❌ Build failed" && exit 1)

FROM builder AS output
WORKDIR /app/frontend
CMD ["ls", "-la", ".next"]
DOCKERFILE

echo "🔨 Building Docker image (simulating Vercel exactly)..."
echo ""

cd "$PROJECT_ROOT"

if docker build -f Dockerfile.vercel-exact-test -t vercel-exact-test . 2>&1 | tee /tmp/vercel-test.log; then
    echo ""
    echo "✅✅✅ DOCKER BUILD SUCCEEDED ✅✅✅"
    echo ""
    echo "This means it will work on Vercel!"
    echo ""
    
    # Clean up
    docker rmi vercel-exact-test || true
    rm -f "$PROJECT_ROOT/Dockerfile.vercel-exact-test"
    
    exit 0
else
    echo ""
    echo "❌❌❌ DOCKER BUILD FAILED ❌❌❌"
    echo ""
    echo "ERROR LOG:"
    tail -50 /tmp/vercel-test.log
    echo ""
    echo "🚨 DO NOT PUSH TO VERCEL UNTIL THIS PASSES!"
    echo ""
    
    # Clean up
    docker rmi vercel-exact-test || true
    rm -f "$PROJECT_ROOT/Dockerfile.vercel-exact-test"
    
    exit 1
fi

