# 🐛 Debugging Bundled Files Loading

## Quick Diagnosis

If you're getting "Failed to fetch" errors when loading bundled files, follow this debugging guide:

## 🔍 Check Console Output

### **1. Main Process Console (Terminal)**
Look for these messages when starting the app:
```
🎯 Bundled protocol handler registered
🚀 Creating main window...
```

### **2. Renderer Process Console (DevTools)**
Look for these messages when clicking "Load Bundled Game":
```
🎮 Starting bundled game loading...
🔄 Attempting to load bundled file: ROCKRAIDERS.cue
🌐 Trying bundled protocol: bundled://ROCKRAIDERS.cue
```

## 🚨 Common Issues & Solutions

### **Issue 1: "Bundled protocol failed"**
**Symptoms**: Console shows "⚠️ Bundled protocol failed for ROCKRAIDERS.cue"
**Cause**: Protocol handler not registered or files not accessible
**Solutions**:
- Check main process console for "🎯 Bundled protocol handler registered"
- Verify bundled files exist in `desktop-shell/bundled/`
- Check protocol handler console for request logs

### **Issue 2: "Failed to fetch" from bundled protocol**
**Symptoms**: Console shows "🌐 Trying bundled protocol" but fetch fails
**Cause**: Protocol not working or files not found
**Solutions**:
- Check if protocol handler is registered in main process
- Verify bundled files exist and are readable
- Check main process console for protocol request logs

### **Issue 3: "File not found" from server**
**Symptoms**: Server responds with 404
**Cause**: File path is incorrect or files missing
**Solutions**:
- Verify `bundled/ROCKRAIDERS.cue` and `bundled/ROCKRAIDERS.bin` exist
- Check file permissions
- Verify build configuration includes `bundled/**/*`

## 🛠️ Manual Testing

### **Test 1: Check Protocol Handler**
```bash
# In terminal, look for protocol handler registration
cd desktop-shell
npm start
# Should show: "🎯 Bundled protocol handler registered"
```

### **Test 2: Test File Access**
```bash
# Check if files exist
ls -la bundled/
# Should show:
# ROCKRAIDERS.cue (211 bytes)
# ROCKRAIDERS.bin (722,111,040 bytes)
```

### **Test 3: Test Protocol Handler**
```bash
# Check main process console for protocol requests
# Should show: "Bundled protocol request: bundled://ROCKRAIDERS.cue"
```

### **Test 4: Check Protocol in Renderer**
In the app's DevTools console:
```javascript
// Test the protocol directly
fetch('bundled://ROCKRAIDERS.cue').then(r => r.text()).then(console.log);
```

## 🔧 Advanced Debugging

### **Enable Verbose Logging**
The app now includes extensive logging. Look for:
- 🎯 Server startup messages
- 🌐 File request attempts
- ✅ Success confirmations
- ❌ Error details
- ⚠️ Warning messages

### **Check Network Tab**
In DevTools → Network tab:
1. Click "Load Bundled Game"
2. Look for requests to `localhost:PORT`
3. Check response status and content

### **Verify File Contents**
```bash
# Check CUE file content
head -5 bundled/ROCKRAIDERS.cue

# Check BIN file size
ls -lh bundled/ROCKRAIDERS.bin
```

## 🚀 Quick Fixes

### **Fix 1: Rebuild Everything**
```bash
cd desktop-shell
npm run clean
npm install
npm run pack
```

### **Fix 2: Check File Paths**
```bash
# Ensure files are in the right place
pwd  # Should be in desktop-shell/
ls -la bundled/  # Should show CUE and BIN files
```

### **Fix 3: Restart Server**
```bash
# Kill any existing Electron processes
pkill -f "Rock Raiders"
# Then restart
npm start
```

## 📋 Debug Checklist

- [ ] Main process console shows server startup
- [ ] Server port is exposed to renderer
- [ ] Bundled files exist in correct location
- [ ] Files are included in build configuration
- [ ] Network requests reach the server
- [ ] Server can read and serve the files
- [ ] Renderer can access the served files

## 🆘 Still Having Issues?

If the problem persists:

1. **Check the console output** - Look for specific error messages
2. **Verify file existence** - Ensure CUE/BIN files are present
3. **Test server manually** - Use curl to test the HTTP server
4. **Check permissions** - Ensure files are readable
5. **Rebuild completely** - Clean build from scratch

## 📞 Get Help

Include these details when asking for help:
- Console output (both main and renderer)
- File structure (`ls -la bundled/`)
- Error messages
- Steps to reproduce
- OS version and Electron version
