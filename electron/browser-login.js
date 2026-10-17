'use strict';

const crypto = require('crypto');

const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

/** PKCE (RFC 7636) + state chống CSRF. Verifier không bao giờ rời main process trước bước đổi mã. */
function createPkcePair() {
  const verifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const state = crypto.randomBytes(24).toString('base64url');
  return { verifier, challenge, state };
}

function buildLoginUrl(webUrl, pkce) {
  const url = new URL('/login', webUrl);
  url.searchParams.set('client', 'desktop');
  url.searchParams.set('state', pkce.state);
  url.searchParams.set('code_challenge', pkce.challenge);
  return url.toString();
}

function parseCallback(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'halo:' || url.host !== 'auth' || url.pathname !== '/callback') return null;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  return code && state ? { code, state } : null;
}

/** Windows/Linux: deep link đến dưới dạng 1 phần tử argv của instance thứ hai. */
function findDeepLink(argv) {
  return argv.find((arg) => typeof arg === 'string' && arg.startsWith('halo://')) ?? null;
}

/** Giữ tối đa 1 phiên đăng nhập trình duyệt đang chờ; phiên mới thay phiên cũ. */
function createBrowserLoginCoordinator({ openExternal, webUrl, timeoutMs = LOGIN_TIMEOUT_MS }) {
  let pending = null;

  function settle() {
    const current = pending;
    if (current) clearTimeout(current.timer);
    pending = null;
    return current;
  }

  function start() {
    const previous = settle();
    if (previous) previous.reject(new Error('superseded'));
    const pkce = createPkcePair();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending = null;
        reject(new Error('timeout'));
      }, timeoutMs);
      pending = { pkce, resolve, reject, timer };
      Promise.resolve(openExternal(buildLoginUrl(webUrl, pkce))).catch((err) => {
        settle();
        reject(err);
      });
    });
  }

  function handleCallback(rawUrl) {
    const callback = parseCallback(rawUrl);
    if (!callback || !pending || callback.state !== pending.pkce.state) return false;
    const current = settle();
    current.resolve({ code: callback.code, codeVerifier: current.pkce.verifier });
    return true;
  }

  function cancel() {
    const current = settle();
    if (current) current.reject(new Error('cancelled'));
  }

  return { start, handleCallback, cancel };
}

module.exports = { createPkcePair, buildLoginUrl, parseCallback, findDeepLink, createBrowserLoginCoordinator };
