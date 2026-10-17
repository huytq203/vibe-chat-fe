import { afterEach, describe, expect, it, vi } from 'vitest';

describe('google identity wrapper', () => {
  afterEach(() => {
    document.head.innerHTML = '';
    delete window.google;
    vi.resetModules();
  });

  it('chỉ chèn script GIS một lần dù gọi nhiều lần', async () => {
    const { loadGoogleIdentity } = await import('./identity');

    const first = loadGoogleIdentity();
    const second = loadGoogleIdentity();
    const scripts = document.head.querySelectorAll('script[src="https://accounts.google.com/gsi/client"]');
    expect(scripts).toHaveLength(1);

    window.google = { accounts: { id: { initialize: vi.fn(), renderButton: vi.fn() } } };
    scripts[0].dispatchEvent(new Event('load'));
    await expect(first).resolves.toBe(window.google.accounts.id);
    await expect(second).resolves.toBe(window.google.accounts.id);
  });

  it('cho phép thử lại sau khi script tải lỗi', async () => {
    const { loadGoogleIdentity } = await import('./identity');

    const failed = loadGoogleIdentity();
    document.head.querySelector('script')!.dispatchEvent(new Event('error'));
    await expect(failed).rejects.toThrow('Không tải được Google Sign-In');

    loadGoogleIdentity();
    expect(document.head.querySelectorAll('script')).toHaveLength(2);
  });

  it('render nút với popup + callback trả credential', async () => {
    const { renderGoogleButton } = await import('./identity');
    const id = { initialize: vi.fn(), renderButton: vi.fn() };
    window.google = { accounts: { id } };
    const onCredential = vi.fn();
    const el = document.createElement('div');

    await renderGoogleButton(el, { clientId: 'cid', width: 320, onCredential });

    const config = id.initialize.mock.calls[0][0];
    expect(config).toMatchObject({ client_id: 'cid', ux_mode: 'popup' });
    config.callback({ credential: 'id-token' });
    expect(onCredential).toHaveBeenCalledWith('id-token');
    expect(id.renderButton).toHaveBeenCalledWith(el, expect.objectContaining({ text: 'continue_with', width: 320, locale: 'vi' }));
  });
});
