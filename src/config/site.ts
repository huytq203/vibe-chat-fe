export const siteConfig = {
  name: 'vibe-chat',
  description: 'Vibe chat application',
  url: 'http://localhost:3000',
} as const;

export type SiteConfig = typeof siteConfig;
