import { z } from 'zod';

/**
 * Validate biến môi trường tại boot time.
 * Server-only vars KHÔNG được prefix NEXT_PUBLIC_.
 * Client vars BẮT BUỘC prefix NEXT_PUBLIC_.
 */
const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // DATABASE_URL: z.string().url(), // bật khi có Prisma
  // NEXTAUTH_SECRET: z.string().min(32), // bật khi có NextAuth
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

const processEnv = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
} as const;

const parsedServer = serverSchema.safeParse(processEnv);
const parsedClient = clientSchema.safeParse(processEnv);

if (!parsedServer.success) {
  console.error('❌ Invalid server env:', parsedServer.error.flatten().fieldErrors);
  throw new Error('Invalid server environment variables');
}
if (!parsedClient.success) {
  console.error('❌ Invalid client env:', parsedClient.error.flatten().fieldErrors);
  throw new Error('Invalid client environment variables');
}

export const env = {
  ...parsedServer.data,
  ...parsedClient.data,
} as const;

export type Env = typeof env;
