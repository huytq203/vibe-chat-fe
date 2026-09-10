# Lịch sử hội thoại AI cho ghi chú — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hội thoại ở tab AI của ghi chú sống qua việc đóng bảng bên, đóng tab, đổi máy — lưu trên server, mã hoá, tự xoá sau 30 ngày không dùng.

**Architecture:** `notion-service` sở hữu kho hội thoại của riêng nó (D1). FE ghi sau mỗi lượt (D2) — `ai-service` không đụng vào. Nội dung và tiêu đề mã hoá AES-GCM ở tầng ứng dụng (D3); đính kèm lên MinIO, DB chỉ giữ khoá (D4). Cổng `AiSessionActions` giữ nguyên nên `useAiConversation` không phải sửa một dòng (R4).

**Tech Stack:** NestJS 11, Prisma, PostgreSQL, MinIO (S3 SDK), `@nestjs/schedule`, Jest 30 · Next.js 16, React 19, TanStack Query v5, Vitest.

**Spec:** `vibe-chat-fe/docs/superpowers/specs/2026-09-09-ai-conversation-history-design.md`

**Phạm vi:** Plan này là **nửa ghi chú**. Nửa chat (`vibe-chat` + FE chat) là plan riêng, làm sau khi nửa này chạy thật — để có một bản hiện thực đã kiểm chứng mà chép theo thay vì thiết kế mù hai lần.

## Global Constraints

Hai repo, đường dẫn tuyệt đối: `/home/huytq/code/my/be/notion-service` (Task 1–4), `/home/huytq/code/my/fe/vibe-chat-fe` (Task 5–7). Mỗi task chỉ đụng **một** repo.

**`notion-service`:**
- Comment code và tên test bằng **tiếng Anh**, mẫu `should <kết quả> when <điều kiện>` — theo convention repo đó.
- Mock bằng constructor injection thủ công, không `Test.createTestingModule`.
- Mọi input HTTP qua DTO `class-validator` + `@ApiProperty`. Repo bật `forbidNonWhitelisted` — payload dư field sẽ bị 400.
- Exception là exception của Nest kèm `{ code, message }`.
- Lệnh test: `NODE_OPTIONS=--experimental-vm-modules npx jest` (gọi `npx jest` trần sẽ vỡ ở `jwks-rsa`).
- **Mốc hồi quy: 132 test / 27 suite xanh, `npx tsc --noEmit` sạch tuyệt đối.** Chạy lại xác nhận trước khi sửa.

**`vibe-chat-fe`:** trích từ `.claude/CLAUDE.md`
- Cấm `any`, `@ts-ignore`, `eslint-disable` (trừ khi có comment giải thích lý do).
- Component **< 200 dòng**, function **< 50 dòng**, file **< 300 dòng**, hook **< 80 dòng**.
- Mọi UI hiển thị dữ liệu từ API phải xử lý đủ **4 trạng thái**: `loading / error / empty / data`.
- Mọi fetch client-side qua **TanStack Query**. Cấm `useEffect + fetch`.
- Transport ở `src/services/<scope>.api.ts`, query key ở `src/services/keys.ts`. **Cấm** tạo `features/<x>/api/`.
- Named export. UI primitive từ `@/components/ui/*` (Basuicn). Import alias `@/...`.
- Comment tiếng Việt. Tên test **tiếng Việt**, mẫu `nên <kết quả> khi <điều kiện>`.
- **Không thêm thư viện mới.**
- **Mốc hồi quy: 766 test / 159 file xanh, `npx tsc --noEmit` sạch, `npx eslint src/features/notes` 0 error.**
- **Test chập chờn đã biết:** `NotesLayout.test.tsx > chỉ làm mới bình luận khi tín hiệu stateless khớp trang` hỏng khoảng 1/5 lần chạy toàn suite, chạy riêng luôn xanh. Gặp hỏng thì chạy lại xác nhận, **đừng đi sửa**.

**Chung:** không commit; controller review diff. Cả hai repo đang có nhiều thay đổi chưa commit của người khác — chỉ đụng file thuộc task đang làm.

