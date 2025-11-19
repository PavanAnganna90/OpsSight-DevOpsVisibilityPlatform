#!/bin/bash
# Script to simulate Vercel build environment locally using Docker
# This runs the build in a Linux container, exactly like Vercel
# IMPORTANT: Simulates workspace setup like Vercel does

set -e

echo "🐳 Simulating Vercel Build with Docker (Workspace-Aware)"
echo "========================================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    echo "   Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✅ Docker version: $(docker --version)"
echo ""

# Get the project root (parent of frontend)
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo "📁 Project root: $PROJECT_ROOT"
echo "📁 Frontend dir: $FRONTEND_DIR"
echo ""

# Create a Dockerfile that simulates Vercel's workspace setup
cat > "$PROJECT_ROOT/Dockerfile.vercel-test" << 'EOF'
FROM node:20-alpine AS builder

WORKDIR /app

# Install system dependencies for building
RUN apk add --no-cache libc6-compat

# Copy root package.json first (workspace config)
COPY package.json ./

# Copy frontend package.json
COPY frontend/package.json ./frontend/
COPY frontend/package-lock.json ./frontend/ 2>/dev/null || true

# Copy vercel.json
COPY vercel.json ./frontend/ 2>/dev/null || true

# IMPORTANT: Install from root with workspaces (like Vercel does)
# This will install root package.json dependencies AND workspace dependencies
RUN npm install --omit=optional --force || npm install --omit=optional --force --workspaces=false frontend

# Install Linux-specific native modules (like Vercel does)
RUN cd frontend && npm install --no-save --force lightningcss-linux-x64-gnu@1.30.1 @tailwindcss/oxide-linux-x64-gnu@4.1.8 || true

# Copy frontend source code
COPY frontend/next.config.js ./frontend/
COPY frontend/tsconfig.json ./frontend/
COPY frontend/tailwind.config.ts ./frontend/ 2>/dev/null || true
COPY frontend/postcss.config.mjs ./frontend/ 2>/dev/null || true
COPY frontend/src/ ./frontend/src/
COPY frontend/public/ ./frontend/public/

# Set build environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application (like Vercel does)
WORKDIR /app/frontend
RUN npm run build

# Output the build result
FROM builder AS output
WORKDIR /app/frontend
CMD ["ls", "-la", ".next"]
EOF

echo "📦 Building Docker image with workspace setup..."
echo "   (This simulates Vercel's exact behavior)"
echo ""

cd "$PROJECT_ROOT"
docker build -f Dockerfile.vercel-test -t vercel-build-test .

echo ""
echo "✅ Build completed in Docker!"
echo ""
echo "🧹 Cleaning up..."
rm -f "$PROJECT_ROOT/Dockerfile.vercel-test"
docker rmi vercel-build-test || true

echo ""
echo "✅ Vercel build simulation completed!"
echo ""
echo "📝 This test:"
echo "   ✅ Installs from root package.json (workspace setup)"
echo "   ✅ Includes root package.json dependencies"
echo "   ✅ Uses Linux environment (like Vercel)"
echo "   ✅ Would have caught the string-width-cjs issue!"
echo ""
