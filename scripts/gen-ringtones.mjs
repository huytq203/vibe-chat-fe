/**
 * Sinh 2 file chuông WAV (PCM 16-bit mono 44.1kHz) cho tính năng call:
 *  - public/sounds/call-incoming.wav : chuông gọi đến (motif chuông nhẹ, loop 4s)
 *  - public/sounds/call-outgoing.wav : ringback gọi đi (2-tone êm, 1s on / 3s off)
 * Chạy 1 lần: `node scripts/gen-ringtones.mjs`. File sinh ra được commit vào repo.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44_100;
const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../public/sounds');

/** Ghi buffer mẫu Float [-1,1] thành file WAV PCM 16-bit mono. */
function writeWav(path, samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE((s < 0 ? s * 0x8000 : s * 0x7fff) | 0, i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([header, data]));
}

/** Nốt chuông (bell): fundamental + harmonic 2, envelope tắt dần mềm. */
function bell(buf, startSec, durSec, freq, gain) {
  const start = Math.floor(startSec * SR);
  const len = Math.floor(durSec * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.exp(-3.2 * t) * (1 - Math.exp(-120 * t)); // attack mềm + decay
    const v =
      Math.sin(2 * Math.PI * freq * t) + 0.35 * Math.sin(2 * Math.PI * freq * 2 * t);
    const idx = start + i;
    if (idx < buf.length) buf[idx] += env * gain * v;
  }
}

/** Tone liên tục (ringback) có fade in/out để không bị "cộp". */
function tone(buf, startSec, durSec, freqs, gain) {
  const start = Math.floor(startSec * SR);
  const len = Math.floor(durSec * SR);
  const fade = Math.floor(0.02 * SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let env = gain;
    if (i < fade) env *= i / fade;
    if (i > len - fade) env *= (len - i) / fade;
    let v = 0;
    for (const f of freqs) v += Math.sin(2 * Math.PI * f * t);
    v /= freqs.length;
    const idx = start + i;
    if (idx < buf.length) buf[idx] += env * v;
  }
}

// --- Incoming: motif C5-E5-G5-E5 ngân, lặp 2 lần trong 4s ---
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
function genIncoming() {
  const buf = new Float32Array(SR * 4);
  const motif = [C5, E5, G5, E5];
  for (let phrase = 0; phrase < 2; phrase++) {
    const base = phrase * 2.0;
    motif.forEach((f, n) => bell(buf, base + n * 0.28, 1.1, f, 0.5));
  }
  return buf;
}

// --- Outgoing: ringback 2-tone 440+480Hz, 1s on / 3s off (loop 4s) ---
function genOutgoing() {
  const buf = new Float32Array(SR * 4);
  tone(buf, 0, 1.0, [440, 480], 0.28);
  return buf;
}

mkdirSync(OUT_DIR, { recursive: true });
writeWav(resolve(OUT_DIR, 'call-incoming.wav'), genIncoming());
writeWav(resolve(OUT_DIR, 'call-outgoing.wav'), genOutgoing());
console.log('Đã sinh chuông vào', OUT_DIR);
