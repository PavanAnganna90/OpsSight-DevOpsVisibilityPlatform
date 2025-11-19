#!/bin/bash
# Script to test Vercel build locally
# This simulates the exact build process Vercel uses

set -e

echo "🚀 Testing Vercel Build Locally"
echo "================================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed"
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

echo "✅ Vercel CLI version: $(vercel --version)"
echo ""

# Check if project is linked
if [ ! -d ".vercel" ]; then
    echo "⚠️  Project not linked to Vercel"
    echo "🔗 Linking project..."
    echo "   (This will prompt you to select/create a project)"
    vercel link
fi

echo ""
echo "📦 Pulling environment variables..."
vercel env pull .env.local 2>/dev/null || echo "   (No environment variables to pull)"
echo ""

echo "🏗️  Running Vercel build..."
echo "   This uses the exact same build process as Vercel"
echo ""

# Run the build with the same command as Vercel uses
vercel build --prod

echo ""
echo "✅ Build completed successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Review the build output above"
echo "   2. If successful, deploy with: vercel --prod"
echo "   3. Or test locally with: npm run dev:vercel"
echo ""

