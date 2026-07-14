import { describe, it, expect } from 'vitest';
import { createBotSchema, issueTokenSchema } from './schemas';

describe('createBotSchema', () => {
  it('nên pass với username hợp lệ chứa "bot"', () => {
    const result = createBotSchema.safeParse({
      username: 'weather_bot',
      displayName: 'Weather Bot',
    });
    expect(result.success).toBe(true);
  });

  it('nên reject username không chứa "bot"', () => {
    const result = createBotSchema.safeParse({
      username: 'weather_service',
      displayName: 'Weather',
    });
    expect(result.success).toBe(false);
  });

  it('nên reject username bắt đầu bằng số', () => {
    const result = createBotSchema.safeParse({
      username: '1weather_bot',
      displayName: 'Weather Bot',
    });
    expect(result.success).toBe(false);
  });

  it('nên reject displayName rỗng', () => {
    const result = createBotSchema.safeParse({
      username: 'weather_bot',
      displayName: '',
    });
    expect(result.success).toBe(false);
  });

  it('nên cho description optional', () => {
    const result = createBotSchema.safeParse({
      username: 'weather_bot',
      displayName: 'Weather Bot',
    });
    expect(result.success).toBe(true);
  });
});

describe('issueTokenSchema', () => {
  it('nên pass khi không truyền scopes/expiresAt', () => {
    expect(issueTokenSchema.safeParse({}).success).toBe(true);
  });

  it('nên pass với scope broadcast:send', () => {
    const result = issueTokenSchema.safeParse({ scopes: ['broadcast:send'] });
    expect(result.success).toBe(true);
  });

  it('nên pass với scope chat:admin', () => {
    const result = issueTokenSchema.safeParse({ scopes: ['chat:admin'] });
    expect(result.success).toBe(true);
  });

  it('nên reject scope không hợp lệ', () => {
    const result = issueTokenSchema.safeParse({ scopes: ['not:a:scope'] });
    expect(result.success).toBe(false);
  });
});
