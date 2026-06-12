export const siteConfig = {
  name: 'halo-chat',
  description: 'Halo messaging application',
  url: 'http://localhost:3000',
} as const;

export type SiteConfig = typeof siteConfig;