## Bản đồ file

| Repo | File | Trách nhiệm |
|---|---|---|
| notion | `src/common/security/conversation-cipher.ts` | AES-GCM, gói `iv‖tag‖cipher` vào một Buffer |
| notion | `src/config/{configuration,env.validation}.ts` | `AI_CONVERSATION_KEY` |
| notion | `prisma/schema.prisma` + migration | 2 bảng mới |
| notion | `src/modules/ai-conversations/ai-conversation.service.ts` | CRUD + ghi lượt, mã hoá/giải mã |
| notion | `src/modules/ai-conversations/ai-conversation.controller.ts` | 7 endpoint, không logic |
| notion | `src/modules/ai-conversations/dto/*.ts` | DTO validate |
| notion | `src/modules/ai-conversations/ai-conversation-cleanup.service.ts` | `@Cron` dọn 30 ngày |
| FE | `src/services/notion-ai-history.api.ts` | transport |
| FE | `src/services/keys.ts` | query key |
| FE | `src/features/notes/hooks/useNoteAiConversation.ts` | thay `useNoteAiSession` |
| FE | `src/features/notes/components/panel/AiConversationBar.tsx` | tiêu đề + dropdown danh sách + nút mới |
| FE | `src/features/notes/components/panel/AiTab.tsx` | ráp lại |
| FE | `src/features/notes/components/NoteCanvas.tsx` | nút AI nổi khi panel đóng |

---

### Task 1: Cipher + config + schema

**Repo:** `/home/huytq/code/my/be/notion-service`

**Files:**
- Create: `src/common/security/conversation-cipher.ts`
- Create: `src/common/security/tests/conversation-cipher.spec.ts`
- Modify: `src/config/env.validation.ts`, `src/config/configuration.ts`
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260909000000_ai_conversation/migration.sql`

**Interfaces:**
- Produces: `ConversationCipher` với `seal(plaintext: string): Buffer` và `open(packed: Buffer): string`. Task 2 dùng. Model Prisma `AiConversation`, `AiConversationMessage` — Task 2 và 4 dùng.

- [ ] **Step 1: Viết test đỏ**

```ts
describe('ConversationCipher', () => {
  const key = '0'.repeat(64); // 32 byte hex
  const createCipher = (): ConversationCipher =>
    new ConversationCipher({
      getOrThrow: () => ({ conversationKey: key }),
    } as unknown as ConfigService);

  it('should return the original text when sealing then opening', () => {
    const cipher = createCipher();
    expect(cipher.open(cipher.seal('nội dung bí mật'))).toBe('nội dung bí mật');
  });

  it('should produce a different payload each time when sealing the same text', () => {
    const cipher = createCipher();
    // IV ngẫu nhiên mỗi lần: hai lần seal cùng chuỗi phải khác nhau, nếu không
    // kẻ đọc DB suy ra được hai tin nhắn giống nhau mà không cần giải mã.
    expect(cipher.seal('xin chào').equals(cipher.seal('xin chào'))).toBe(false);
  });

  it('should throw when the payload has been tampered with', () => {
    const cipher = createCipher();
    const packed = cipher.seal('xin chào');
    packed[packed.length - 1] ^= 0xff;
    expect(() => cipher.open(packed)).toThrow();
  });
});
```

- [ ] **Step 2: Chạy để thấy fail**

Run: `NODE_OPTIONS=--experimental-vm-modules npx jest conversation-cipher`
Expected: FAIL, `Cannot find module '../conversation-cipher'`.

- [ ] **Step 3: Hiện thực cipher**

Chép cơ chế từ `ai-service/src/common/security/credential-cipher.ts` (`aes-256-gcm`, IV 12 byte). Khác một điểm: gói tất cả vào **một** Buffer thay vì trả object ba mảnh, vì DB chỉ có một cột.

```ts
const CIPHER_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;
const TAG_LENGTH_BYTES = 16;

