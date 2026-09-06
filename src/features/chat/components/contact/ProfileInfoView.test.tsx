import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileInfoView } from './ProfileInfoView';
import type { AuthUser } from '@/features/auth';

const me = {
  id: 'u1',
  username: 'huy',
  displayName: 'Huy',
  email: 'huy@example.com',
  avatarUrl: 'https://cdn.test/avatar.png',
  coverUrl: 'https://cdn.test/cover.png',
} as AuthUser;

function renderView(overrides: Partial<Parameters<typeof ProfileInfoView>[0]> = {}) {
  const onPreview = vi.fn();
  render(
    <ProfileInfoView
      me={me}
      isLoading={false}
      onEdit={vi.fn()}
      isActive
      onPreview={onPreview}
      {...overrides}
    />,
  );
  return { onPreview };
}

describe('ProfileInfoView — xem to ảnh hồ sơ', () => {
  it('mở ảnh bìa và ảnh đại diện khi bấm vào', async () => {
    const { onPreview } = renderView();

    await userEvent.click(screen.getByRole('button', { name: 'Xem ảnh bìa' }));
    expect(onPreview).toHaveBeenCalledWith('cover');

    await userEvent.click(screen.getByRole('button', { name: 'Xem ảnh đại diện' }));
    expect(onPreview).toHaveBeenCalledWith('avatar');
  });

  it('khoá xem ảnh khi đang ở màn cập nhật', () => {
    renderView({ isActive: false });
    expect(screen.getByRole('button', { name: 'Xem ảnh bìa' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Xem ảnh đại diện' })).toBeDisabled();
  });

  it('khoá xem ảnh bìa khi hồ sơ chỉ có gradient mặc định', () => {
    renderView({ me: { ...me, coverUrl: null } as AuthUser });
    expect(screen.getByRole('button', { name: 'Xem ảnh bìa' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Xem ảnh đại diện' })).toBeEnabled();
  });
});
