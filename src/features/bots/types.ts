import type { BotTokenScope } from './schemas';

export interface Bot {
  id: string;
  username: string;
  displayName: string;
  description?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  provisioned: boolean;
  botKeycloakId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BotListPage {
  items: Bot[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Trả về đúng 1 lần khi tạo/issue/rotate — plaintext KHÔNG lưu lại được. */
export interface BotTokenIssued {
  id: string;
  token: string;
  prefix: string;
  scopes: BotTokenScope[];
  expiresAt?: string;
  createdAt: string;
}

export interface BotCreated {
  bot: Bot;
  token: BotTokenIssued;
}

/** Metadata token — KHÔNG chứa plaintext/hash. */
export interface BotTokenListItem {
  id: string;
  prefix: string;
  scopes: BotTokenScope[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}
