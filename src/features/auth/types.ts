export type AuthUser = {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  gender: 'MALE' | 'FEMALE' | null;
  dateOfBirth: string | null;
  status: string;
  isOnline: boolean;
  lastSeenAt: string | null;
  createdAt: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
};

export type AuthSession = {
  tokens: AuthTokens;
  user: AuthUser;
};
