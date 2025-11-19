#!/bin/bash
# Script to simulate Vercel environment locally using Docker
# This runs the build in a Linux container, exactly like Vercel

set -e

echo "🐳 Simulating Vercel Build with Docker"
echo "======================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    echo "   Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✅ Docker version: $(docker --version)"
echo ""

# Create a temporary Dockerfile for Vercel simulation
cat > Dockerfile.vercel-test << 'EOF'
FROM node:20-alpine AS builder

WORKDIR /app

# Install system dependencies for building
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./
COPY vercel.json ./

# Install dependencies (matching Vercel's install command)
RUN npm install --omit=optional --force
RUN npm install --no-save --force lightningcss-linux-x64-gnu@1.30.1 @tailwindcss/oxide-linux-x64-gnu@4.1.8 || true

# Copy source code
COPY . .

# Build (matching Vercel's build command)
RUN npm run build

# Output the build result
FROM builder AS output
WORKDIR /app
COPY --from=builder /app/.next ./.next
CMD ["ls", "-la", ".next"]
EOF

echo "📦 Building Docker image..."
docker build -f Dockerfile.vercel-test -t vercel-build-test .

echo ""
echo "✅ Build completed in Docker!"
echo ""
echo "🧹 Cleaning up..."
rm -f Dockerfile.vercel-test
docker rmi vercel-build-test || true

echo ""
echo "✅ Vercel build simulation completed!"
echo ""

