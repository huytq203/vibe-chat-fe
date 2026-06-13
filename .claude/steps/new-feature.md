# STEP — Tạo feature module mới

> Feature = bounded context kinh doanh (chat, auth, billing…). Theo thứ tự, KHÔNG bỏ bước.

1. **Hiểu yêu cầu** — không rõ → hỏi user. KHÔNG đoán.
2. **Xác định phạm vi** — feature mới hay mở rộng feature có sẵn? Đọc [../project-context/CONTEXT.md](../project-context/CONTEXT.md).
3. **Tạo khung thư mục**:
   ```
   src/features/<x>/
   ├── components/        # UI riêng feature
   ├── hooks/             # use-query.ts, use-mutations.ts, useXxx.ts
   ├── actions/           # Server Actions (nếu có mutate)
   ├── stores/            # Zustand slice (chỉ khi cần global)
   ├── schemas.ts         # Zod — định nghĩa TRƯỚC
   ├── types.ts           # type = z.infer(...)
   ├── utils.ts
   └── index.ts           # public API, export tường minh
   ```
4. **Schema Zod trước** ([../patterns/forms-zod.md](../patterns/forms-zod.md)) → suy ra types ([../rules/01-typescript.md](../rules/01-typescript.md)).
5. **API transport** ở `src/services/<x>.api.ts` + key ở `src/services/keys.ts` ([../patterns/query-keys.md](../patterns/query-keys.md)). KHÔNG tạo `features/<x>/api/`.
6. **Hooks** TanStack trong `hooks/use-query.ts` & `use-mutations.ts` ([../templates/hook-query.md](../templates/hook-query.md)).
7. **Components** theo [../rules/02-components.md](../rules/02-components.md) + đủ 4 trạng thái ([../patterns/four-states.md](../patterns/four-states.md)).
8. **Wrap lib mới** (nếu có) trong `src/lib/`.
9. **Test** cùng lúc (happy + edge) — Vitest/Testing Library.
10. **Self-review** theo `../rules/RULE.md §13`; chạy `tsc --noEmit` + `npm run lint`.
11. **Export public API** qua `index.ts` (tường minh, không `export *`).
12. **Báo cáo** ngắn (≤ 5 dòng, tiếng Việt): diff + lý do thiết kế.
