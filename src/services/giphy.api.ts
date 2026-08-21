import { z } from 'zod';
import { giphyPageSchema, type GiphyPage } from '@/features/chat/types/gif';

export class GiphyError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'GiphyError';
    this.code = code;
  }
}

const errorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

async function throwFromResponse(response: Response): Promise<never> {
  const raw: unknown = await response.json().catch(() => null);
  const parsed = errorSchema.safeParse(raw);
  throw new GiphyError(
    parsed.success ? parsed.data.error.code : 'GIPHY_UNKNOWN',
    parsed.success ? parsed.data.error.message : 'Không tải được GIF.',
  );
}

export const giphyApi = {
  list: async ({ q, offset }: { q: string; offset: number }): Promise<GiphyPage> => {
    const params = new URLSearchParams({ offset: String(offset) });
    if (q) {
      params.set('kind', 'search');
      params.set('q', q);
    } else {
      params.set('kind', 'trending');
    }

    const response = await fetch(`/api/giphy?${params.toString()}`);
    if (!response.ok) await throwFromResponse(response);
    return giphyPageSchema.parse(await response.json());
  },

  fetchAsset: async (id: string): Promise<Blob> => {
    const response = await fetch(`/api/giphy/asset?id=${encodeURIComponent(id)}`);
    if (!response.ok) await throwFromResponse(response);
    return response.blob();
  },
} as const;
