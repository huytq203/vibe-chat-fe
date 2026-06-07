import { z } from 'zod';

export const callTypeSchema = z.enum(['AUDIO', 'VIDEO']);

export const callTokenAckSchema = z.object({
  ok: z.literal(true),
  callId: z.string(),
  conversationId: z.string(),
  type: callTypeSchema,
  status: z.string(),
  livekitUrl: z.string().url(),
  livekitToken: z.string(),
  room: z.string(),
  participants: z
    .array(
      z.object({
        userId: z.string(),
        state: z.string(),
        joinedAt: z.string().nullable(),
        leftAt: z.string().nullable(),
      }),
    )
    .default([]),
});

export const incomingSchema = z.object({
  callId: z.string(),
  conversationId: z.string(),
  initiatorId: z.string(),
  type: callTypeSchema,
  room: z.string(),
});

export const endedSchema = z.object({
  callId: z.string(),
  reason: z.enum([
    'COMPLETED',
    'MISSED',
    'DECLINED',
    'CANCELLED',
    'TIMEOUT',
    'BUSY',
    'FAILED',
  ]),
  durationSec: z.number(),
});
