import { z } from 'zod';

const schema = z.object({ GIPHY_API_KEY: z.string().min(1) });

export type GiphyEnv = z.infer<typeof schema>;

export const GIPHY_API_BASE = 'https://api.giphy.com/v1/gifs';

/** Đọc lazy để build không vỡ khi môi trường chưa cấu hình Giphy. */
export function readGiphyEnv(): GiphyEnv | null {
  const parsed = schema.safeParse({ GIPHY_API_KEY: process.env.GIPHY_API_KEY });
  return parsed.success ? parsed.data : null;
}
