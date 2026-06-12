#!/bin/bash
# Refresh icon cache so the app icon shows immediately after install

if hash gtk-update-icon-cache 2>/dev/null; then
    gtk-update-icon-cache -f -t /usr/share/icons/hicolor/ || true
fi

if hash update-desktop-database 2>/dev/null; then
    update-desktop-database /usr/share/applications || true
fi
