#!/bin/bash

# Script to copy extracted Rock Raiders files to the bundled directory
# This script assumes you've already run:
# bchunk ROCKRAIDERS.BIN ROCKRAIDERS.CUE out
# 7z x out01.iso -oout01

echo "🎮 Copying extracted Rock Raiders files to bundled directory..."

# Create bundled directory if it doesn't exist
mkdir -p bundled

# Copy the extracted CAB files from the ISO
echo "📁 Copying CAB files..."
cp ~/LEGO/out01/data1.hdr bundled/
cp ~/LEGO/out01/data1.cab bundled/

# Copy the audio track files
echo "🎵 Copying audio tracks..."
cp ~/LEGO/out02.cdr bundled/
cp ~/LEGO/out03.cdr bundled/
cp ~/LEGO/out04.cdr bundled/

# Copy any other important files from the extracted ISO
echo "📄 Copying other ISO files..."
cp ~/LEGO/out01/autorun.inf bundled/ 2>/dev/null || echo "⚠️ autorun.inf not found, skipping"
cp ~/LEGO/out01/setup.exe bundled/ 2>/dev/null || echo "⚠️ setup.exe not found, skipping"
cp ~/LEGO/out01/setup.ini bundled/ 2>/dev/null || echo "⚠️ setup.ini not found, skipping"
cp ~/LEGO/out01/readme.txt bundled/ 2>/dev/null || echo "⚠️ readme.txt not found, skipping"
cp ~/LEGO/out01/license.txt bundled/ 2>/dev/null || echo "⚠️ license.txt not found, skipping"

echo "✅ Files copied successfully!"
echo ""
echo "📋 Files in bundled directory:"
ls -la bundled/

echo ""
echo "🎯 You can now remove the old BIN/CUE files if you want:"
echo "   rm bundled/ROCKRAIDERS.bin bundled/ROCKRAIDERS.cue"
echo ""
echo "🚀 The app will now load the extracted files directly!"
