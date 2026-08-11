import { describe, expect, it } from 'vitest';
import { normalizeDisplayName, normalizeTaskDisplayNames } from './normalize-display-name';

function corruptUtf8(value: string): string {
  return Buffer.from(value, 'utf8').toString('latin1');
}

describe('normalizeDisplayName', () => {
  it('khôi phục tên tiếng Việt bị đọc nhầm UTF-8 thành Latin-1', () => {
    expect(normalizeDisplayName(corruptUtf8('Huy đây'))).toBe('Huy đây');
    expect(normalizeDisplayName(corruptUtf8('Nguyễn Hữu Trọng'))).toBe('Nguyễn Hữu Trọng');
  });

  it('giữ nguyên Unicode hợp lệ', () => {
    expect(normalizeDisplayName('Nguyễn Thị Ánh 🚀')).toBe('Nguyễn Thị Ánh 🚀');
    expect(normalizeDisplayName('François')).toBe('François');
    expect(normalizeDisplayName('山田太郎')).toBe('山田太郎');
  });

  it('chỉ chuẩn hoá các trường tên trong payload task-service', () => {
    const brokenName = corruptUtf8('Huy đây');
    const payload = {
      title: `Không đổi nội dung ${brokenName}`,
      assignees: [{ userId: 'u1', displayName: brokenName }],
      activity: { actorName: brokenName },
    };

    expect(normalizeTaskDisplayNames(payload)).toEqual({
      title: `Không đổi nội dung ${brokenName}`,
      assignees: [{ userId: 'u1', displayName: 'Huy đây' }],
      activity: { actorName: 'Huy đây' },
    });
  });
});
