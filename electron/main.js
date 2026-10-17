'use strict';

const { app, BrowserWindow, shell, Menu, ipcMain, Notification, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');
const { isAppUrl, isSafeExternalUrl } = require('./url-guard');
const { createBrowserLoginCoordinator, findDeepLink } = require('./browser-login');

const PORT = 4784;
const APP_ORIGIN = `http://127.0.0.1:${PORT}`;
const APP_ID = 'com.halochat.desktop';
const ICON_PATH = path.join(__dirname, 'resources/icons/512x512.png');
let mainWindow = null;

// Trang /login của bản web dùng cho luồng đăng nhập qua trình duyệt hệ thống.
const WEB_URL = process.env.HALO_WEB_URL || 'https://chat.krux.io.vn';
const DEEP_LINK_PROTOCOL = 'halo';

const browserLogin = createBrowserLoginCoordinator({
  openExternal: (url) => shell.openExternal(url),
  webUrl: WEB_URL,
});

// Deep link mở instance thứ hai → chuyển URL cho instance đang chạy rồi thoát.
const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();

function focusMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function registerDeepLinkProtocol() {
  // Chạy dev (`electron .`) phải truyền đường dẫn script để OS gọi đúng app.
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(DEEP_LINK_PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  } else {
    app.setAsDefaultProtocolClient(DEEP_LINK_PROTOCOL);
  }
}

app.on('second-instance', (_event, argv) => {
  const link = findDeepLink(argv);
  if (link && !browserLogin.handleCallback(link)) {
    console.warn('[electron] bỏ qua deep link không khớp phiên đăng nhập đang chờ');
  }
  focusMainWindow();
});

// macOS gửi deep link qua open-url thay vì argv.
app.on('open-url', (event, url) => {
  event.preventDefault();
  browserLogin.handleCallback(url);
  focusMainWindow();
});
let serverProcess = null;

/**
 * IPC thông báo + badge taskbar (xem src/lib/electron). Đăng ký 1 lần khi app ready.
 * - Badge: macOS/Linux dùng app.setBadgeCount (số); Windows dùng overlay icon từ data URL.
 * - Notification: bắn native, click → focus lại cửa sổ.
 */
function registerIpc() {
  // Đăng nhập qua trình duyệt hệ thống: main giữ PKCE verifier/state, trả { code, codeVerifier }.
  ipcMain.handle('auth:start-browser-login', () => browserLogin.start());
  ipcMain.handle('auth:cancel-browser-login', () => browserLogin.cancel());

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
    notif.on('click', focusMainWindow);
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
    // Giữ application menu để các edit role native có accelerator, nhưng ẩn
    // thanh menu trên Windows/Linux để giao diện desktop không đổi.
    autoHideMenuBar: process.platform !== 'darwin',
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

  mainWindow.loadURL(APP_ORIGIN);
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  // External links open in OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    openExternalSafely(targetUrl);
    return { action: 'deny' };
  });

  // Renderer bị điều hướng ra origin khác vẫn giữ preload `electronAPI` → chặn, mở ngoài.
  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (isAppUrl(targetUrl, APP_ORIGIN)) return;
    event.preventDefault();
    openExternalSafely(targetUrl);
  });
}

function openExternalSafely(targetUrl) {
  if (!isSafeExternalUrl(targetUrl)) {
    console.warn('[electron] chặn mở URL ngoài với scheme không cho phép');
    return;
  }
  void shell.openExternal(targetUrl);
}

app.whenReady().then(() => {
  if (!hasSingleInstanceLock) return;
  registerDeepLinkProtocol();
  // Electron cần các role native này để Ctrl/Cmd+Z/A/C/X/V hoạt động ổn định
  // trong input/textarea. Dùng role thay vì tự gửi webContents command để giữ
  // đúng accelerator theo từng hệ điều hành.
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    { role: 'editMenu' },
  ]));
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
