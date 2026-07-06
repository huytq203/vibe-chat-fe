import { env } from '@/config/env';

let _sessionKey: CryptoKey | null = null;
// Handshake /session/key đang chạy — dedupe để nhiều request song song (vd hàng loạt
// query bắn ngay sau login) chỉ lập key đúng 1 lần, tránh double-establish ghi đè key.
let _establishing: Promise<void> | null = null;

export function getSessionKey(): CryptoKey | null {
  return _sessionKey;
}

export function clearSessionKey(): void {
  _sessionKey = null;
  _establishing = null;
}

function toB64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function deriveSessionKey(
  clientPrivKey: CryptoKey,
  serverEphPubKeyB64: string,
): Promise<CryptoKey> {
  const serverPubRaw = fromB64(serverEphPubKeyB64);
  const serverPubKey = await crypto.subtle.importKey(
    'raw',
    serverPubRaw.buffer as ArrayBuffer,
    { name: 'X25519' },
    false,
    [],
  );

  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'X25519', public: serverPubKey },
    clientPrivKey,
    256,
  );

  const hkdfKey = await crypto.subtle.importKey(
    'raw',
    sharedBits,
    { name: 'HKDF' },
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(32),
      info: new TextEncoder().encode('vibe-api-session-v1'),
    },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function establishSessionKey(
  _userId: string,
  accessToken: string,
): Promise<void> {
  const keyPair = (await crypto.subtle.generateKey(
    { name: 'X25519' },
    true,
    ['deriveBits'],
  )) as CryptoKeyPair;

  const pubRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const clientEphPubKey = toB64(new Uint8Array(pubRaw));

  const base = env.NEXT_PUBLIC_USE_PROXY ? '' : env.NEXT_PUBLIC_VIBE_URL;
  const res = await fetch(`${base}/api/v1/session/key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: 'include',
    body: JSON.stringify({ clientEphPubKey }),
  });

  if (!res.ok) throw new Error(`session/key failed: ${res.status}`);

  const json = (await res.json()) as { error_code: number; data: { serverEphPubKey: string } };
  if (json.error_code !== 0) throw new Error('session/key error');

  _sessionKey = await deriveSessionKey(keyPair.privateKey, json.data.serverEphPubKey);
}

/**
 * Đảm bảo đã có session key trước khi gửi request authed non-public. Chưa có key →
 * BE trả 401 SESSION_KEY_MISSING (mọi API hỏng). Dedupe qua `_establishing`: nhiều
 * lời gọi song song chỉ thực hiện 1 handshake, cùng chờ 1 promise.
 */
export async function ensureSessionKey(accessToken: string): Promise<void> {
  if (_sessionKey) return;
  if (!_establishing) {
    _establishing = establishSessionKey('', accessToken).finally(() => {
      _establishing = null;
    });
  }
  await _establishing;
}
