import type { MessageType } from './message';

export type InlineBotSummary = {
  keycloakId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  inlinePlaceholder: string | null;
};

export type InlineBotSearchResponse = {
  items: InlineBotSummary[];
};

export type InlineResultType =
  | 'article'
  | 'photo'
  | 'video'
  | 'audio'
  | 'voice'
  | 'document'
  | 'sticker'
  | 'location'
  | 'contact';

export type InlineResult = {
  type: InlineResultType;
  id: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  messageText?: string;
  mediaId?: string;
  url?: string;
  caption?: string;
  latitude?: number;
  longitude?: number;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
};

export type InlineResultsPayload = {
  queryId: string;
  chatUuid: string;
  results: InlineResult[];
  nextOffset?: string;
  button?: { text: string; startParameter?: string };
};

export type InlineSelectionSend = {
  viaBotId: string;
  inlineQueryId: string;
  inlineResultId: string;
  inlineQuery?: string;
  plaintext?: string;
  type?: MessageType;
  attachmentIds?: string[];
  metadata?: Record<string, unknown>;
};
