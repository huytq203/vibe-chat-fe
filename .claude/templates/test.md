# TEMPLATE — Test (Vitest + Testing Library + MSW)

> Test **behavior** (user thấy gì, click gì), KHÔNG test implementation detail (state nội bộ). File test cạnh source: `ChatMessage.tsx` ↔ `ChatMessage.test.tsx`.

## Unit — logic thuần (util/hook không I/O)
```ts
// features/chat/utils.test.ts
import { describe, it, expect } from "vitest";
import { formatMessageTime } from "./utils";

describe("formatMessageTime", () => {
  it("trả về HH:mm cho cùng ngày", () => {
    expect(formatMessageTime(new Date("2026-06-13T09:05:00"))).toBe("09:05");
  });
  it("xử lý mốc null an toàn (edge case)", () => {
    expect(formatMessageTime(null)).toBe("");
  });
});
```

## Component — UI có nhánh/tương tác (đủ 4 trạng thái)
```tsx
// features/chat/components/MessageList.test.tsx
import { render, screen } from "@testing-library/react";
import { MessageList } from "./MessageList";
import { renderWithQuery } from "@/test/render"; // wrapper QueryClientProvider

it("hiện skeleton khi loading", () => {
  renderWithQuery(<MessageList conversationId="c1" />);
  expect(screen.getByTestId("message-skeleton")).toBeInTheDocument();
});

it("hiện empty state khi không có tin nhắn", async () => {
  renderWithQuery(<MessageList conversationId="empty" />);
  expect(await screen.findByText(/chưa có tin nhắn/i)).toBeInTheDocument();
});
```

## Integration — flow trong 1 module (form + query) qua MSW
```tsx
// features/chat/components/MessageComposer.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "@/test/mocks/server"; // MSW node server
import { MessageComposer } from "./MessageComposer";

it("gửi tin nhắn rồi reset input", async () => {
  const user = userEvent.setup();
  render(<MessageComposer conversationId="c1" />);
  await user.type(screen.getByRole("textbox"), "Xin chào");
  await user.click(screen.getByRole("button", { name: /gửi/i }));
  expect(await screen.findByRole("textbox")).toHaveValue("");
});
```

## MSW handler (đặt ở `test/mocks/`)
```ts
// test/mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("*/messages", () => HttpResponse.json({ items: [], nextCursor: null })),
  http.post("*/messages", () => HttpResponse.json({ id: "m1", content: "Xin chào" })),
];
```

## Quy tắc
- Mỗi component public của module: ≥ 1 happy path + 1 edge case.
- Mock API qua **MSW** ở `test/mocks/` — KHÔNG mock `fetch` thủ công từng test.
- Query trong test: dùng `QueryClient` mới mỗi test (`retry: false`, `gcTime: 0`) để tránh rò state.
- Query bằng role/label/text (truy cập như user), hạn chế `getByTestId` (chỉ cho skeleton/element không có vai trò ngữ nghĩa).
- E2E critical path (login, gửi tin nhắn) → Playwright, tách riêng `e2e/`.