@Injectable()
export class ConversationCipher {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    this.key = Buffer.from(
      config.getOrThrow<SecuritySettings>('security').conversationKey,
      'hex',
    );
  }

  /** Layout: iv(12) ‖ tag(16) ‖ ciphertext. One column, self-describing. */
  seal(plaintext: string): Buffer {
    const iv = randomBytes(IV_LENGTH_BYTES);
    const encryptor = createCipheriv(CIPHER_ALGORITHM, this.key, iv);
    const cipher = Buffer.concat([encryptor.update(plaintext, 'utf8'), encryptor.final()]);
    return Buffer.concat([iv, encryptor.getAuthTag(), cipher]);
  }

  open(packed: Buffer): string {
    const iv = packed.subarray(0, IV_LENGTH_BYTES);
    const tag = packed.subarray(IV_LENGTH_BYTES, IV_LENGTH_BYTES + TAG_LENGTH_BYTES);
    const cipher = packed.subarray(IV_LENGTH_BYTES + TAG_LENGTH_BYTES);
    const decryptor = createDecipheriv(CIPHER_ALGORITHM, this.key, iv);
    decryptor.setAuthTag(tag);
    return Buffer.concat([decryptor.update(cipher), decryptor.final()]).toString('utf8');
  }
}
```

- [ ] **Step 4: Env + config**

```ts
// env.validation.ts — cùng dạng AI_CREDENTIAL_KEY của ai-service
AI_CONVERSATION_KEY: Joi.string().hex().length(64).required(),
```

```ts
// configuration.ts — thêm vào nhánh security (tạo nhánh nếu chưa có)
security: {
  conversationKey: process.env.AI_CONVERSATION_KEY ?? '',
},
```

**Bắt buộc `required()`**, khác `NOTION_SERVICE_INTERNAL_BASE_URL` vốn cho rỗng: khoá rỗng nghĩa là mã hoá bằng khoá toàn số 0, tức không mã hoá gì cả mà vẫn im lặng chạy. Thà service không khởi động được.

Sinh khoá cho `.env`: `openssl rand -hex 32`.

- [ ] **Step 5: Schema + migration**

```prisma
model AiConversation {
  id        String   @id @default(cuid())
  userId    String
  pageId    String
  title     Bytes?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  messages  AiConversationMessage[]

  @@index([userId, pageId, updatedAt])
  @@index([updatedAt])
}

model AiConversationMessage {
  id             String   @id @default(cuid())
  conversationId String
  role           String
  content        Bytes
  status         String?
  attachments    Json?
  createdAt      DateTime @default(now())

  conversation AiConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId, createdAt])
}
```

`pageId` **bắt buộc** ở repo này (spec để `String?` cho khuôn chung với `vibe-chat`; bên ghi chú thì hội thoại luôn thuộc một trang).

Viết migration SQL tay theo mẫu các migration sẵn có trong `prisma/migrations/`, rồi `npx prisma generate`.

- [ ] **Step 6: Chạy test**

Run: `npm run lint && npm run build && NODE_OPTIONS=--experimental-vm-modules npx jest`
Expected: PASS, 132 test cũ vẫn xanh + 3 test mới. `npx tsc --noEmit` sạch.

---

### Task 2: `AiConversationService`

**Repo:** `/home/huytq/code/my/be/notion-service`

**Files:**
- Create: `src/modules/ai-conversations/ai-conversation.service.ts`
- Create: `src/modules/ai-conversations/tests/ai-conversation.service.spec.ts`

**Interfaces:**
- Consumes: `ConversationCipher` (Task 1), `PrismaService`, `PagesService`, `StorageService`.
- Produces:

```ts
interface ConversationSummary { id: string; title: string | null; updatedAt: Date }
interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  status?: 'failed' | 'incomplete';
  attachments?: { name: string; mimeType: string; size: number; storageKey: string }[];
}
interface ConversationDetail { id: string; title: string | null; messages: ConversationMessage[] }

