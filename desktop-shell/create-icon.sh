#!/bin/bash

echo "🎨 Creating macOS app icon..."

# Check if we have the source icon
if [ ! -f "assets/icon.png" ]; then
    echo "❌ Error: assets/icon.png not found!"
    exit 1
fi

# Create iconset directory
mkdir -p assets/icon.iconset

# Generate different sizes (macOS requires these specific sizes)
echo "📏 Generating icon sizes..."

# Copy the 32x32 icon to different sizes
cp assets/icon.png assets/icon.iconset/icon_16x16.png
cp assets/icon.png assets/icon.iconset/icon_16x16@2x.png
cp assets/icon.png assets/icon.iconset/icon_32x32.png
cp assets/icon.png assets/icon.iconset/icon_32x32@2x.png
cp assets/icon.png assets/icon.iconset/icon_128x128.png
cp assets/icon.png assets/icon.iconset/icon_128x128@2x.png
cp assets/icon.png assets/icon.iconset/icon_256x256.png
cp assets/icon.png assets/icon.iconset/icon_256x256@2x.png
cp assets/icon.png assets/icon.iconset/icon_512x512.png
cp assets/icon.png assets/icon.iconset/icon_512x512@2x.png

# Convert to ICNS using iconutil
echo "🔧 Converting to ICNS format..."
iconutil -c icns assets/icon.iconset -o assets/icon.icns

if [ $? -eq 0 ]; then
    echo "✅ Icon created successfully: assets/icon.icns"
    echo "🧹 Cleaning up temporary files..."
    rm -rf assets/icon.iconset
else
    echo "❌ Failed to create icon!"
    exit 1
fi
