#!/bin/bash
# Script to install native modules for Vercel build
# This is called from vercel.json buildCommand to avoid exceeding 256 character limit
# IMPORTANT: This runs from frontend/ directory (Vercel auto-detects and sets working dir)

set -e

echo "📦 Installing native modules for Linux..."
echo "Working directory: $(pwd)"

# Install native platform packages
# These will hoist to root node_modules due to workspace hoisting
npm install --no-save --force --legacy-peer-deps \
  lightningcss-linux-x64-gnu@1.30.1 \
  @tailwindcss/oxide-linux-x64-gnu@4.1.8

# Determine where packages were installed (workspace hoisting)
BINARY_SOURCE="../node_modules/lightningcss-linux-x64-gnu/lightningcss.linux-x64-gnu.node"
LIGHTNINGCSS_DIR="../node_modules/lightningcss"

# Check if binary exists in root (workspace hoisted)
if [ -f "$BINARY_SOURCE" ]; then
  echo "📋 Found binary in root node_modules (workspace hoisted)"
  echo "📋 Copying native binary to lightningcss directory..."
  
  # Ensure lightningcss directory exists
  mkdir -p "$LIGHTNINGCSS_DIR"
  
  # Copy binary to where lightningcss expects it
  cp -f "$BINARY_SOURCE" "$LIGHTNINGCSS_DIR/lightningcss.linux-x64-gnu.node"
  echo "✅ Binary copied successfully to $LIGHTNINGCSS_DIR/"
else
  echo "⚠️  Warning: Binary not found at $BINARY_SOURCE"
  echo "   Checking current directory..."
  
  # Check if installed locally (shouldn't happen with workspace)
  if [ -f "node_modules/lightningcss-linux-x64-gnu/lightningcss.linux-x64-gnu.node" ]; then
    echo "📋 Found binary in local node_modules"
    mkdir -p "node_modules/lightningcss"
    cp -f "node_modules/lightningcss-linux-x64-gnu/lightningcss.linux-x64-gnu.node" \
      "node_modules/lightningcss/lightningcss.linux-x64-gnu.node"
    echo "✅ Binary copied successfully"
  else
    echo "❌ ERROR: Cannot find native binary!"
    echo "   Tried: $BINARY_SOURCE"
    echo "   Tried: node_modules/lightningcss-linux-x64-gnu/lightningcss.linux-x64-gnu.node"
    exit 1
  fi
fi

# Rebuild lightningcss to ensure correct linking
echo "🔨 Rebuilding lightningcss..."
npm rebuild lightningcss || echo "⚠️  Rebuild warning (may be OK)"

echo "✅ Native modules installation complete"

