# Rock Raiders Standalone App

This is a standalone macOS app wrapper for the Rock Raiders Web game using Electron.

## Features

- 🎮 Full Rock Raiders game experience
- 🖥️ Native macOS app with proper Command+Q support
- 📱 Double-click to run, no installation required
- 🔒 Hardened runtime for security
- 🎨 Native macOS appearance

## Quick Start

### Option 1: Use the build script (Recommended)
```bash
cd desktop-shell
./build.sh
```

### Option 2: Manual build
```bash
# Build the game first
cd ..
npm run build

# Build the Electron app
cd desktop-shell
npm install
npm run dist
```

## Running the App

After building, you'll find the app in the `dist/` directory:
- `Rock Raiders.app` - The standalone app
- `Rock Raiders.dmg` - Installer disk image

Simply double-click the `.app` file to run the game!

## Controls

- **Command+Q** - Quit the app
- **Command+W** - Close window
- **Command+M** - Minimize
- **Command+F** - Toggle fullscreen

## Development

```bash
# Run in development mode
npm run dev

# Build and run
npm run pack
```

## Troubleshooting

### App won't open
- Make sure you're running macOS 10.14 or later
- Check that the app is not quarantined (right-click → Open)
- Verify the build completed successfully

### Game files not loading
- Ensure you've built the game first (`npm run build` in the root directory)
- Check that the `dist/` folder contains the built game files

## Building for Distribution

```bash
npm run dist        # Creates .dmg installer
npm run dist:zip    # Creates .zip archive
```

## Requirements

- macOS 10.14 (Mojave) or later
- Node.js 18+ and npm
- Electron 31+
