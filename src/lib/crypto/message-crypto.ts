// AES-256-GCM khớp EnvelopeCryptoService (BE): IV 12B, tag 16B.
// Web Crypto nối tag vào CUỐI ciphertext → tách 16B cuối thành authTag để khớp BE.

const IV_LEN = 12;
const TAG_LEN = 16; // bytes

export type CipherPayload = { ciphertext: string; iv: string; authTag: string };

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Chuyển Uint8Array sang ArrayBuffer thuần (không phải SharedArrayBuffer). */
function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

export async function importDek(base64Key: string): Promise<CryptoKey> {
  const raw = fromB64(base64Key);
  return crypto.subtle.importKey('raw', toArrayBuffer(raw), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptString(plaintext: string, key: CryptoKey): Promise<CipherPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const buf = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: TAG_LEN * 8 }, key, enc.encode(plaintext)),
  );
  const ciphertext = buf.slice(0, buf.length - TAG_LEN);
  const authTag = buf.slice(buf.length - TAG_LEN);
  return { ciphertext: toB64(ciphertext), iv: toB64(iv), authTag: toB64(authTag) };
}

export async function decryptToString(payload: CipherPayload, key: CryptoKey): Promise<string> {
  const iv = fromB64(payload.iv);
  const ct = fromB64(payload.ciphertext);
  const tag = fromB64(payload.authTag);
  // Ghép lại: ciphertext + authTag (Web Crypto expect combined buffer)
  const combined = new Uint8Array(ct.length + tag.length);
  combined.set(ct, 0);
  combined.set(tag, ct.length);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv), tagLength: TAG_LEN * 8 },
    key,
    toArrayBuffer(combined),
  );
  return dec.decode(plain);
}

export async function encryptJson(obj: unknown, key: CryptoKey): Promise<CipherPayload> {
  return encryptString(JSON.stringify(obj), key);
}

export async function decryptJson<T>(payload: CipherPayload, key: CryptoKey): Promise<T> {
  return JSON.parse(await decryptToString(payload, key)) as T;
}
