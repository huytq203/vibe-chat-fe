'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  // Cập nhật badge taskbar/dock. { count, iconDataUrl } — iconDataUrl chỉ dùng cho overlay Windows.
  setBadge: (payload) => ipcRenderer.send('badge:set', payload),
  // Hiện thông báo hệ điều hành (native).
  showNotification: (payload) => ipcRenderer.send('notify:show', payload),
  // Đăng nhập qua trình duyệt hệ thống (PKCE ở main process). Trả { code, codeVerifier }.
  startBrowserLogin: () => ipcRenderer.invoke('auth:start-browser-login'),
  cancelBrowserLogin: () => ipcRenderer.invoke('auth:cancel-browser-login'),
});
