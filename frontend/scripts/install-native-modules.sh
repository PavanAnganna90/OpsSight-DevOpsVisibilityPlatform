#!/bin/bash
# Script to install native modules for Vercel build
# This is called from vercel.json buildCommand to avoid exceeding 256 character limit

set -e

echo "📦 Installing native modules for Linux..."

# Install native platform packages
npm install --no-save --force --legacy-peer-deps \
  lightningcss-linux-x64-gnu@1.30.1 \
  @tailwindcss/oxide-linux-x64-gnu@4.1.8

# Copy binary to where lightningcss expects it
# lightningcss is hoisted to root node_modules due to workspace hoisting
if [ -f "../node_modules/lightningcss-linux-x64-gnu/lightningcss.linux-x64-gnu.node" ]; then
  echo "📋 Copying native binary to lightningcss directory..."
  cp -f ../node_modules/lightningcss-linux-x64-gnu/lightningcss.linux-x64-gnu.node \
    ../node_modules/lightningcss/lightningcss.linux-x64-gnu.node
  echo "✅ Binary copied successfully"
else
  echo "⚠️  Warning: Binary not found, skipping copy"
fi

# Rebuild lightningcss to ensure correct linking
echo "🔨 Rebuilding lightningcss..."
npm rebuild lightningcss

echo "✅ Native modules installation complete"

