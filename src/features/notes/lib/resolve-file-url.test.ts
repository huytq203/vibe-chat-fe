import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveAttachmentFileUrl } from './resolve-file-url';

const attachmentsMock = vi.hoisted(() => ({ getUrl: vi.fn() }));
vi.mock('@/services/notion-attachments.api', () => ({ attachmentsApi: attachmentsMock }));

afterEach(() => vi.clearAllMocks());

describe('resolveAttachmentFileUrl', () => {
  it('URL không phải attachment:// → trả nguyên văn, không gọi API', async () => {
    const url = await resolveAttachmentFileUrl('https://example.com/anh.png');

    expect(url).toBe('https://example.com/anh.png');
    expect(attachmentsMock.getUrl).not.toHaveBeenCalled();
  });

  it('attachment://<id> → gọi API lấy URL thật', async () => {
    attachmentsMock.getUrl.mockResolvedValue({ url: 'https://s3.local/signed-once' });

    const url = await resolveAttachmentFileUrl('attachment://att-unique-1');

    expect(attachmentsMock.getUrl).toHaveBeenCalledWith('att-unique-1');
    expect(url).toBe('https://s3.local/signed-once');
  });

  it('gọi lại trong TTL → dùng cache, không gọi API lần hai', async () => {
    attachmentsMock.getUrl.mockResolvedValue({ url: 'https://s3.local/signed-cached' });

    await resolveAttachmentFileUrl('attachment://att-unique-2');
    const second = await resolveAttachmentFileUrl('attachment://att-unique-2');

    expect(attachmentsMock.getUrl).toHaveBeenCalledTimes(1);
    expect(second).toBe('https://s3.local/signed-cached');
  });
});
