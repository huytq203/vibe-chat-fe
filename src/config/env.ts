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
  // true → client gọi same-origin (Next rewrites proxy). false → gọi thẳng BE.
  NEXT_PUBLIC_USE_PROXY: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

const parsed = schema.safeParse({
  NEXT_PUBLIC_AUTH_URL: process.env.NEXT_PUBLIC_AUTH_URL,
  NEXT_PUBLIC_VIBE_URL: process.env.NEXT_PUBLIC_VIBE_URL,
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  NEXT_PUBLIC_USE_PROXY: process.env.NEXT_PUBLIC_USE_PROXY,
});

if (!parsed.success) {
  console.error('❌ Invalid env:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
export type Env = typeof env;