list(user: AuthUser, pageId: string): Promise<ConversationSummary[]>
create(user: AuthUser, pageId: string): Promise<{ id: string }>
detail(user: AuthUser, id: string): Promise<ConversationDetail>
appendTurn(user: AuthUser, id: string, turn: { user: ConversationMessage; assistant: ConversationMessage }): Promise<void>
rename(user: AuthUser, id: string, title: string): Promise<ConversationSummary>
remove(user: AuthUser, id: string): Promise<{ id: string }>
```

Task 3 gọi.

- [ ] **Step 1: Viết test đỏ**

```ts
it('should reject access when the conversation belongs to another user', async () => {
  const { service } = createHarness({ conversation: { userId: 'someone-else' } });
  await expect(service.detail(user, 'cv-1')).rejects.toBeInstanceOf(ForbiddenException);
});

it('should store content encrypted when appending a turn', async () => {
  const { service, createMany } = createHarness({});
  await service.appendTurn(user, 'cv-1', {
    user: { role: 'user', content: 'câu hỏi' },
    assistant: { role: 'assistant', content: 'câu trả lời' },
  });
  const rows = createMany.mock.calls[0][0].data as { content: Buffer }[];
  // Bản rõ không được xuất hiện trong thứ ghi xuống DB.
  expect(rows.every((row) => !row.content.toString('utf8').includes('câu hỏi'))).toBe(true);
});

