# Kế hoạch: đưa luồng chat AI ra ngoài component

Ngày: 2026-09-10
Repo: `vibe-chat-fe`

## Vấn đề

Rời tab AI giữa lúc AI đang trả lời thì mất cả lượt chat: mất text đang chạy, mất luôn tin nhắn
của người dùng, và để lại một hội thoại rỗng trên server.

## Hiện trạng đã khảo sát (không suy đoán)

`src/features/ai/hooks/useAiConversation.ts`:

- Luồng chat sống trong component: `abortRef`, `draftRef`, `streaming` đều là state/ref của hook.
- Dòng 90-96 có cleanup **abort khi unmount**:
  ```ts
  useEffect(() => () => { abortRef.current?.abort(); ... }, []);
  ```
- Nhánh `catch` đã xử lý ĐÚNG: abort có text thì lưu phần dở; lỗi có text thì lưu kèm
  `status: 'incomplete'`; không có text thì đánh dấu tin người dùng thất bại.
  **Logic đúng, nhưng chạy ở nơi vừa bị huỷ** nên `actions.pushMessage` ghi vào component đã chết.

`src/features/notes/lib/note-ai-history.ts` — `observeTurn`:

- Tin người dùng chỉ được giữ trong `pendingRef` (ref của component).
- `persistTurn` chỉ chạy khi tin **assistant** hoàn tất, và lưu user + assistant CÙNG LÚC.
- Unmount → `pendingRef` mất → `persistTurn` không bao giờ chạy → mất cả lượt.
- Hội thoại đã được `create` từ lúc gửi tin đầu → còn lại hội thoại rỗng.

`src/app/providers.tsx` dòng 14: QueryClient tạo bằng `useState`, **không phải singleton module**.
Nên module ngoài React không import được — phải nhận qua tham số.

## Nguyên tắc

Luồng chat và việc lưu lượt chat KHÔNG được phụ thuộc vào việc component còn sống hay không.
Component chỉ là cửa sổ nhìn vào luồng đang chạy.

---

## Phần 1 — Runner ngoài React

File mới: `src/features/ai/lib/ai-stream-runner.ts` — module thuần, KHÔNG import React.

Registry cấp module (`Map`) theo `streamKey`, mỗi mục giữ:
- `controller: AbortController`
- `text: string` (phần đã nhận)
- `status: 'streaming' | 'idle'`
- `error?: string`
- `subscribers: Set<() => void>`

API xuất ra:
- `startStream(key, { run, onFinish })` — `run(onDelta, signal) => Promise<string>`
- `stopStream(key)` — abort chủ động (nút Dừng)
- `getSnapshot(key)` / `subscribe(key, cb)` — để `useSyncExternalStore` bám vào
- `clearStream(key)`

**`onFinish` là chỗ mấu chốt.** Nó nhận `{ text, status }` và PHẢI chạy dù component còn sống
hay không: `'done'` khi xong, `'aborted'` khi bị dừng, `'error'` khi lỗi. Runner gọi nó trong
`finally`, không qua React.

`onDelta` gom qua `requestAnimationFrame` như code hiện tại đang làm, đừng đổi cách gom.

Test (không cần React): stream xong gọi onFinish với đủ text · abort giữa chừng vẫn gọi onFinish
với text dở và status 'aborted' · lỗi mạng gọi onFinish status 'error' · hai key chạy song song
không lẫn nhau · subscriber nhận thông báo khi có delta.

## Phần 2 — `useAiConversation` bám vào runner

Bỏ `abortRef`, `draftRef`, state `streaming` cục bộ. Thay bằng đọc runner qua
`useSyncExternalStore`. Bỏ cleanup abort-khi-unmount ở dòng 90-96 — unmount KHÔNG được ngắt luồng.

**Giữ nguyên API công khai của hook.** Nơi gọi (`AiTab`, `AiChatWindow`, trang `/ai`) không phải sửa.

`streamKey`:
- ghi chú: `notes:<workspaceId>`
- chat thường: `chat:<sessionId>`
Truyền từ nơi gọi xuống. Một luồng đang chạy cho mỗi key là đủ, vì giao diện chỉ hiện một
hội thoại tại một thời điểm.

Nút Dừng gọi `stopStream(key)` — hành vi với người dùng giữ nguyên.

## Phần 3 — Lưu lượt chat từ runner

`pendingRef` chuyển vào registry của runner theo `streamKey`, không còn là ref của component.

`onFinish` chịu trách nhiệm lưu, dùng module API thuần (`notionAiHistoryApi`) — không dùng hook.
`QueryClient` truyền vào lúc `startStream` (nơi gọi lấy bằng `useQueryClient()`), runner giữ
tham chiếu để `invalidateQueries` sau khi lưu xong.

Ba nhánh của `catch` hiện tại phải được giữ NGUYÊN Ý NGHĨA, chỉ đổi chỗ chạy:
- xong bình thường → lưu user + assistant
- bị dừng, có text → lưu user + assistant (phần đã nhận)
- lỗi, có text → lưu kèm `status: 'incomplete'`
- không có text → đánh dấu tin người dùng thất bại, KHÔNG tạo tin rỗng

`onSettled()` (AiTab dùng để kiểm tra trang có thay đổi) chỉ chạy khi component còn sống —
tách rõ: phần LƯU luôn chạy, phần GỌI LẠI GIAO DIỆN thì không bắt buộc.

Test: rời tab giữa lúc đang stream thì lượt chat VẪN được lưu · quay lại thấy đủ tin nhắn ·
không còn hội thoại rỗng khi luồng bị ngắt · tin người dùng được lưu kể cả khi AI chưa trả lời xong.

---

## Ngoài phạm vi

Khôi phục luồng sau khi tải lại trang (F5). Một fetch không sống qua reload; muốn vậy phải cho
server tự ghi tiếp, thuộc việc khác.

## Tiêu chí hoàn thành
`tsc --noEmit` sạch, `eslint src` 0 error, toàn bộ test xanh. Không commit.
