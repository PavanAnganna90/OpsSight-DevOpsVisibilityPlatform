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
# lightningcss is hoisted to root, so we need to copy binary to root
BINARY_SOURCE_ROOT="../node_modules/lightningcss-linux-x64-gnu/lightningcss.linux-x64-gnu.node"
BINARY_SOURCE_LOCAL="node_modules/lightningcss-linux-x64-gnu/lightningcss.linux-x64-gnu.node"
LIGHTNINGCSS_DIR_ROOT="../node_modules/lightningcss"
LIGHTNINGCSS_DIR_LOCAL="node_modules/lightningcss"

# Strategy: Install native packages (they may go to root or local due to hoisting)
# Then copy binary to wherever lightningcss actually is (usually root)

BINARY_SOURCE=""
LIGHTNINGCSS_DIR=""

# Check root first (workspace hoisting - most common)
if [ -f "$BINARY_SOURCE_ROOT" ] && [ -d "$LIGHTNINGCSS_DIR_ROOT" ]; then
  echo "📋 Found binary in root node_modules (workspace hoisted)"
  BINARY_SOURCE="$BINARY_SOURCE_ROOT"
  LIGHTNINGCSS_DIR="$LIGHTNINGCSS_DIR_ROOT"
# Check local (fallback)
elif [ -f "$BINARY_SOURCE_LOCAL" ]; then
  echo "📋 Found binary in local node_modules"
  BINARY_SOURCE="$BINARY_SOURCE_LOCAL"
  # Check if lightningcss is in root or local
  if [ -d "$LIGHTNINGCSS_DIR_ROOT" ]; then
    echo "📋 lightningcss is in root node_modules (hoisted)"
    LIGHTNINGCSS_DIR="$LIGHTNINGCSS_DIR_ROOT"
  else
    echo "📋 lightningcss is in local node_modules"
    LIGHTNINGCSS_DIR="$LIGHTNINGCSS_DIR_LOCAL"
  fi
else
  echo "❌ ERROR: Cannot find native binary!"
  echo "   Tried: $BINARY_SOURCE_ROOT"
  echo "   Tried: $BINARY_SOURCE_LOCAL"
  exit 1
fi

# Copy binary to where lightningcss expects it
echo "📋 Copying binary from $BINARY_SOURCE to $LIGHTNINGCSS_DIR/"
mkdir -p "$LIGHTNINGCSS_DIR"
cp -f "$BINARY_SOURCE" "$LIGHTNINGCSS_DIR/lightningcss.linux-x64-gnu.node"
echo "✅ Binary copied successfully to $LIGHTNINGCSS_DIR/"

# Rebuild lightningcss to ensure correct linking
echo "🔨 Rebuilding lightningcss..."
npm rebuild lightningcss || echo "⚠️  Rebuild warning (may be OK)"

echo "✅ Native modules installation complete"

