import { z } from 'zod';

/**
 * Validate biến môi trường public (client + server đều đọc được).
 * Server-only vars (AUTH_URL, VIBE_URL) được đọc trực tiếp trong next.config.ts —
 * không cần expose qua module này để tránh import server-env vào client bundle.
 */
const schema = z.object({
  NEXT_PUBLIC_AUTH_URL: z.string().url(),
  NEXT_PUBLIC_VIBE_URL: z.string().url(),
  NEXT_PUBLIC_WS_URL: z.string().url(),
  NEXT_PUBLIC_CALL_WS_URL: z.string().url(),
  // true → client gọi same-origin (Next rewrites proxy). false → gọi thẳng BE.
  NEXT_PUBLIC_USE_PROXY: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),

  // Firebase Cloud Messaging (public — SDK chạy ở browser cần các giá trị này).
  // Server-side admin (PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY_BASE64) thuộc BE, không expose FE.
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_SENDER_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_FIREBASE_VAPID_KEY: z.string().min(1).optional(),
});

const parsed = schema.safeParse({
  NEXT_PUBLIC_AUTH_URL: process.env.NEXT_PUBLIC_AUTH_URL,
  NEXT_PUBLIC_VIBE_URL: process.env.NEXT_PUBLIC_VIBE_URL,
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  NEXT_PUBLIC_CALL_WS_URL: process.env.NEXT_PUBLIC_CALL_WS_URL,
  NEXT_PUBLIC_USE_PROXY: process.env.NEXT_PUBLIC_USE_PROXY,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_VAPID_KEY: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
});

if (!parsed.success) {
  console.error('❌ Invalid env:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
export type Env = typeof env;

export function isFirebaseConfigured(): boolean {
  return Boolean(
    env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      env.NEXT_PUBLIC_FIREBASE_APP_ID &&
      env.NEXT_PUBLIC_FIREBASE_SENDER_ID &&
      env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  );
}
