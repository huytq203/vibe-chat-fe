import { apiClient } from '@/lib/api/client';

export type AiProvider = 'gemini' | 'openai' | 'anthropic';

export type AiMessage = { role: 'user' | 'assistant'; content: string };

export type SendAiMessagePayload = {
  provider: AiProvider;
  model: string;
  messages: AiMessage[];
  apiKey?: string;
  systemPrompt?: string;
};

export type AiMessageResponse = {
  content: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
};

export async function sendAiMessage(payload: SendAiMessagePayload): Promise<AiMessageResponse> {
  return apiClient.post<AiMessageResponse>('/ai-chat/message', { body: payload });
}
