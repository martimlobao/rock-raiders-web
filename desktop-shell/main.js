const { app, BrowserWindow, Menu, shell, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#000000',
    autoHideMenuBar: false, // Show menu bar for Command+Q
    titleBarStyle: 'hiddenInset', // macOS-style title bar
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webgl: true,
      backgroundThrottling: false
    }
  });

  // Load the built site (index.html) from the bundled assets
  win.loadFile(path.join(__dirname, 'app', 'index.html'));

  // Auto-start the game after a short delay
  win.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      win.webContents.executeJavaScript(`
        // Try to auto-start the bundled game
        if (window.BundledGameLoader) {
          console.log('Auto-starting bundled game...');
          // This will be handled by the game's auto-start logic
        }
      `);
    }, 2000); // Wait 2 seconds for the page to fully load
  });

  // Create proper macOS menu with Command+Q
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' } // This enables Command+Q
      ]
    },
    {
      label: 'File',
      submenu: [
        { role: 'close' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Project on GitHub',
          click: () => shell.openExternal('https://github.com/Scarabol/rock-raiders-web')
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Improve perf: disable pinch zoom
  win.webContents.setVisualZoomLevelLimits(1, 1).catch(() => {});
};

app.whenReady().then(() => {
  // Register custom protocol for bundled files
  protocol.handle('bundled', (request) => {
    const url = request.url.replace('bundled://', '');
    const filePath = path.join(__dirname, 'bundled', url);

    console.log(`Bundled protocol request: ${request.url} -> ${filePath}`);

    try {
      const data = fs.readFileSync(filePath);
      const ext = path.extname(url).toLowerCase();

      // Set appropriate content type
      let contentType = 'application/octet-stream';
      if (ext === '.cue') contentType = 'text/plain';
      if (ext === '.bin') contentType = 'application/octet-stream';

      console.log(`✅ Serving bundled file: ${url} (${data.length} bytes)`);

      return new Response(data, {
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      console.error(`❌ Failed to serve bundled file: ${filePath}`, error);
      return new Response('File not found', { status: 404 });
    }
  });

  console.log('🎯 Bundled protocol handler registered');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
