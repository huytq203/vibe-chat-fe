'use strict';

// Chỉ những scheme này được giao cho OS mở. Các scheme khác (file:, smb:, ms-*:, …)
// có thể mở file cục bộ hoặc chạy handler của OS nếu một iframe embed gọi window.open.
const EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isSafeExternalUrl(value) {
  const url = parseUrl(value);
  return url !== null && EXTERNAL_PROTOCOLS.has(url.protocol);
}

function isAppUrl(value, appOrigin) {
  const url = parseUrl(value);
  return url !== null && url.origin === appOrigin;
}

module.exports = { isSafeExternalUrl, isAppUrl };
