# 🎮 Extracted Files Feature - Complete!

## What Was Implemented

Your Rock Raiders Electron app now supports loading **extracted game files** directly instead of requiring CUE/BIN files! This provides faster loading and more flexibility.

## ✨ New Features

### 1. **Direct File Loading**
- **No CUE/BIN parsing needed** - Loads extracted files directly
- **Faster startup** - Skips the ISO extraction step
- **More flexible** - Can mix and match different file sources

### 2. **Supported File Types**
- **`data1.hdr`** - CAB header file (contains file index)
- **`data1.cab`** - CAB volume file (contains compressed game data)
- **`out02.cdr`, `out03.cdr`, `out04.cdr`** - Audio track files
- **Other ISO files** - autorun.inf, setup.exe, readme.txt, etc.

### 3. **Smart Loading System**
- **Automatic CAB parsing** - Extracts all game files automatically
- **Progress tracking** - Shows detailed loading progress
- **Error handling** - Graceful fallback if files are missing

## 🔧 How to Use

### **Step 1: Extract Your Game Files**
```bash
# Extract the BIN/CUE files to get individual tracks
bchunk ROCKRAIDERS.BIN ROCKRAIDERS.CUE out

# Extract the ISO file to get the game files
7z x out01.iso -oout01

# You'll get:
# - out01/ (extracted ISO contents)
# - out02.cdr (audio track 1)
# - out03.cdr (audio track 2)
# - out04.cdr (audio track 3)
```

### **Step 2: Copy Files to Bundled Directory**
```bash
# Run the provided script
./copy-extracted-files.sh

# Or manually copy the files:
cp ~/LEGO/data1.hdr bundled/
cp ~/LEGO/data1.cab bundled/
cp out02.cdr bundled/
cp out03.cdr bundled/
cp out04.cdr bundled/
```

### **Step 3: Remove Old Files (Optional)**
```bash
# Remove the old BIN/CUE files to save space
rm bundled/ROCKRAIDERS.bin bundled/ROCKRAIDERS.cue
```

## 🚀 Benefits

### **Performance Improvements**
- **Faster loading** - No need to parse CUE/BIN files
- **Reduced memory usage** - Direct file access
- **Better caching** - Individual files can be cached separately

### **Flexibility**
- **Mix and match** - Can combine files from different sources
- **Partial updates** - Update individual files without full re-extraction
- **Debugging** - Easier to inspect individual files

### **Maintenance**
- **Smaller bundle size** - Only include what you need
- **Easier updates** - Replace individual files
- **Better organization** - Clear file structure

## 🔍 Technical Details

### **File Loading Order**
1. **CAB files** - `data1.hdr` and `data1.cab` are loaded first
2. **Game files** - All files are extracted from the CAB
3. **Audio tracks** - CDR files are loaded as music tracks
4. **Other files** - Additional ISO files are loaded if available

### **Fallback Support**
- **Bundled protocol** - Primary loading method in Electron
- **Web fallback** - Works in web browsers
- **Asset fallback** - Final fallback for development

### **Error Handling**
- **Missing files** - Gracefully skips unavailable files
- **Corrupted files** - Reports errors without crashing
- **Partial loading** - Continues with available files

## 📁 File Structure

```
desktop-shell/
├── bundled/
│   ├── data1.hdr          # CAB header file
│   ├── data1.cab          # CAB volume file
│   ├── out02.cdr          # Audio track 1
│   ├── out03.cdr          # Audio track 2
│   ├── out04.cdr          # Audio track 3
│   ├── autorun.inf        # Auto-run configuration
│   ├── setup.exe          # Installer executable
│   ├── setup.ini          # Installer configuration
│   ├── readme.txt         # Game documentation
│   └── license.txt        # License information
```

## 🎯 Migration from BIN/CUE

### **Before (BIN/CUE)**
```
ROCKRAIDERS.bin (689 MB) + ROCKRAIDERS.cue → Parse → Extract ISO → Parse CAB → Load files
```

### **After (Extracted Files)**
```
data1.hdr + data1.cab + audio tracks → Parse CAB → Load files
```

### **Space Savings**
- **BIN file**: ~689 MB
- **Extracted files**: ~200-300 MB (depending on compression)
- **Savings**: 50-70% reduction in bundle size

## 🚨 Troubleshooting

### **Common Issues**

#### **"File not found" errors**
- Check that files are in the `bundled/` directory
- Verify file names match exactly (case-sensitive)
- Ensure files have proper permissions

#### **Audio not working**
- Verify CDR files are present
- Check file sizes (should be ~30-35 MB each)
- Ensure files aren't corrupted

#### **Game files missing**
- Check CAB files are valid
- Verify file integrity
- Try re-extracting from original ISO

### **Debug Mode**
Enable verbose logging to see detailed file loading:
```javascript
// In browser console
localStorage.setItem('verbose', 'true')
```

## 🔮 Future Enhancements

### **Planned Features**
- **Dynamic file loading** - Load files on-demand
- **Compression support** - Compress audio/video files
- **Update system** - Automatic file updates
- **Cloud storage** - Store files remotely

### **Customization Options**
- **File selection** - Choose which files to include
- **Quality settings** - Different audio/video quality levels
- **Language packs** - Multiple language support

---

**🎉 Congratulations!** You now have a much more efficient and flexible game loading system!
