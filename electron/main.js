'use strict';

const { app, BrowserWindow, shell, Menu, ipcMain, Notification, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');

const PORT = 4784;
const APP_ID = 'com.halochat.desktop';
const ICON_PATH = path.join(__dirname, 'resources/icons/512x512.png');
let mainWindow = null;
let serverProcess = null;

/**
 * IPC thông báo + badge taskbar (xem src/lib/electron). Đăng ký 1 lần khi app ready.
 * - Badge: macOS/Linux dùng app.setBadgeCount (số); Windows dùng overlay icon từ data URL.
 * - Notification: bắn native, click → focus lại cửa sổ.
 */
function registerIpc() {
  ipcMain.on('badge:set', (_e, payload) => {
    const count = Number(payload?.count) || 0;
    if (process.platform === 'win32') {
      if (!mainWindow) return;
      const img =
        count > 0 && payload?.iconDataUrl
          ? nativeImage.createFromDataURL(payload.iconDataUrl)
          : null;
      mainWindow.setOverlayIcon(img, count > 0 ? `${count} thông báo chưa đọc` : '');
    } else {
      app.setBadgeCount(count);
    }
  });

  ipcMain.on('notify:show', (_e, payload) => {
    if (!Notification.isSupported() || !payload?.title) return;
    const notif = new Notification({
      title: String(payload.title),
      body: payload.body ? String(payload.body) : undefined,
      icon: ICON_PATH,
    });
    notif.on('click', () => {
      if (!mainWindow) return;
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    });
    notif.show();
  });
}

/**
 * Standalone dir path works in both dev (project root) and production (resources/app/).
 * With asar:false, app.getAppPath() returns the unpacked app directory.
 */
function getStandaloneDir() {
  return path.join(app.getAppPath(), '.next', 'standalone');
}

function waitForPort(port, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const attempt = () => {
      const socket = net.connect({ port, host: '127.0.0.1' });
      socket.on('connect', () => { socket.destroy(); resolve(); });
      socket.on('error', () => {
        socket.destroy();
        if (Date.now() - start >= timeout) {
          reject(new Error(`Next.js server did not start on port ${port} within ${timeout}ms`));
        } else {
          setTimeout(attempt, 300);
        }
      });
    };
    attempt();
  });
}

function startServer() {
  const standaloneDir = getStandaloneDir();
  const serverScript = path.join(standaloneDir, 'server.js');

  if (!fs.existsSync(serverScript)) {
    return Promise.reject(
      new Error(`server.js not found at ${serverScript} — run "npm run electron:build" first`)
    );
  }

  // Use ELECTRON_RUN_AS_NODE=1 to run the Next.js server via Electron's bundled Node.js.
  // No need to rely on a system-level `node` binary in the packaged app.
  serverProcess = spawn(process.execPath, [serverScript], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: String(PORT),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
    },
    stdio: 'pipe',
  });

  serverProcess.stderr?.on('data', (d) => process.stderr.write(`[next] ${d}`));
  serverProcess.on('error', (err) => console.error('[next] spawn error:', err.message));
  serverProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) console.error('[next] exited with code', code);
  });

  return waitForPort(PORT);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    // Icon cửa sổ/taskbar trên Linux (Windows lấy từ exe, macOS từ bundle).
    icon: path.join(__dirname, 'resources/icons/512x512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Allows cross-origin requests to remote backends (NEXT_PUBLIC_USE_PROXY=false)
      webSecurity: false,
    },
    show: false,
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  // External links open in OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    shell.openExternal(targetUrl);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  // Remove the default application menu (File, Edit, View, ...)
  Menu.setApplicationMenu(null);
  // Cần cho Windows hiện đúng tên/icon thông báo + nhóm taskbar.
  if (process.platform === 'win32') app.setAppUserModelId(APP_ID);
  registerIpc();

  startServer()
    .then(createWindow)
    .catch((err) => {
      console.error('Startup failed:', err.message);
      app.quit();
    });
});

app.on('window-all-closed', () => {
  if (serverProcess) { serverProcess.kill(); serverProcess = null; }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

app.on('will-quit', () => {
  if (serverProcess) { serverProcess.kill(); serverProcess = null; }
});