it('should write both messages in one transaction when appending a turn', async () => { /* … */ });
it('should bump updatedAt when appending a turn', async () => { /* … */ });
it('should return decrypted content when reading a conversation', async () => { /* … */ });
it('should return decrypted titles when listing conversations', async () => { /* … */ });
it('should require EDIT-visible page access when creating a conversation', async () => { /* … */ });
```

- [ ] **Step 2: Chạy để thấy fail → hiện thực**

Ba điểm bắt buộc:

1. **Quyền trang.** `create` và `list` gọi `this.pages.getPageAndRole(user, pageId, PageRole.VIEW)` — người không xem được trang thì không được hỏi AI về nó, cũng không được đọc hội thoại về nó. Mọi thao tác trên `:id` kiểm `conversation.userId === user.id` rồi mới làm.

2. **Ghi lượt trong một transaction** (D6):

```ts
await this.prisma.$transaction([
  this.prisma.aiConversationMessage.createMany({ data: [userRow, assistantRow] }),
  this.prisma.aiConversation.update({
    where: { id },
    data: { updatedAt: new Date() },   // mốc 30 ngày (D5)
  }),
]);
```

3. **Không log nội dung.** Log chỉ được chứa `conversationId`, `role`, độ dài. Tuyệt đối không log bản rõ hay khoá.

- [ ] **Step 3: Chạy test**

Run: `NODE_OPTIONS=--experimental-vm-modules npx jest` — Expected: PASS.

---

### Task 3: Controller + DTO + module

**Repo:** `/home/huytq/code/my/be/notion-service`

**Files:**
- Create: `src/modules/ai-conversations/ai-conversation.controller.ts`
- Create: `src/modules/ai-conversations/dto/{append-turn,rename-conversation}.dto.ts`
- Create: `src/modules/ai-conversations/ai-conversation.module.ts`
- Modify: `src/app.module.ts`
- Create: `src/modules/ai-conversations/tests/ai-conversation.controller.spec.ts`

**Interfaces:**
- Consumes: `AiConversationService` (Task 2).
- Produces: 7 endpoint. Task 5 gọi.

| Method | Path |
|---|---|
| GET | `pages/:pageId/ai-conversations` |
| POST | `pages/:pageId/ai-conversations` |
| GET | `ai-conversations/:id` |
| POST | `ai-conversations/:id/turns` |
| PATCH | `ai-conversations/:id` |
| DELETE | `ai-conversations/:id` |
| POST | `ai-conversations/:id/attachments` |

- [ ] **Step 1: Viết test đỏ**

```ts
it('should return 403 when appending a turn to another user conversation', async () => { /* … */ });
it('should reject a turn payload with an unknown field', async () => { /* … */ });
it('should store the uploaded file under the conversation key prefix', async () => { /* … */ });
```

- [ ] **Step 2: DTO**

```ts
export class ConversationMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @ApiProperty({ maxLength: 100_000 })
  @IsString()
  @MaxLength(100_000)
  content!: string;

  @ApiPropertyOptional({ enum: ['failed', 'incomplete'] })
  @IsOptional()
  @IsIn(['failed', 'incomplete'])
  status?: 'failed' | 'incomplete';

  @ApiPropertyOptional({ type: [ConversationAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => ConversationAttachmentDto)
  attachments?: ConversationAttachmentDto[];
}
```

`content` cho 100 000 ký tự — rộng hơn trần 8000 của `AiChatMessageDto` bên `ai-service`, vì đây là **câu trả lời** của model chứ không phải câu hỏi, và câu trả lời chuẩn hoá cả trang có thể rất dài.

- [ ] **Step 3: Endpoint tải tệp**

Dùng `StorageService.putObject(key, body, contentType)` sẵn có. Khoá theo tiền tố (D4, đã sửa trong spec — repo này chỉ có **một** bucket):

```ts
const key = `ai-conversations/${conversationId}/${randomUUID()}`;
```

Kiểm quyền sở hữu hội thoại **trước khi** ghi object, nếu không người lạ đẩy được tệp vào bucket.

- [ ] **Step 4: Ráp module + đăng ký `app.module.ts` → chạy test**

Run: `npm run lint && npm run build && NODE_OPTIONS=--experimental-vm-modules npx jest`
Expected: PASS, `npx tsc --noEmit` sạch.

---

### Task 4: Job dọn 30 ngày

**Repo:** `/home/huytq/code/my/be/notion-service`

**Files:**
- Create: `src/modules/ai-conversations/ai-conversation-cleanup.service.ts`
- Create: `src/modules/ai-conversations/tests/ai-conversation-cleanup.service.spec.ts`
- Modify: `src/modules/ai-conversations/ai-conversation.module.ts`

**Interfaces:**
- Consumes: `PrismaService`, `StorageService`.
- Produces: `purgeExpired(): Promise<{ conversationsRemoved: number }>` — tách khỏi hàm `@Cron` để test gọi được thẳng, đúng cách `trash-cleanup.service.ts` đang làm.

- [ ] **Step 1: Viết test đỏ**

```ts
it('should delete storage objects before deleting the conversation row', async () => {
  const order: string[] = [];
  // … deleteObject đẩy 'storage', delete đẩy 'db' …
  await service.purgeExpired();
  expect(order).toEqual(['storage', 'db']);
});

it('should keep the conversation when deleting its storage object fails', async () => {
  // Xoá object hỏng -> BỎ QUA hội thoại đó, để lượt sau thử lại.
  // Xoá dòng trước là mất khoá vĩnh viễn, tệp mồ côi không ai tìm lại được.
});

it('should only remove conversations idle for more than 30 days', async () => { /* … */ });
it('should keep a conversation updated within the window', async () => { /* … */ });
```

- [ ] **Step 2: Chạy để thấy fail → hiện thực**

```ts
@Cron(CronExpression.EVERY_DAY_AT_3AM)
async runScheduledCleanup(): Promise<void> {
  await this.purgeExpired();
}
```

Chép khuôn `src/modules/pages/trash-cleanup.service.ts`. Thứ tự bắt buộc: gom `storageKey` → xoá object → xoá dòng (tin nhắn theo `onDelete: Cascade`).

- [ ] **Step 3: Chạy test**

Run: `npm run lint && npm run build && NODE_OPTIONS=--experimental-vm-modules npx jest` — Expected: PASS.

---

### Task 5: FE transport + hook

**Repo:** `/home/huytq/code/my/fe/vibe-chat-fe`

**Files:**
- Create: `src/services/notion-ai-history.api.ts`
- Modify: `src/services/keys.ts`
- Create: `src/features/notes/hooks/useNoteAiConversation.ts`
- Delete: `src/features/notes/hooks/useNoteAiSession.ts` và test của nó
- Create: `src/features/notes/hooks/useNoteAiConversation.test.tsx`

**Interfaces:**
- Consumes: 7 endpoint (Task 3); `AiSession`, `AiSessionActions`, `AiMessage` từ `@/features/ai`.
- Produces:

```ts
useNoteAiConversation(pageId: string): {
  conversations: ConversationSummary[];
  activeId: string | null;
  session: AiSession;
  actions: AiSessionActions;
  isLoading: boolean;
  isError: boolean;
  select: (id: string) => void;
  startNew: () => void;
}
```

Task 6 dùng.

- [ ] **Step 1: Viết test đỏ**

```tsx
it('nên tải danh sách hội thoại của trang khi mở tab', async () => { /* … */ });
it('nên tạo hội thoại mới rồi ghi lượt vào đúng nó khi chưa có hội thoại nào', async () => { /* … */ });
it('nên giữ nguyên identity của actions khi phiên đổi', () => { /* … */ });
it('nên đổi sang hội thoại rỗng khi đổi pageId', async () => { /* … */ });
```

- [ ] **Step 2: Chạy để thấy fail → hiện thực**

Ba ràng buộc bắt buộc, hai cái đầu là bài học đã trả giá ở giai đoạn trước:

1. **`actions` phải ổn định identity** giữa các lần render. Xem `useNoteAiSession.ts` hiện tại: `useMemo` deps rỗng, đọc state hiện tại qua `sessionRef` đồng bộ **trong `useEffect`**, không phải trong render (rule `react-hooks/refs` báo lỗi thật ở đó).

2. **Ba method trả về giá trị**: `dropLastAssistant` trả lịch sử còn lại, `prepareResend` trả mảng đã cắt, `removeMessage` trả message đã gỡ hoặc null. `useAiConversation` dựa vào chúng — trả sai là hỏng luồng gửi lại.

3. **Tạo hội thoại trễ (lazy).** Chưa gõ gì thì **không** tạo dòng trong DB. `pushMessage` đầu tiên mới `POST` tạo hội thoại rồi mới ghi lượt. Nếu tạo ngay lúc mở tab thì mỗi lần người dùng bấm vào tab AI rồi bỏ đi sẽ đẻ một hội thoại rỗng.

Transport ở `src/services/notion-ai-history.api.ts`, query key thêm vào `notionKeys` trong `services/keys.ts` (rule dự án: cấm `features/<x>/api/`).

- [ ] **Step 3: Chạy test**

Run: `npx tsc --noEmit && npx eslint src/features/notes src/services && npx vitest run`
Expected: PASS toàn bộ.

---

### Task 6: Thanh hội thoại + đặt tiêu đề bằng AI

**Repo:** `/home/huytq/code/my/fe/vibe-chat-fe`

**Files:**
- Create: `src/features/notes/components/panel/AiConversationBar.tsx`
- Modify: `src/features/notes/components/panel/AiTab.tsx`
- Create: `src/features/notes/components/panel/test/AiConversationBar.test.tsx`

**Interfaces:**
- Consumes: `useNoteAiConversation` (Task 5); `aiApi.chat` từ `@/services/ai.api`.

- [ ] **Step 1: Viết test đỏ**

```tsx
it('nên hiện tiêu đề hội thoại đang mở khi đã có tiêu đề', () => { /* … */ });
it('nên mở danh sách hội thoại nhóm theo Hôm nay và Cũ hơn khi bấm mũi tên', async () => { /* … */ });
it('nên tạo hội thoại mới khi bấm nút tin nhắn mới', async () => { /* … */ });
it('nên đặt tiêu đề bằng AI sau lượt đầu tiên khi hội thoại chưa có tiêu đề', async () => { /* … */ });
it('nên lùi về 40 ký tự đầu của câu hỏi khi gọi đặt tiêu đề thất bại', async () => { /* … */ });
```

- [ ] **Step 2: Hiện thực thanh**

Bố cục theo ảnh tham chiếu người dùng đưa: tiêu đề hội thoại hiện tại + `▾` mở danh sách (nhóm **Hôm nay** / **Cũ hơn** theo `updatedAt`), cạnh đó icon tin nhắn mới. **Không có ô tìm kiếm.**

Chưa có hội thoại thì hiện chữ mặc định — dùng đúng nhãn đang có trong dự án nếu tìm được, không tự chế chuỗi mới.

Panel chỉ rộng 340px: danh sách là **overlay đổ xuống**, không phải cột thường trực.

- [ ] **Step 3: Đặt tiêu đề bằng AI (D7)**

Sau khi lượt đầu tiên hoàn tất và hội thoại **chưa** có tiêu đề, gọi `aiApi.chat` (bản không stream, đã có sẵn — **không** thêm endpoint mới ở `ai-service`) với prompt ngắn yêu cầu đặt tiêu đề ≤6 từ, rồi `PATCH` lên.

Gọi hỏng thì lùi về 40 ký tự đầu của tin nhắn đầu — đúng hành vi chat hiện tại, **không** để hội thoại không tên.

Lượt gọi này **không được chặn giao diện**: người dùng đọc câu trả lời ngay, tiêu đề hiện sau.

- [ ] **Step 4: Chạy test**

Run: `npx tsc --noEmit && npx eslint src/features/notes && npx vitest run` — Expected: PASS.

---

### Task 7: Nút AI nổi khi bảng bên đóng

**Repo:** `/home/huytq/code/my/fe/vibe-chat-fe`

**Files:**
- Modify: `src/features/notes/components/NoteCanvas.tsx`
- Modify: `src/features/notes/components/NoteCanvas.test.tsx` *(tạo nếu chưa có)*

**Interfaces:**
- Consumes: `useNotesUiStore` — `isSidePanelOpen`, `setSidePanelOpen`, `setSidePanelTab`.

- [ ] **Step 1: Viết test đỏ**

```tsx
it('nên hiện nút AI nổi khi bảng bên đang đóng', () => { /* … */ });
it('nên ẩn nút AI nổi khi bảng bên đang mở', () => { /* … */ });
it('nên mở bảng bên ở tab AI khi bấm nút AI nổi', async () => { /* … */ });
```

- [ ] **Step 2: Hiện thực**

Nút nổi góc dưới phải khung soạn thảo, chỉ hiện khi `!isSidePanelOpen`. Bấm vào gọi **cả hai**: `setSidePanelTab('ai')` rồi `setSidePanelOpen(true)` — đặt tab trước để panel mở ra là đã ở đúng tab, không nháy qua tab cũ.

Dùng `Button` từ `@/components/ui/button/Button` với icon `lucide-react`, cùng bộ nét với các icon sẵn có. Phải có `aria-label` và `title`.

Tránh đè lên nội dung: đặt trong vùng `pb` sẵn có của canvas, và ẩn trên mobile nếu nó che ô soạn thảo — kiểm ở breakpoint hẹp nhất mà dự án hỗ trợ.

- [ ] **Step 3: Chạy toàn bộ**

Run: `npx tsc --noEmit && npx eslint src/features/notes && npx vitest run`
Expected: PASS toàn bộ suite.

---

## Kiểm tra liên thông sau Task 7

Bốn thứ phải khớp đôi một; lệch một chỗ là gãy lúc chạy thật mà test từng repo vẫn xanh:

- [ ] `AI_CONVERSATION_KEY` đã có trong `.env` của `notion-service`, đúng 64 ký tự hex. Thiếu là service không khởi động (cố ý).
- [ ] Migration `20260909000000_ai_conversation` đã chạy trên DB đang dùng.
- [ ] Đường dẫn FE gọi khớp controller: FE đi qua `/notion-proxy` (xem `resolveBase` trong `src/lib/api/client.ts`, nhánh `service === 'notion'`), nên transport phải truyền `service: 'notion'`.
- [ ] Tên trường body khớp DTO: `role`, `content`, `status`, `attachments`, `title`. Repo bật `forbidNonWhitelisted` — gửi dư field là 400.
