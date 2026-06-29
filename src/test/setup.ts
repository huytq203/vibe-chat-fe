import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Env tối thiểu để các module đọc src/config/env.ts không throw khi test import.
const TEST_ENV: Record<string, string> = {
  NEXT_PUBLIC_AUTH_URL: 'http://localhost:3006',
  NEXT_PUBLIC_VIBE_URL: 'http://localhost:3005',
  NEXT_PUBLIC_WS_URL: 'http://localhost:3005/chat',
  NEXT_PUBLIC_CALL_WS_URL: 'http://localhost:3005/call',
  NEXT_PUBLIC_TASK_URL: 'http://localhost:3007',
  NEXT_PUBLIC_TASK_WS_URL: 'http://localhost:3007/tasks',
};
for (const [key, value] of Object.entries(TEST_ENV)) {
  if (!process.env[key]) vi.stubEnv(key, value);
}

afterEach(() => {
  cleanup();
});
