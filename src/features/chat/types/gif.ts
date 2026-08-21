import { z } from 'zod';

export const giphyItemSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  previewUrl: z.string().url(),
  previewWidth: z.number().int().positive(),
  previewHeight: z.number().int().positive(),
});

export const giphyPageSchema = z.object({
  items: z.array(giphyItemSchema),
  nextOffset: z.number().int().nonnegative().nullable(),
});

export type GiphyItem = z.infer<typeof giphyItemSchema>;
export type GiphyPage = z.infer<typeof giphyPageSchema>;
