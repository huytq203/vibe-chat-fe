import { describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const envMock = vi.hoisted(() => ({ env: { NEXT_PUBLIC_GOOGLE_CLIENT_ID: undefined as string | undefined } }));
vi.mock('@/config/env', () => envMock);
const renderGoogleButton = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@/lib/google/identity', () => ({ renderGoogleButton }));

import { GoogleSignInButton } from './GoogleSignInButton';

describe('GoogleSignInButton', () => {
  it('ẩn hoàn toàn khi chưa cấu hình client id', () => {
    envMock.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = undefined;
    const { container } = render(<GoogleSignInButton onCredential={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
    expect(renderGoogleButton).not.toHaveBeenCalled();
  });

  it('render nút GIS với client id cấu hình', async () => {
    envMock.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'cid';
    render(<GoogleSignInButton onCredential={vi.fn()} />);

    await waitFor(() => expect(renderGoogleButton).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({ clientId: 'cid' })));
  });
});
