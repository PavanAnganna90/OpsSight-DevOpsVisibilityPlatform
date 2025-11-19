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

# Handle @tailwindcss/oxide native binding
# @tailwindcss/oxide uses @tailwindcss/oxide-linux-x64-gnu as optional dependency
# The native package should be automatically linked, but we ensure it's accessible
OXIDE_PKG_ROOT="../node_modules/@tailwindcss/oxide-linux-x64-gnu"
OXIDE_PKG_LOCAL="node_modules/@tailwindcss/oxide-linux-x64-gnu"
OXIDE_DIR_ROOT="../node_modules/@tailwindcss/oxide"
OXIDE_DIR_LOCAL="node_modules/@tailwindcss/oxide"

# Find where the oxide native package was installed
OXIDE_PKG_PATH=""
OXIDE_DIR=""

if [ -d "$OXIDE_PKG_ROOT" ] && [ -d "$OXIDE_DIR_ROOT" ]; then
  echo "📋 Found @tailwindcss/oxide packages in root (workspace hoisted)"
  OXIDE_PKG_PATH="$OXIDE_PKG_ROOT"
  OXIDE_DIR="$OXIDE_DIR_ROOT"
elif [ -d "$OXIDE_PKG_LOCAL" ]; then
  echo "📋 Found @tailwindcss/oxide-linux-x64-gnu in local node_modules"
  OXIDE_PKG_PATH="$OXIDE_PKG_LOCAL"
  if [ -d "$OXIDE_DIR_ROOT" ]; then
    echo "📋 @tailwindcss/oxide is in root node_modules (hoisted)"
    OXIDE_DIR="$OXIDE_DIR_ROOT"
  else
    echo "📋 @tailwindcss/oxide is in local node_modules"
    OXIDE_DIR="$OXIDE_DIR_LOCAL"
  fi
fi

# Ensure native package is accessible to @tailwindcss/oxide
# The native binding should be in lib/ directory of the platform package
if [ -n "$OXIDE_PKG_PATH" ] && [ -n "$OXIDE_DIR" ]; then
  echo "📋 Ensuring @tailwindcss/oxide can access native binding..."
  
  # Check for binary in the native package
  if [ -f "$OXIDE_PKG_PATH/lib/oxide.linux-x64-gnu.node" ]; then
    echo "📋 Found native binary in $OXIDE_PKG_PATH/lib/"
    
    # Ensure oxide package can access it - try creating symlink or copying
    mkdir -p "$OXIDE_DIR/lib"
    
    # Try symlink first (preserves package structure)
    if [ ! -f "$OXIDE_DIR/lib/oxide.linux-x64-gnu.node" ]; then
      ln -sf "$(pwd)/$OXIDE_PKG_PATH/lib/oxide.linux-x64-gnu.node" "$OXIDE_DIR/lib/oxide.linux-x64-gnu.node" 2>/dev/null || \
      cp -f "$OXIDE_PKG_PATH/lib/oxide.linux-x64-gnu.node" "$OXIDE_DIR/lib/oxide.linux-x64-gnu.node"
    fi
    
    # Also try root of oxide package (some versions may look there)
    if [ ! -f "$OXIDE_DIR/oxide.linux-x64-gnu.node" ]; then
      cp -f "$OXIDE_PKG_PATH/lib/oxide.linux-x64-gnu.node" "$OXIDE_DIR/oxide.linux-x64-gnu.node" || true
    fi
    
    echo "✅ @tailwindcss/oxide native binding linked/copied successfully"
  else
    echo "⚠️  Warning: Native binary not found at $OXIDE_PKG_PATH/lib/oxide.linux-x64-gnu.node"
    echo "   Package structure:"
    ls -la "$OXIDE_PKG_PATH" 2>/dev/null || echo "   (cannot list package directory)"
  fi
else
  echo "⚠️  Warning: Could not locate @tailwindcss/oxide packages"
  echo "   Tried: $OXIDE_PKG_ROOT"
  echo "   Tried: $OXIDE_PKG_LOCAL"
fi

# Rebuild both packages to ensure correct linking
echo "🔨 Rebuilding native modules..."
npm rebuild lightningcss || echo "⚠️  lightningcss rebuild warning (may be OK)"
npm rebuild @tailwindcss/oxide || echo "⚠️  @tailwindcss/oxide rebuild warning (may be OK)"

echo "✅ Native modules installation complete"

