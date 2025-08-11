#!/bin/bash

echo "🚀 Building Rock Raiders Standalone App..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the desktop-shell directory"
    exit 1
fi

# Build the game first
echo "📦 Building the game..."
cd ..
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Game build failed!"
    exit 1
fi
cd desktop-shell

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
fi

# Build the Electron app
echo "🔨 Building Electron app..."
npm run dist

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📱 Your app is ready in the dist/ directory"
    echo "🎮 You can now double-click the .app file to run it!"
else
    echo "❌ Build failed!"
    exit 1
fi
