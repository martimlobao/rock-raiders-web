const { app, BrowserWindow, Menu, shell, protocol, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

const createWindow = () => {
  console.log('🎯 Creating main window...');

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      enableRemoteModule: false,
      spellcheck: false
    },
    icon: path.join(__dirname, 'assets', 'icon.icns'),
    titleBarStyle: 'hiddenInset',
    show: false,
    alwaysOnTop: true // Force window to be visible initially
  });

  console.log('🎯 Window created, show state:', win.isVisible());

  // Open DevTools by default to see console output
  win.webContents.openDevTools();

  // Load the built site (index.html) from the bundled assets
  win.loadFile(path.join(__dirname, 'app', 'index.html'));

  // Show the window when it's ready
  win.once('ready-to-show', () => {
    // Center the window on the primary display
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const winWidth = 1200;
    const winHeight = 800;
    const x = Math.round((width - winWidth) / 2);
    const y = Math.round((height - winHeight) / 2);

    win.setPosition(x, y);
    win.show();
    win.focus();
    win.moveTop(); // Bring to front

    // Flash the window to draw attention
    win.flashFrame(true);
    setTimeout(() => win.flashFrame(false), 2000);

    console.log('🎯 Main window is now visible and focused');
    console.log('🎯 Screen size:', { width, height });
    console.log('🎯 Window centered at:', { x, y });
    console.log('🎯 Window position:', win.getPosition());
    console.log('🎯 Window size:', win.getSize());
    console.log('🎯 Window bounds:', win.getBounds());
    console.log('🎯 Window is visible:', win.isVisible());
    console.log('🎯 Window is focused:', win.isFocused());

    // Restore normal window behavior after showing
    setTimeout(() => {
      win.setAlwaysOnTop(false);
      console.log('🎯 Restored normal window behavior (not always on top)');
    }, 1000);
  });

  // Track window visibility changes
  win.on('show', () => {
    console.log('🎯 Window show event fired');
  });

  win.on('focus', () => {
    console.log('🎯 Window focus event fired');
  });

  win.on('blur', () => {
    console.log('🎯 Window blur event fired');
  });

  // Fallback: ensure window is visible after a delay
  setTimeout(() => {
    if (!win.isVisible()) {
      win.show();
      win.focus();
      win.moveTop(); // Bring to front
      console.log('🎯 Fallback: forcing window to be visible');
    }

    // Additional fallback: try to bring window to front
    win.moveTop();
    win.focus();
    console.log('🎯 Final window state check:');
    console.log('🎯 - Visible:', win.isVisible());
    console.log('🎯 - Focused:', win.isFocused());
    console.log('🎯 - Position:', win.getPosition());
  }, 3000);

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
        { role: 'quit', accelerator: 'Cmd+Q' } // Explicitly set accelerator
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

  // Backup keyboard shortcut handler for Cmd+Q
  win.webContents.on('before-input-event', (event, input) => {
    if (input.control || input.meta) {
      if (input.key === 'q' || input.key === 'Q') {
        console.log('🎯 Cmd+Q detected via backup handler');
        app.quit();
      }
    }
  });

  // Improve perf: disable pinch zoom
  win.webContents.setVisualZoomLevelLimits(1, 1).catch(() => {});
};

app.whenReady().then(() => {
  // Register global shortcut for Cmd+Q as backup
  globalShortcut.register('Command+Q', () => {
    console.log('🎯 Cmd+Q detected via global shortcut');
    app.quit();
  });

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
      if (ext === '.hdr') contentType = 'application/octet-stream';
      if (ext === '.cab') contentType = 'application/octet-stream';
      if (ext === '.cdr') contentType = 'audio/x-cdr'; // CD audio track
      if (ext === '.exe') contentType = 'application/x-msdownload';
      if (ext === '.inf') contentType = 'text/plain';
      if (ext === '.ini') contentType = 'text/plain';
      if (ext === '.txt') contentType = 'text/plain';

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
