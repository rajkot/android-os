const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { startDesktopServer } = require('./server.cjs');

let mainWindow = null;
let runningServer = null;

// Only allow a single instance of the application
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function getAppIcon() {
  const iconPaths = [
    path.join(__dirname, '../public/assets/dex/app_png.png'),
    path.join(__dirname, 'public/assets/dex/app_png.png'),
    path.join(process.resourcesPath || '', 'public/assets/dex/app_png.png'),
    path.join(process.resourcesPath || '', 'app/public/assets/dex/app_png.png'),
  ];
  for (const p of iconPaths) {
    if (require('fs').existsSync(p)) return p;
  }
  return undefined;
}

async function createWindow() {
  // Start embedded local server on free port
  const { server, port } = await startDesktopServer(3000);
  runningServer = server;

  const iconPath = getAppIcon();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'Android OS',
    icon: iconPath,
    autoHideMenuBar: true,
    backgroundColor: '#030712',
    show: false, // Show when ready to prevent white flash
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Handle external navigation (open in real user browser)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  await mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (runningServer) {
    try {
      runningServer.close();
    } catch {}
  }
});
