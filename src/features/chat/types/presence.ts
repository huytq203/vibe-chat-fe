export type Presence = {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string | null;
  lastSeenLabel: string | null;
};
