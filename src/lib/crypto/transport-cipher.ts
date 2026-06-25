const IV_LEN = 12;
const TAG_LEN = 16;

function toB64(bytes: Uint8Array): string {
  const CHUNK = 8192;
  let bin = '';
  for (let i = 0; i < bytes.length; i += CHUNK)
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

// Web Crypto AES-GCM encrypt output = ciphertext ‖ authTag[16]
export async function encryptBlob(data: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const enc = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: TAG_LEN * 8 },
    key,
    new TextEncoder().encode(data),
  );
  const out = new Uint8Array(IV_LEN + enc.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(enc), IV_LEN);
  return toB64(out);
}

export async function decryptBlob(blob: string, key: CryptoKey): Promise<string> {
  const bytes = fromB64(blob);
  const iv = bytes.slice(0, IV_LEN);
  const ctWithTag = bytes.slice(IV_LEN); // Web Crypto expects ct + tag together
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: TAG_LEN * 8 },
    key,
    ctWithTag,
  );
  return new TextDecoder().decode(plain);
}
