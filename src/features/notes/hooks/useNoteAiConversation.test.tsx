import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNotesUiStore } from '@/features/notes/stores/notes-ui.store';
import { ApiError } from '@/lib/api/client';
import {
  notionAiHistoryApi, type ConversationSummary,
} from '@/services/notion-ai-history.api';
import { useNoteAiConversation } from '@/features/notes/hooks/useNoteAiConversation';

vi.mock('@/services/notion-ai-history.api', () => ({
  notionAiHistoryApi: {
    list: vi.fn(), create: vi.fn(), detail: vi.fn(), appendTurn: vi.fn(),
    rename: vi.fn(), remove: vi.fn(), uploadAttachment: vi.fn(),
  },
}));

const list = vi.mocked(notionAiHistoryApi.list);
const create = vi.mocked(notionAiHistoryApi.create);
const detail = vi.mocked(notionAiHistoryApi.detail);
const appendTurn = vi.mocked(notionAiHistoryApi.appendTurn);

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

afterEach(() => {
  vi.clearAllMocks();
  useNotesUiStore.setState({ aiConversationByWorkspace: {} });
  useNotesUiStore.persist.clearStorage();
  list.mockResolvedValue([]);
  create.mockResolvedValue({ id: 'conversation-new' });
  detail.mockImplementation(async (id) => ({ id, title: null, messages: [] }));
  appendTurn.mockResolvedValue({ ok: true });
});

