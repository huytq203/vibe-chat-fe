#!/bin/bash
# afterInstall custom ĐÈ script mặc định của electron-builder, nên phải tự làm
# lại việc của script mặc định: set SUID cho chrome-sandbox — thiếu nó Electron
# từ chối khởi động ("SUID sandbox helper ... is not configured correctly").
if [ -f '/opt/Halo/chrome-sandbox' ]; then
    chown root:root '/opt/Halo/chrome-sandbox' || true
    chmod 4755 '/opt/Halo/chrome-sandbox' || true
fi

# Refresh icon cache so the app icon shows immediately after install

if hash gtk-update-icon-cache 2>/dev/null; then
    gtk-update-icon-cache -f -t /usr/share/icons/hicolor/ || true
fi

if hash update-desktop-database 2>/dev/null; then
    update-desktop-database /usr/share/applications || true
fi
