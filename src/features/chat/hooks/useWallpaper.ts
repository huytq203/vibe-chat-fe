'use client';

import { useQuery } from '@tanstack/react-query';
import { mediaApi } from '@/services/media.api';
import { mediaKeys, chatKeys } from '@/services/keys';
import { chatApi } from '@/services/chat.api';
import { getTheme, DEFAULT_BUBBLE_CONFIG, type BubbleConfig } from '@/features/chat/config/chat-themes';
import { useAuthStore } from '@/features/auth';
import type { CSSProperties } from 'react';

export type WallpaperStyle = {
  backgroundImage?: string;
  backgroundColor?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
};

export function parseBackground(background: string | null | undefined): {
  type: 'none' | 'theme' | 'custom';
  themeKey: string | null;
  mediaId: string | null;
} {
  if (!background) return { type: 'none', themeKey: null, mediaId: null };
  if (background.startsWith('theme:'))
    return { type: 'theme', themeKey: background.slice(6), mediaId: null };
  if (background.startsWith('custom:'))
    return { type: 'custom', themeKey: null, mediaId: background.slice(7) };
  return { type: 'none', themeKey: null, mediaId: null };
}

function wallpaperFromBackground(background: string | null | undefined, mediaUrl?: string): WallpaperStyle {
  const { type, themeKey, mediaId } = parseBackground(background);

  if (type === 'theme' && themeKey) {
    const theme = getTheme(themeKey);
    if (!theme.wallpaper) return {};
    if (theme.wallpaper.startsWith('url('))
      return { backgroundImage: theme.wallpaper, backgroundSize: 'cover', backgroundPosition: 'center' };
    const isGradient =
      theme.wallpaper.startsWith('linear-gradient') || theme.wallpaper.startsWith('radial-gradient');
    if (isGradient) return { backgroundImage: theme.wallpaper };
    return { backgroundColor: theme.wallpaper };
  }

  if (type === 'custom' && mediaId && mediaUrl) {
    return { backgroundImage: `url(${mediaUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  }

  return {};
}

export function useWallpaper(conversationId: string | null): WallpaperStyle {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);

  // Subscribe reactive vào conversation để nhận update realtime từ socket
  const { data: conv } = useQuery({
    queryKey: conversationId ? chatKeys.conversationDetail(conversationId) : ['chat', 'conversation', 'null'],
    queryFn: () => chatApi.getConversation(conversationId as string),
    enabled: Boolean(conversationId) && isAuthed,
    staleTime: 30_000,
  });

  const { type, mediaId } = parseBackground(conv?.background);

  const { data: mediaData } = useQuery({
    queryKey: mediaKeys.detail(mediaId ?? ''),
    queryFn: () => mediaApi.get(mediaId!),
    enabled: type === 'custom' && Boolean(mediaId),
    staleTime: 5 * 60 * 1000,
  });

  return wallpaperFromBackground(conv?.background, mediaData?.downloadUrl ?? undefined);
}

export function useWallpaperActive(conversationId: string | null): boolean {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const { data: conv } = useQuery({
    queryKey: conversationId ? chatKeys.conversationDetail(conversationId) : ['chat', 'conversation', 'null'],
    queryFn: () => chatApi.getConversation(conversationId as string),
    enabled: Boolean(conversationId) && isAuthed,
    staleTime: 30_000,
  });
  return Boolean(conv?.background);
}

export function useBubbleConfig(conversationId: string): BubbleConfig {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const { data: conv } = useQuery({
    queryKey: chatKeys.conversationDetail(conversationId),
    queryFn: () => chatApi.getConversation(conversationId),
    enabled: isAuthed,
    staleTime: 30_000,
  });
  const { type, themeKey } = parseBackground(conv?.background);
  if (type === 'theme' && themeKey) return getTheme(themeKey).bubbleConfig;
  return DEFAULT_BUBBLE_CONFIG;
}

export function getBubblePreviewStyle(themeKey: string | null): {
  myStyle: CSSProperties;
  otherStyle: CSSProperties;
} {
  if (!themeKey || themeKey === 'default') {
    return {
      myStyle: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' },
      otherStyle: { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' },
    };
  }
  const theme = getTheme(themeKey);
  return { myStyle: theme.bubbleConfig.myStyle, otherStyle: theme.bubbleConfig.otherStyle };
}