describe('lịch sử hội thoại AI của workspace', () => {
  it('nên tải danh sách hội thoại theo workspace khi mở tab', async () => {
    list.mockResolvedValue([{ id: 'conversation-1', title: 'Tóm tắt',
      updatedAt: '2026-09-10T08:00:00.000Z' }]);

    const { result } = renderHook(() => useNoteAiConversation('workspace-1', 'page-1'),
      { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.conversations).toHaveLength(1));
    expect(list).toHaveBeenCalledWith('workspace-1');
    expect(create).not.toHaveBeenCalled();
  });

  it('nên chỉ cập nhật giao diện khi đẩy tin nhắn trực tiếp vào actions', async () => {
    const { result } = renderHook(() => useNoteAiConversation('workspace-1', 'page-1'),
      { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.actions.pushMessage(
      result.current.session.id, { role: 'user', content: 'Tóm tắt trang' },
    ));
    act(() => result.current.actions.pushMessage(
      result.current.session.id, { role: 'assistant', content: 'Nội dung tóm tắt' },
    ));

    expect(result.current.session.messages).toHaveLength(2);
    expect(create).not.toHaveBeenCalled();
    expect(appendTurn).not.toHaveBeenCalled();
  });

  it('nên giữ nguyên identity của actions khi phiên đổi', async () => {
    const { result, rerender } = renderHook(
      () => useNoteAiConversation('workspace-1', 'page-1'),
      { wrapper: createWrapper() });
    const actions = result.current.actions;

    act(() => result.current.actions.pushMessage(
      result.current.session.id, { role: 'user', content: 'Câu hỏi' },
    ));
    rerender();

    expect(result.current.actions).toBe(actions);
  });

  it('nên giữ phiên nháp khi đổi trang trong cùng workspace', () => {
    const { result, rerender } = renderHook(
      ({ pageId }) => useNoteAiConversation('workspace-1', pageId),
      { initialProps: { pageId: 'page-1' }, wrapper: createWrapper() },
    );
    act(() => result.current.actions.pushMessage(
      result.current.session.id, { role: 'user', content: 'Trang cũ' },
    ));

    rerender({ pageId: 'page-2' });

    expect(result.current.session).toMatchObject({
      id: 'workspace-1',
      messages: [{ role: 'user', content: 'Trang cũ' }],
    });
    expect(list).toHaveBeenCalledTimes(1);
  });

  it('nên vẫn gửi được tin nhắn đầu tiên khi danh sách hội thoại còn đang tải', () => {
    let resolveList: (value: ConversationSummary[]) => void = () => undefined;
    list.mockReturnValue(new Promise((resolve) => { resolveList = resolve; }));
    const { result } = renderHook(() => useNoteAiConversation('workspace-1', 'page-1'),
      { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);

    act(() => result.current.actions.pushMessage(
      result.current.session.id, { role: 'user', content: 'Tin nhắn đầu tiên' },
    ));

    expect(result.current.session.messages).toEqual([
      { role: 'user', content: 'Tin nhắn đầu tiên' },
    ]);
    act(() => resolveList([]));
  });

  it('nên đổi sang phiên nháp rỗng khi đổi workspace', () => {
    const { result, rerender } = renderHook(
      ({ workspaceId }) => useNoteAiConversation(workspaceId, 'page-1'),
      { initialProps: { workspaceId: 'workspace-1' }, wrapper: createWrapper() },
    );
    act(() => result.current.actions.pushMessage(
      result.current.session.id, { role: 'user', content: 'Workspace cũ' },
    ));

    rerender({ workspaceId: 'workspace-2' });

    expect(result.current.activeId).toBeNull();
    expect(result.current.session).toMatchObject({ id: 'workspace-2', messages: [] });
  });

  it('nên nạp chi tiết khi chọn một hội thoại', async () => {
    detail.mockResolvedValue({ id: 'conversation-1', title: 'Trang cũ',
      messages: [{ role: 'user', content: 'Đã hỏi' }] });
    const { result } = renderHook(() => useNoteAiConversation('workspace-1', 'page-1'),
      { wrapper: createWrapper() });

    act(() => result.current.select('conversation-1'));

    await waitFor(() => expect(result.current.session.messages).toEqual([
      { role: 'user', content: 'Đã hỏi' },
    ]));
    expect(detail).toHaveBeenCalledWith('conversation-1');
  });

  it('nên hiện lại tin nhắn cũ khi dựng lại tab với hội thoại đã nhớ', async () => {
    const messages = [
      { role: 'user' as const, content: 'Câu hỏi cũ' },
      { role: 'assistant' as const, content: 'Câu trả lời cũ' },
    ];
    detail.mockResolvedValue({ id: 'conversation-1', title: 'Trang cũ', messages });
    const first = renderHook(() => useNoteAiConversation('workspace-1', 'page-1'),
      { wrapper: createWrapper() });
    act(() => first.result.current.select('conversation-1'));
    await waitFor(() => expect(first.result.current.activeId).toBe('conversation-1'));
    first.unmount();

    const second = renderHook(() => useNoteAiConversation('workspace-1', 'page-1'),
      { wrapper: createWrapper() });

    expect(second.result.current.activeId).toBe('conversation-1');
    await waitFor(() => expect(second.result.current.session.messages).toEqual(messages));
  });

  it('nên không ghim phiên rỗng khi có thao tác xảy ra lúc detail chưa tải xong', async () => {
    useNotesUiStore.getState().setAiConversation('workspace-1', 'conversation-1');
    const messages = [
      { role: 'user' as const, content: 'Câu hỏi cũ' },
      { role: 'assistant' as const, content: 'Câu trả lời cũ' },
    ];
    let resolveDetail: (value: { id: string; title: string; messages: typeof messages }) => void
      = () => undefined;
    detail.mockReturnValue(new Promise((resolve) => { resolveDetail = resolve; }));

    const { result } = renderHook(() => useNoteAiConversation('workspace-1', 'page-1'),
      { wrapper: createWrapper() });
    await waitFor(() => expect(detail).toHaveBeenCalledWith('conversation-1'));
    expect(result.current.isLoading).toBe(true);

    act(() => result.current.actions.pushMessage(result.current.session.id,
      { role: 'user', content: 'Không được ghim' }));
    act(() => resolveDetail({ id: 'conversation-1', title: 'Trang cũ', messages }));

    await waitFor(() => expect(result.current.session.messages).toEqual(messages));
  });

  it('nên giữ nguyên hội thoại đang mở khi đổi sang trang khác cùng workspace', async () => {
    detail.mockResolvedValue({ id: 'conversation-1', title: 'Trang cũ', messages: [] });
    const { result, rerender } = renderHook(
      ({ pageId }) => useNoteAiConversation('workspace-1', pageId),
      { initialProps: { pageId: 'page-1' }, wrapper: createWrapper() },
    );
    act(() => result.current.select('conversation-1'));
    await waitFor(() => expect(result.current.session.id).toBe('conversation-1'));

    rerender({ pageId: 'page-2' });

    expect(result.current.activeId).toBe('conversation-1');
    expect(result.current.session.id).toBe('conversation-1');
  });

  it('nên KHÔNG tạo hội thoại mới khi quay lại tab AI', async () => {
    detail.mockResolvedValue({ id: 'conversation-1', title: 'Trang cũ', messages: [] });
    const first = renderHook(() => useNoteAiConversation('workspace-1', 'page-1'),
      { wrapper: createWrapper() });
    act(() => first.result.current.select('conversation-1'));
    first.unmount();
    const second = renderHook(() => useNoteAiConversation('workspace-1', 'page-1'),
      { wrapper: createWrapper() });
    await waitFor(() => expect(second.result.current.session.id).toBe('conversation-1'));

    act(() => second.result.current.actions.pushMessage('conversation-1',
      { role: 'user', content: 'Hỏi tiếp' }));

    expect(create).not.toHaveBeenCalled();
  });

  it('nên quay về phiên nháp khi hội thoại đã nhớ không còn tồn tại', async () => {
    useNotesUiStore.getState().setAiConversation('workspace-1', 'conversation-deleted');
    detail.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Không tìm thấy'));

    const { result } = renderHook(() => useNoteAiConversation('workspace-1', 'page-1'),
      { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.activeId).toBeNull());
    expect(result.current.session).toMatchObject({ id: 'workspace-1', messages: [] });
    expect(result.current.isError).toBe(false);
  });

  it('nên nhớ riêng từng workspace khi mỗi workspace mở một hội thoại', () => {
    const { result, rerender } = renderHook(
      ({ workspaceId }) => useNoteAiConversation(workspaceId, 'page-1'),
      { initialProps: { workspaceId: 'workspace-1' }, wrapper: createWrapper() },
    );
    act(() => result.current.select('conversation-1'));
    rerender({ workspaceId: 'workspace-2' });
    act(() => result.current.select('conversation-2'));
    rerender({ workspaceId: 'workspace-1' });

    expect(result.current.activeId).toBe('conversation-1');
    expect(useNotesUiStore.getState().aiConversationByWorkspace).toEqual({
      'workspace-1': 'conversation-1',
      'workspace-2': 'conversation-2',
    });
    expect(localStorage.getItem('halo-notes-ui')).toContain(
      '"aiConversationByWorkspace":{"workspace-1":"conversation-1","workspace-2":"conversation-2"}',
    );
  });

  it('nên trả đúng dữ liệu khi chỉnh lịch sử bằng actions', async () => {
    const { result } = renderHook(() => useNoteAiConversation('workspace-1', 'page-1'),
      { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.actions.pushMessage(result.current.session.id,
      { role: 'user', content: 'Gửi lại', status: 'failed', errorMessage: 'Lỗi' }));
    act(() => result.current.actions.pushMessage(result.current.session.id,
      { role: 'assistant', content: 'Bỏ đi' }));
    let dropped = result.current.session.messages;
    act(() => { dropped = result.current.actions.dropLastAssistant(result.current.session.id); });
    expect(dropped).toEqual([{ role: 'user', content: 'Gửi lại', status: 'failed',
      errorMessage: 'Lỗi' }]);
    let prepared = dropped;
    act(() => { prepared = result.current.actions.prepareResend(result.current.session.id, 0); });
    expect(prepared).toEqual([{ role: 'user', content: 'Gửi lại' }]);
    let removed = null;
    act(() => { removed = result.current.actions.removeMessage(result.current.session.id, 0); });
    expect(removed).toEqual({ role: 'user', content: 'Gửi lại' });
  });
});
