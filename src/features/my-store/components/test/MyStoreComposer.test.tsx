import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent, renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { MyStoreComposer } from '../MyStoreComposer';

const mocks = vi.hoisted(() => ({
  sendText: vi.fn(),
  sendMedia: vi.fn(),
  uploadDirect: vi.fn(),
}));

vi.mock('@/features/my-store/hooks/use-mutations', () => ({
  useSendStoreMessage: () => ({ isPending: false, mutate: mocks.sendText }),
  useSendStoreMediaMessage: () => ({ isPending: false, mutateAsync: mocks.sendMedia }),
}));

vi.mock('@/services/media.api', () => ({
  mediaApi: {
    uploadDirect: mocks.uploadDirect,
    remove: vi.fn(),
  },
}));

vi.mock('../ReminderDialog', () => ({ ReminderDialog: () => null }));
vi.mock('../ChecklistDialog', () => ({ ChecklistDialog: () => null }));
vi.mock('../BookmarkDialog', () => ({ BookmarkDialog: () => null }));

describe('MyStoreComposer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:preview'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    mocks.uploadDirect.mockResolvedValue({
      id: 'media-1',
      category: 'ATTACHMENT',
      status: 'READY',
      mimeType: 'image/png',
      size: 3,
      originalName: 'halo.png',
      width: 320,
      height: 320,
      duration: null,
      downloadUrl: 'https://example.com/halo.png',
      createdAt: '2026-09-13T12:00:00.000Z',
    });
    mocks.sendMedia.mockResolvedValue({ id: 'message-1' });
  });

  it('previews an image locally and uploads only after Send is pressed', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<MyStoreComposer conversationId="store-1" />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['png'], 'halo.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByAltText('halo.png')).toHaveAttribute('src', 'blob:preview');
    expect(mocks.uploadDirect).not.toHaveBeenCalled();
    expect(mocks.sendMedia).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Gửi' }));

    await waitFor(() => expect(mocks.uploadDirect).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.sendMedia).toHaveBeenCalledWith({
      attachments: [{ mediaId: 'media-1', kind: 'image' }],
      plaintext: undefined,
      replyToMessageId: undefined,
    }));
    await waitFor(() => expect(screen.queryByAltText('halo.png')).not.toBeInTheDocument());
  });
});
