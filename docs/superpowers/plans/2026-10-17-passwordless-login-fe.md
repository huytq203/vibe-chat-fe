# Passwordless Login — FE web + Electron Implementation Plan (B/3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Màn đăng nhập Halo chỉ còn "Tiếp tục với Google" và "Gửi mã đăng nhập qua email"; app desktop đăng nhập qua trình duyệt hệ thống và quay lại bằng deep link `halo://`.

**Architecture:** `authApi` gọi các endpoint mới của authen-chat; mọi luồng trả `LoginOutcome` (`AUTHENTICATED` / `SIGNUP_REQUIRED` / `HANDOFF`) và một hook dùng chung áp phiên khi `AUTHENTICATED`. Trên web, `LoginFlow` điều phối 3 bước (email → mã → hoàn tất hồ sơ) cạnh nút Google (Google Identity Services, bọc trong `src/lib/google`). Trong Electron, main process sinh PKCE, mở `/login?client=desktop…` trên trình duyệt, nhận `halo://auth/callback` rồi renderer đổi mã lấy token.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Query v5, React Hook Form + Zod, Basuicn UI, Vitest + Testing Library, Electron 42 + electron-builder 26.

**Spec:** `../../be/authen-chat/docs/superpowers/specs/2026-10-17-self-hosted-auth-design.md` (§10, §11)

**Phụ thuộc:** Plan A (backend) đã deploy được ở môi trường dev; nhánh `release/0.2.0` (quản lý phiên bản desktop) đã merge vào `main` của repo này (Task 0).

## Global Constraints

- Không `any`, không `@ts-ignore`; component < 200 dòng, hook < 80 dòng, file < 300 dòng (luật FE `CLAUDE.md`).
- Mọi gọi API qua TanStack Query; transport ở `src/services/auth.api.ts`; query key ở `src/services/keys.ts`.
- Lib bên thứ ba (Google Identity Services) bọc trong `src/lib/google/`; feature không chạm `window.google`.
- UI dùng component Basuicn có sẵn (`Button`, `Input`, `Form`, `DatePicker`); không sửa tay `src/components/ui/`.
- Mã đăng nhập: đúng 6 chữ số; gửi lại sau **60 giây**.
- Username: `^[a-z0-9_.-]+$`, 3–50 ký tự; tên hiển thị 1–100; ngày sinh `yyyy-MM-dd`, ≥ 13 tuổi; số điện thoại **tuỳ chọn**, `^\+?\d{10,20}$` (giữ quy tắc cũ).
- Handoff: query `client=desktop`, `state` `^[A-Za-z0-9_-]{16,128}$`, `code_challenge` `^[A-Za-z0-9_-]{43}$`; deep link `halo://auth/callback?code&state`; chờ tối đa **5 phút**.
- Electron: `WEB_URL` mặc định `https://chat.krux.io.vn` (ghi đè bằng env `HALO_WEB_URL` khi chạy dev).
- Bản desktop phát hành: **0.3.0**.
- Thông báo người dùng bằng tiếng Việt; comment business tiếng Việt.

## Review Focus

- **Trình duyệt đã đăng nhập web sẵn mở `/login?client=desktop…`** phải hiện form đăng nhập chứ không tự chuyển vào `/chat` (nếu chuyển, desktop chờ mãi) → test ở Task 4.
- **Admin nhập mã email đúng** phải thấy hướng dẫn "dùng Google" rõ ràng, không phải lỗi chung → test ở Task 4.
- **Tài khoản đã xoá mềm đăng nhập bằng Google** phải mở `RestoreAccountDialog` giống luồng cũ → test ở Task 4.
- **Callback `halo://` đến khi không có phiên chờ hoặc sai `state`** (link cũ, link do trang khác mở) phải bị bỏ qua, không đăng nhập → test ở Task 6.
- **Thiếu `NEXT_PUBLIC_GOOGLE_CLIENT_ID`** không được làm vỡ trang login — ẩn nút Google, luồng email vẫn chạy → test ở Task 3.

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `src/services/auth.api.ts` | Transport endpoint mới, bỏ endpoint mật khẩu |
| `src/features/auth/types.ts` | `HandoffParams`, `LoginOutcome`, `LoginIdentity` |
| `src/features/auth/lib/handoff-params.ts` | Parse/validate query handoff (dùng cả server lẫn client) |
| `src/features/auth/lib/device-context.ts` | `deviceType`/`deviceName`/`handoff` gửi kèm mỗi request đăng nhập |
| `src/features/auth/hooks/use-login-mutations.ts` | Mutation mã email / Google / signup / handoff + áp phiên |
| `src/lib/google/identity.ts` | Nạp GIS, render nút Google |
| `src/features/auth/components/GoogleSignInButton.tsx` | Nút Google (ẩn khi chưa cấu hình) |
| `src/features/auth/components/login/EmailStep.tsx`, `CodeStep.tsx`, `CompleteProfileForm.tsx`, `HandoffDone.tsx`, `LoginFlow.tsx` | Các bước đăng nhập web |
| `src/features/auth/components/login/use-login-error.ts` | Map lỗi API → thông báo/RestoreAccountDialog |
| `src/features/auth/components/DesktopLoginPanel.tsx` | Màn login trong Electron |
| `src/features/settings/components/LoginMethodsSection.tsx` | Settings → phương thức đăng nhập |
| `electron/browser-login.js` | PKCE + điều phối 1 phiên đăng nhập trình duyệt (thuần, test được) |
| `electron/main.js`, `electron/preload.js`, `src/lib/electron/index.ts` | Deep link, single-instance, IPC |

Xoá: `src/features/auth/components/LoginForm.tsx` (+test), `RegisterForm.tsx` (+test), `VerifyEmailForm.tsx`, `ForgotPasswordForm.tsx`, `SocialLoginRow.tsx` (+test), `register/` (3 file); nội dung `src/app/(auth)/register|verify-email|forgot-password/page.tsx` thay bằng redirect.

---

### Task 0: Chuẩn bị nhánh

- [ ] **Step 1: Merge nhánh quản lý phiên bản rồi tạo nhánh làm việc**

```bash
git switch main
git merge --no-ff refs/heads/release/0.2.0
git switch -c feat/passwordless-login
```

Expected: merge không xung đột (nếu xung đột ở `package.json`/`package-lock.json`, giữ `version` cao hơn và cả 2 bộ thay đổi).

- [ ] **Step 2: Xác nhận nền xanh**

Run: `npm run typecheck && npm run lint && npm test`
Expected: PASS. Nếu typecheck đỏ do code không liên quan, dừng và báo — không bắt đầu Task 1 trên nền đỏ.

---

### Task 1: API, kiểu dữ liệu, tham số handoff

**Files:**
- Modify: `src/services/auth.api.ts`
- Modify: `src/services/keys.ts`
- Modify: `src/features/auth/types.ts`
- Create: `src/features/auth/lib/handoff-params.ts`
- Create: `src/features/auth/lib/device-context.ts`
- Test: `src/features/auth/lib/handoff-params.test.ts`, `src/features/auth/lib/device-context.test.ts`

**Interfaces:**
- Produces:
  - `type HandoffParams = { state: string; codeChallenge: string }`
  - `type LoginOutcome = { status: 'AUTHENTICATED'; tokens: AuthTokens; user: AuthUser } | { status: 'SIGNUP_REQUIRED'; signupTicket: string; prefill: { email: string; displayName: string } } | { status: 'HANDOFF'; redirectUrl: string }`
  - `type LoginIdentity = { provider: 'GOOGLE' | 'EMAIL'; email: string | null; createdAt: string; lastUsedAt: string | null }`
  - `type DeviceContext = { deviceType: DeviceType; deviceName?: string; handoff?: HandoffParams }`
  - `parseHandoffParams(search: Record<string, string | string[] | undefined>): HandoffParams | null`
  - `buildDeviceContext(handoff: HandoffParams | null): DeviceContext`
  - `authApi.requestLoginCode(email)`, `verifyLoginCode(input: { email; code } & DeviceContext)`, `loginWithGoogle(input: { idToken } & DeviceContext)`, `completeSignup(input: SignupRequest & DeviceContext)`, `exchangeHandoff(input: { code; codeVerifier; deviceName? })`, `checkUsername(username)`, `listIdentities()` — mỗi hàm trả `Promise` của kiểu tương ứng.
  - `type SignupRequest = { signupTicket: string; username: string; displayName: string; dateOfBirth: string; phone?: string }`
  - `authKeys.identities(): readonly ['auth', 'identities']`

- [ ] **Step 1: Test thất bại `src/features/auth/lib/handoff-params.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { parseHandoffParams } from './handoff-params';

const STATE = 'abcdefghijklmnop';
const CHALLENGE = 'A'.repeat(43);

describe('parseHandoffParams', () => {
  it('trả tham số khi client=desktop và state/code_challenge hợp lệ', () => {
    expect(parseHandoffParams({ client: 'desktop', state: STATE, code_challenge: CHALLENGE })).toEqual({
      state: STATE,
      codeChallenge: CHALLENGE,
    });
  });

  it('trả null khi không phải chế độ desktop', () => {
    expect(parseHandoffParams({ state: STATE, code_challenge: CHALLENGE })).toBeNull();
  });

  it('trả null khi state/code_challenge sai định dạng hoặc bị lặp', () => {
    expect(parseHandoffParams({ client: 'desktop', state: 'short', code_challenge: CHALLENGE })).toBeNull();
    expect(parseHandoffParams({ client: 'desktop', state: STATE, code_challenge: 'x' })).toBeNull();
    expect(parseHandoffParams({ client: 'desktop', state: [STATE, STATE], code_challenge: CHALLENGE })).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy, xác nhận fail** — `npx vitest run src/features/auth/lib/handoff-params.test.ts` → FAIL.

- [ ] **Step 3: Viết `src/features/auth/lib/handoff-params.ts`**

```ts
import { z } from 'zod';
import type { HandoffParams } from '@/features/auth/types';

const handoffSchema = z.object({
  client: z.literal('desktop'),
  state: z.string().regex(/^[A-Za-z0-9_-]{16,128}$/),
  code_challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});

/**
 * Trang /login được app desktop mở trong trình duyệt hệ thống với
 * `?client=desktop&state=…&code_challenge=…`. Sai bất kỳ tham số nào → coi như web thường.
 */
export function parseHandoffParams(
  search: Record<string, string | string[] | undefined>,
): HandoffParams | null {
  const parsed = handoffSchema.safeParse(search);
  if (!parsed.success) return null;
  return { state: parsed.data.state, codeChallenge: parsed.data.code_challenge };
}
```

- [ ] **Step 4: Thêm kiểu vào `src/features/auth/types.ts`** (cuối file; xoá `RegisterResult`)

```ts
/** Tham số chuyển giao đăng nhập về app desktop (PKCE). */
export type HandoffParams = {
  state: string;
  codeChallenge: string;
};

/** Kết quả chung của mọi luồng đăng nhập (mã email / Google / signup / handoff). */
export type LoginOutcome =
  | { status: 'AUTHENTICATED'; tokens: AuthTokens; user: AuthUser }
  | { status: 'SIGNUP_REQUIRED'; signupTicket: string; prefill: { email: string; displayName: string } }
  | { status: 'HANDOFF'; redirectUrl: string };

export type LoginIdentity = {
  provider: 'GOOGLE' | 'EMAIL';
  email: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};
```

- [ ] **Step 5: Test thất bại `src/features/auth/lib/device-context.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { buildDeviceContext } from './device-context';

vi.mock('@/lib/device/device-info', () => ({
  getDeviceType: () => 'WEB',
  getDeviceName: () => 'Chrome trên Windows',
}));

describe('buildDeviceContext', () => {
  it('dùng loại/tên thiết bị hiện tại khi đăng nhập thường', () => {
    expect(buildDeviceContext(null)).toEqual({ deviceType: 'WEB', deviceName: 'Chrome trên Windows' });
  });

  it('khai báo DESKTOP kèm handoff khi trang được app desktop mở (phiên tạo ở bước đổi mã)', () => {
    const handoff = { state: 's'.repeat(16), codeChallenge: 'c'.repeat(43) };
    expect(buildDeviceContext(handoff)).toEqual({ deviceType: 'DESKTOP', handoff });
  });
});
```

- [ ] **Step 6: Viết `src/features/auth/lib/device-context.ts`**

```ts
import { getDeviceName, getDeviceType, type DeviceType } from '@/lib/device/device-info';
import type { HandoffParams } from '@/features/auth/types';

export type DeviceContext = {
  deviceType: DeviceType;
  deviceName?: string;
  handoff?: HandoffParams;
};

/**
 * Trình duyệt mở từ app desktop không tạo phiên WEB: BE chỉ trả mã chuyển giao,
 * phiên DESKTOP (kèm tên máy) được tạo khi app đổi mã.
 */
export function buildDeviceContext(handoff: HandoffParams | null): DeviceContext {
  if (handoff) return { deviceType: 'DESKTOP', handoff };
  const deviceName = getDeviceName();
  return { deviceType: getDeviceType(), ...(deviceName ? { deviceName } : {}) };
}
```

- [ ] **Step 7: Sửa `src/services/auth.api.ts`**

Xoá `login`, `register`, `verifyEmail`, `resendOtp`, `forgotPassword`, `resetPassword` và import không dùng (`LoginInput`, `RegisterInput`, `RegisterResult`, `VerifyEmailInput`, `DeviceType`). Thêm vào đầu object `authApi`:

```ts
  // ── Đăng nhập không mật khẩu ───────────────────────────────────────────
  // BE luôn trả 202 cho mọi email (không lộ email nào đã đăng ký).
  requestLoginCode: (email: string) =>
    apiClient.post<{ message: string }>('/api/v1/auth/email/request-code', {
      auth: false,
      body: { email },
    }),
  verifyLoginCode: (input: { email: string; code: string } & DeviceContext) =>
    apiClient.post<LoginOutcome>('/api/v1/auth/email/verify', { auth: false, body: input }),
  loginWithGoogle: (input: { idToken: string } & DeviceContext) =>
    apiClient.post<LoginOutcome>('/api/v1/auth/google', { auth: false, body: input }),
  completeSignup: (input: SignupRequest & DeviceContext) =>
    apiClient.post<LoginOutcome>('/api/v1/auth/signup', { auth: false, body: input }),
  exchangeHandoff: (input: { code: string; codeVerifier: string; deviceName?: string }) =>
    apiClient.post<LoginOutcome>('/api/v1/auth/handoff/exchange', { auth: false, body: input }),
  checkUsername: (username: string) =>
    apiClient.get<{ available: boolean }>(
      `/api/v1/auth/username-available?username=${encodeURIComponent(username)}`,
      { auth: false },
    ),
  listIdentities: () => apiClient.get<LoginIdentity[]>('/api/v1/auth/identities'),
```

Thêm import + kiểu:

```ts
import type { AuthSession, AuthTokens, AuthUser, LoginIdentity, LoginOutcome, UpdateMeInput } from '@/features/auth';
import type { DeviceContext } from '@/features/auth/lib/device-context';

export type SignupRequest = {
  signupTicket: string;
  username: string;
  displayName: string;
  dateOfBirth: string;
  phone?: string;
};
```

(Nếu `AuthSession` không còn được dùng trong file, bỏ khỏi import.) Kiểm `apiClient.get` có nhận option `{ auth: false }` (xem `RequestOptions` ở `src/lib/api/client.ts:41-43`) — có.

Trong `src/features/auth/index.ts`: export thêm `HandoffParams`, `LoginOutcome`, `LoginIdentity` trong dòng `export type { … } from './types'`; bỏ `RegisterResult`.

- [ ] **Step 8: `src/services/keys.ts`** — sửa `authKeys`:

```ts
export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
  identities: () => [...authKeys.all, 'identities'] as const,
} as const;
```

- [ ] **Step 9: Chạy test** — `npx vitest run src/features/auth/lib` → 5 PASS. (`npm run typecheck` còn lỗi ở các component cũ dùng `authApi.login` — sửa ở Task 4–5.)

- [ ] **Step 10: Commit**

```bash
git add src/services src/features/auth/types.ts src/features/auth/index.ts src/features/auth/lib
git commit -m "feat(auth): API đăng nhập mã email/Google/signup/handoff và tham số handoff"
```

---

### Task 2: Mutation dùng chung + áp phiên

**Files:**
- Create: `src/features/auth/hooks/use-login-mutations.ts`
- Modify: `src/features/auth/hooks/use-mutations.ts` (xoá `useLogin`, `useRegister`, `useVerifyEmail`, `useResendOtp`, `useForgotPassword`, `useResetPassword`)
- Modify: `src/features/auth/index.ts`
- Test: `src/features/auth/hooks/use-login-mutations.test.tsx`

**Interfaces:**
- Consumes: `authApi.*` (Task 1), `buildDeviceContext` (Task 1), `useAuthStore.setSession/setUser` (sẵn có).
- Produces: `useRequestLoginCode()`, `useVerifyLoginCode()`, `useGoogleLogin()`, `useCompleteSignup()`, `useExchangeHandoff()` — đều là `UseMutationResult<…>`; 3 hook đăng nhập nhận biến `{ …payload, handoff: HandoffParams | null }`; `useExchangeHandoff` nhận `{ code; codeVerifier }`.

- [ ] **Step 1: Test thất bại `src/features/auth/hooks/use-login-mutations.test.tsx`**

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useGoogleLogin, useVerifyLoginCode } from './use-login-mutations';

const api = vi.hoisted(() => ({
  verifyLoginCode: vi.fn(),
  loginWithGoogle: vi.fn(),
  fetchMe: vi.fn(),
}));
vi.mock('@/services/auth.api', () => ({ authApi: api }));
vi.mock('@/lib/device/device-info', () => ({ getDeviceType: () => 'WEB', getDeviceName: () => 'Chrome' }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const authenticated = {
  status: 'AUTHENTICATED' as const,
  tokens: { accessToken: 'jwt', refreshToken: '', expiresIn: 900, tokenType: 'Bearer' },
  user: { id: 'kc-1', username: 'huytq' },
};

describe('use-login-mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.fetchMe.mockResolvedValue(authenticated.user);
    useAuthStore.getState().clear();
  });

  it('áp phiên khi AUTHENTICATED và gửi kèm thiết bị hiện tại', async () => {
    api.verifyLoginCode.mockResolvedValue(authenticated);
    const { result } = renderHook(() => useVerifyLoginCode(), { wrapper });

    await act(() => result.current.mutateAsync({ email: 'a@b.com', code: '123456', handoff: null }));

    expect(api.verifyLoginCode).toHaveBeenCalledWith({ email: 'a@b.com', code: '123456', deviceType: 'WEB', deviceName: 'Chrome' });
    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));
  });

  it('không áp phiên khi SIGNUP_REQUIRED hoặc HANDOFF', async () => {
    api.loginWithGoogle.mockResolvedValue({ status: 'HANDOFF', redirectUrl: 'halo://auth/callback?code=c&state=s' });
    const { result } = renderHook(() => useGoogleLogin(), { wrapper });
    const handoff = { state: 's'.repeat(16), codeChallenge: 'c'.repeat(43) };

    const outcome = await act(() => result.current.mutateAsync({ idToken: 't'.repeat(30), handoff }));

    expect(outcome.status).toBe('HANDOFF');
    expect(api.loginWithGoogle).toHaveBeenCalledWith({ idToken: 't'.repeat(30), deviceType: 'DESKTOP', handoff });
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
```

(Fixture `user` thiếu field so với `AuthUser`: nếu typecheck test báo lỗi, khai báo `user` qua hàm `buildAuthUser()` trong `src/test/` nếu đã có, hoặc ép kiểu `as AuthUser` kèm comment "fixture tối thiểu".)

- [ ] **Step 2: Viết `src/features/auth/hooks/use-login-mutations.ts`**

```ts
'use client';

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, type SignupRequest } from '@/services/auth.api';
import { authKeys } from '@/services/keys';
import { getDeviceName } from '@/lib/device/device-info';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { buildDeviceContext } from '@/features/auth/lib/device-context';
import type { HandoffParams, LoginOutcome } from '@/features/auth/types';

type WithHandoff<T> = T & { handoff: HandoffParams | null };

/** AUTHENTICATED → lưu phiên + đồng bộ hồ sơ đầy đủ từ chat-service (best-effort). */
function useApplyOutcome(): (outcome: LoginOutcome) => void {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  return useCallback(
    (outcome: LoginOutcome) => {
      if (outcome.status !== 'AUTHENTICATED') return;
      queryClient.clear();
      setSession(outcome.user, outcome.tokens);
      void authApi
        .fetchMe()
        .then((user) => {
          queryClient.setQueryData(authKeys.me(), user);
          useAuthStore.getState().setUser(user);
        })
        .catch(() => undefined);
    },
    [queryClient, setSession],
  );
}

export function useRequestLoginCode() {
  return useMutation({ mutationFn: (email: string) => authApi.requestLoginCode(email) });
}

export function useVerifyLoginCode() {
  const apply = useApplyOutcome();
  return useMutation({
    mutationFn: ({ handoff, ...input }: WithHandoff<{ email: string; code: string }>) =>
      authApi.verifyLoginCode({ ...input, ...buildDeviceContext(handoff) }),
    onSuccess: apply,
  });
}

export function useGoogleLogin() {
  const apply = useApplyOutcome();
  return useMutation({
    mutationFn: ({ handoff, ...input }: WithHandoff<{ idToken: string }>) =>
      authApi.loginWithGoogle({ ...input, ...buildDeviceContext(handoff) }),
    onSuccess: apply,
  });
}

export function useCompleteSignup() {
  const apply = useApplyOutcome();
  return useMutation({
    mutationFn: ({ handoff, ...input }: WithHandoff<SignupRequest>) =>
      authApi.completeSignup({ ...input, ...buildDeviceContext(handoff) }),
    onSuccess: apply,
  });
}

/** App desktop đổi mã chuyển giao lấy token — phiên DESKTOP mang tên máy này. */
export function useExchangeHandoff() {
  const apply = useApplyOutcome();
  return useMutation({
    mutationFn: (input: { code: string; codeVerifier: string }) =>
      authApi.exchangeHandoff({ ...input, deviceName: getDeviceName() }),
    onSuccess: apply,
  });
}
```

- [ ] **Step 3: Dọn `use-mutations.ts` + `index.ts`**

Trong `use-mutations.ts` xoá 6 hook mật khẩu và import không còn dùng (`getDeviceName`, `getDeviceType`, `LoginInput`, `RegisterInput`, `VerifyEmailInput`). Trong `index.ts`: bỏ `useLogin, useRegister, useVerifyEmail, useResendOtp, useForgotPassword, useResetPassword`, thêm

```ts
export {
  useRequestLoginCode,
  useVerifyLoginCode,
  useGoogleLogin,
  useCompleteSignup,
  useExchangeHandoff,
} from './hooks/use-login-mutations';
```

- [ ] **Step 4: Chạy test** — `npx vitest run src/features/auth/hooks` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/hooks src/features/auth/index.ts
git commit -m "feat(auth): mutation đăng nhập không mật khẩu, áp phiên dùng chung"
```

---

### Task 3: Google Identity Services

**Files:**
- Create: `src/lib/google/identity.ts`
- Create: `src/features/auth/components/GoogleSignInButton.tsx`
- Modify: `src/config/env.ts` (thêm `NEXT_PUBLIC_GOOGLE_CLIENT_ID`)
- Modify: `next.config.ts` (CSP)
- Test: `src/lib/google/identity.test.ts`, `src/features/auth/components/GoogleSignInButton.test.tsx`

**Interfaces:**
- Produces: `loadGoogleIdentity(): Promise<GoogleAccountsId>`; `renderGoogleButton(el: HTMLElement, opts: { clientId: string; width: number; onCredential: (credential: string) => void }): Promise<void>`; `<GoogleSignInButton onCredential={(idToken: string) => void} disabled?: boolean />` (render `null` khi chưa cấu hình client id).

- [ ] **Step 1: Test thất bại `src/lib/google/identity.test.ts`**

```ts
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
```

- [ ] **Step 2: Viết `src/lib/google/identity.ts`**

```ts
/**
 * Wrapper Google Identity Services — feature code KHÔNG chạm `window.google`.
 * Script chỉ nạp khi trang login cần (không vào bundle chung).
 */
const GIS_SRC = 'https://accounts.google.com/gsi/client';

type CredentialResponse = { credential: string };

type GsiButtonOptions = {
  type: 'standard';
  theme: 'outline';
  size: 'large';
  text: 'continue_with';
  shape: 'pill';
  width: number;
  locale: string;
};

export interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    ux_mode: 'popup';
    use_fedcm_for_button?: boolean;
  }): void;
  renderButton(el: HTMLElement, options: GsiButtonOptions): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

let loading: Promise<GoogleAccountsId> | null = null;

export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  if (typeof window === 'undefined') return Promise.reject(new Error('GIS chỉ chạy ở trình duyệt'));
  const ready = window.google?.accounts.id;
  if (ready) return Promise.resolve(ready);
  loading ??= new Promise<GoogleAccountsId>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const id = window.google?.accounts.id;
      if (id) resolve(id);
      else reject(new Error('Không tải được Google Sign-In'));
    };
    script.onerror = () => {
      loading = null; // cho phép thử lại (mạng chập chờn / adblock)
      reject(new Error('Không tải được Google Sign-In'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export async function renderGoogleButton(
  el: HTMLElement,
  opts: { clientId: string; width: number; onCredential: (credential: string) => void },
): Promise<void> {
  const id = await loadGoogleIdentity();
  id.initialize({
    client_id: opts.clientId,
    callback: (response) => opts.onCredential(response.credential),
    ux_mode: 'popup',
    use_fedcm_for_button: true,
  });
  id.renderButton(el, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'pill',
    width: opts.width,
    locale: 'vi',
  });
}
```

- [ ] **Step 3: Env + CSP**

`src/config/env.ts`: thêm vào `schema` (cạnh nhóm Firebase) và object parse:

```ts
  // OAuth client id (web) — thiếu thì ẩn nút Google, đăng nhập bằng mã email vẫn chạy.
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().min(1).optional(),
```

```ts
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || undefined,
```

`next.config.ts` trong `buildContentSecurityPolicy()`: thêm `https://accounts.google.com` vào `script-src`, `style-src`, `frame-src`, `connect-src` (nối thêm vào chuỗi sẵn có, ví dụ `"script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://www.gstatic.com https://accounts.google.com"`).

- [ ] **Step 4: Test thất bại `src/features/auth/components/GoogleSignInButton.test.tsx`**

```tsx
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
```

- [ ] **Step 5: Viết `src/features/auth/components/GoogleSignInButton.tsx`**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { env } from '@/config/env';
import { renderGoogleButton } from '@/lib/google/identity';

const BUTTON_WIDTH = 320;

type GoogleSignInButtonProps = {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
};

/** Nút "Tiếp tục với Google" chính thức của Google (bắt buộc theo điều khoản thương hiệu). */
export function GoogleSignInButton({ onCredential, disabled = false }: GoogleSignInButtonProps) {
  const clientId = env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const [failed, setFailed] = useState(false);
  callbackRef.current = onCredential;

  useEffect(() => {
    const el = containerRef.current;
    if (!clientId || !el) return;
    renderGoogleButton(el, {
      clientId,
      width: BUTTON_WIDTH,
      onCredential: (token) => callbackRef.current(token),
    }).catch(() => setFailed(true));
  }, [clientId]);

  if (!clientId) return null;
  if (failed) {
    return <p className="text-center text-sm text-muted-foreground">Không tải được đăng nhập Google, hãy dùng mã email.</p>;
  }
  return (
    <div
      ref={containerRef}
      aria-disabled={disabled}
      className={disabled ? 'pointer-events-none flex justify-center opacity-60' : 'flex justify-center'}
    />
  );
}
```

- [ ] **Step 6: Chạy test** — `npx vitest run src/lib/google src/features/auth/components/GoogleSignInButton.test.tsx` → PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/google src/features/auth/components/GoogleSignInButton.tsx src/features/auth/components/GoogleSignInButton.test.tsx src/config/env.ts next.config.ts
git commit -m "feat(auth): nút đăng nhập Google (Google Identity Services)"
```

---

### Task 4: Luồng đăng nhập web (email → mã → hồ sơ, handoff)

**Files:**
- Create: `src/features/auth/schemas.ts` (sửa — thêm schema mới, bỏ schema mật khẩu)
- Create: `src/features/auth/components/login/EmailStep.tsx`, `CodeStep.tsx`, `CompleteProfileForm.tsx`, `HandoffDone.tsx`, `use-login-error.ts`, `LoginFlow.tsx`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/features/auth/index.ts`
- Test: `src/features/auth/components/login/LoginFlow.test.tsx`, `src/features/auth/components/login/CompleteProfileForm.test.tsx`

**Interfaces:**
- Consumes: hook Task 2, `GoogleSignInButton` (Task 3), `parseHandoffParams` (Task 1), `RestoreAccountDialog` (sẵn có: props `open`, `onOpenChange`, `restoreToken`, `maskedEmail`).
- Produces: `<LoginFlow handoff={HandoffParams | null} />`; `requestCodeSchema`, `verifyCodeSchema`, `completeProfileSchema`, `type CompleteProfileInput`.

- [ ] **Step 1: Sửa `src/features/auth/schemas.ts`**

Xoá `loginSchema`, `registerSchema`, `registerFormSchema`, `RegisterFormInput`, `verifyEmailSchema`, `resendOtpSchema`, `LoginInput`, `RegisterInput`, `VerifyEmailInput`, `ResendOtpInput`. Giữ `isAtLeast13`, `updateMeSchema`, `UpdateMeInput`. Thêm:

```ts
export const requestCodeSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email không hợp lệ'),
});

export const verifyCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Mã gồm đúng 6 chữ số'),
});

export const completeProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Tên đăng nhập 3–50 ký tự')
    .max(50, 'Tên đăng nhập 3–50 ký tự')
    .regex(/^[a-z0-9_.-]+$/, 'Chỉ chữ thường, số, _ . -'),
  displayName: z.string().trim().min(1, 'Tên hiển thị không được để trống').max(100),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Chọn ngày sinh')
    .refine(isAtLeast13, 'Bạn phải đủ 13 tuổi'),
  // Tuỳ chọn: chuỗi rỗng = không nhập.
  phone: z
    .string()
    .trim()
    .regex(/^(\+?\d{10,20})?$/, 'Số điện thoại 10–20 chữ số (cho phép + đầu)'),
});

export type RequestCodeInput = z.infer<typeof requestCodeSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
```

`index.ts`: dòng export schema đổi thành `export { requestCodeSchema, verifyCodeSchema, completeProfileSchema, updateMeSchema } from './schemas';` và kiểu tương ứng.

- [ ] **Step 2: Viết `src/features/auth/components/login/use-login-error.ts`**

```ts
'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';

export type RestoreInfo = { restoreToken: string; maskedEmail: string | null };

// Mã lỗi cần thông điệp riêng thay vì message chung từ BE.
const MESSAGES: Record<string, string> = {
  AUTH_ADMIN_GOOGLE_REQUIRED: 'Tài khoản quản trị chỉ đăng nhập bằng Google. Hãy dùng nút "Tiếp tục với Google".',
  AUTH_GOOGLE_EMAIL_UNVERIFIED: 'Email Google của bạn chưa được xác minh.',
  AUTH_SIGNUP_TICKET_INVALID: 'Phiên đăng ký đã hết hạn, vui lòng nhập lại email.',
};

/** Map lỗi đăng nhập → toast / mở luồng khôi phục tài khoản. */
export function useLoginError(): {
  restoreInfo: RestoreInfo | null;
  clearRestore: () => void;
  handleError: (error: unknown) => void;
} {
  const [restoreInfo, setRestoreInfo] = useState<RestoreInfo | null>(null);

  const handleError = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.code === 'AUTH_ACCOUNT_DELETED') {
      const details = error.details as { restoreToken?: string; email?: string | null } | undefined;
      if (details?.restoreToken) {
        setRestoreInfo({ restoreToken: details.restoreToken, maskedEmail: details.email ?? null });
        return;
      }
    }
    if (error instanceof ApiError) {
      toast.error(MESSAGES[error.code] ?? error.message);
      return;
    }
    toast.error('Không thể đăng nhập. Thử lại sau.');
  }, []);

  return { restoreInfo, clearRestore: () => setRestoreInfo(null), handleError };
}
```

- [ ] **Step 3: Viết `src/features/auth/components/login/EmailStep.tsx`**

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button/Button';
import { Form, FormField } from '@/components/ui/form/Form';
import { Input } from '@/components/ui/input/Input';
import { requestCodeSchema, type RequestCodeInput } from '@/features/auth/schemas';

const FIELD_CLASS =
  'h-[50px] rounded-full border-border bg-input px-5 text-foreground placeholder:text-muted-foreground focus:border-primary';

type EmailStepProps = {
  defaultEmail: string;
  isPending: boolean;
  onSubmit: (email: string) => void;
};

export function EmailStep({ defaultEmail, isPending, onSubmit }: EmailStepProps) {
  const form = useForm<RequestCodeInput>({
    resolver: zodResolver(requestCodeSchema),
    defaultValues: { email: defaultEmail },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(({ email }) => onSubmit(email))} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-sm text-foreground">
                Email
              </label>
              <Input
                id="login-email"
                type="email"
                inputMode="email"
                placeholder="ban@gmail.com"
                autoComplete="email"
                error={fieldState.error?.message}
                className={FIELD_CLASS}
                {...field}
              />
            </div>
          )}
        />
        <Button type="submit" className="h-[50px] w-full rounded-full text-base font-bold" isLoading={isPending}>
          Gửi mã đăng nhập
        </Button>
      </form>
    </Form>
  );
}
```

- [ ] **Step 4: Viết `src/features/auth/components/login/CodeStep.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button/Button';
import { Form, FormField } from '@/components/ui/form/Form';
import { Input } from '@/components/ui/input/Input';
import { verifyCodeSchema, type VerifyCodeInput } from '@/features/auth/schemas';

const RESEND_COOLDOWN_SECONDS = 60;

type CodeStepProps = {
  email: string;
  isVerifying: boolean;
  isResending: boolean;
  onVerify: (code: string) => void;
  onResend: () => Promise<void>;
  onChangeEmail: () => void;
};

export function CodeStep({ email, isVerifying, isResending, onVerify, onResend, onChangeEmail }: CodeStepProps) {
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const form = useForm<VerifyCodeInput>({ resolver: zodResolver(verifyCodeSchema), defaultValues: { code: '' } });

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  const resend = async (): Promise<void> => {
    await onResend();
    setSecondsLeft(RESEND_COOLDOWN_SECONDS);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(({ code }) => onVerify(code))} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Đã gửi mã 6 số tới <span className="font-semibold text-foreground">{email}</span>.
        </p>
        <FormField
          control={form.control}
          name="code"
          render={({ field, fieldState }) => (
            <div className="space-y-1.5">
              <label htmlFor="login-code" className="text-sm text-foreground">
                Mã đăng nhập
              </label>
              <Input
                id="login-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                error={fieldState.error?.message}
                className="h-[50px] rounded-full px-5 text-center text-xl tracking-[0.5em]"
                {...field}
                onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>
          )}
        />
        <Button type="submit" className="h-[50px] w-full rounded-full text-base font-bold" isLoading={isVerifying}>
          Đăng nhập
        </Button>
        <div className="flex items-center justify-between text-sm">
          <Button type="button" variant="link" className="h-auto p-0" onClick={onChangeEmail}>
            Đổi email
          </Button>
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            disabled={secondsLeft > 0}
            isLoading={isResending}
            onClick={() => void resend()}
          >
            {secondsLeft > 0 ? `Gửi lại sau ${secondsLeft}s` : 'Gửi lại mã'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

- [ ] **Step 5: Test thất bại `src/features/auth/components/login/CompleteProfileForm.test.tsx`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompleteProfileForm } from './CompleteProfileForm';

vi.mock('@/services/auth.api', () => ({
  authApi: { checkUsername: vi.fn().mockResolvedValue({ available: true }) },
}));

describe('CompleteProfileForm', () => {
  it('điền sẵn tên hiển thị và báo lỗi khi thiếu username/ngày sinh', async () => {
    const onSubmit = vi.fn();
    render(<CompleteProfileForm prefill={{ email: 'a@b.com', displayName: 'Huy' }} isPending={false} onSubmit={onSubmit} />);

    expect(screen.getByLabelText('Tên hiển thị')).toHaveValue('Huy');
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn tất' }));

    expect(await screen.findByText('Tên đăng nhập 3–50 ký tự')).toBeInTheDocument();
    expect(screen.getByText('Chọn ngày sinh')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Viết `src/features/auth/components/login/CompleteProfileForm.tsx`**

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button/Button';
import { DatePicker } from '@/components/ui/datepicker/DatePicker';
import { Form, FormField } from '@/components/ui/form/Form';
import { Input } from '@/components/ui/input/Input';
import { completeProfileSchema, type CompleteProfileInput } from '@/features/auth/schemas';

const THIS_YEAR = new Date().getFullYear();
const FIELD_CLASS = 'h-[50px] rounded-full px-5';

type CompleteProfileFormProps = {
  prefill: { email: string; displayName: string };
  isPending: boolean;
  onSubmit: (input: CompleteProfileInput) => void;
};

/** Email/Google đã xác minh nhưng chưa có tài khoản → hoàn tất hồ sơ tối thiểu. */
export function CompleteProfileForm({ prefill, isPending, onSubmit }: CompleteProfileFormProps) {
  const form = useForm<CompleteProfileInput>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: { username: '', displayName: prefill.displayName, dateOfBirth: '', phone: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Tạo tài khoản cho <span className="font-semibold text-foreground">{prefill.email}</span>
        </p>
        <FormField
          control={form.control}
          name="username"
          render={({ field, fieldState }) => (
            <div className="space-y-1.5">
              <label htmlFor="signup-username" className="text-sm">Tên đăng nhập</label>
              <Input id="signup-username" autoComplete="username" placeholder="huytq" error={fieldState.error?.message} className={FIELD_CLASS} {...field} />
            </div>
          )}
        />
        <FormField
          control={form.control}
          name="displayName"
          render={({ field, fieldState }) => (
            <div className="space-y-1.5">
              <label htmlFor="signup-display-name" className="text-sm">Tên hiển thị</label>
              <Input id="signup-display-name" autoComplete="name" error={fieldState.error?.message} className={FIELD_CLASS} {...field} />
            </div>
          )}
        />
        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field, fieldState }) => (
            <DatePicker
              editable
              captionLayout="dropdown"
              label="Ngày sinh"
              placeholder="dd/mm/yyyy"
              error={fieldState.error?.message}
              fromYear={THIS_YEAR - 100}
              toYear={THIS_YEAR - 13}
              disableFutureDates
              presets={false}
              value={field.value ? new Date(`${field.value}T00:00:00`) : undefined}
              onChange={(d) => field.onChange(d instanceof Date ? format(d, 'yyyy-MM-dd') : '')}
            />
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field, fieldState }) => (
            <div className="space-y-1.5">
              <label htmlFor="signup-phone" className="text-sm">Số điện thoại (tuỳ chọn)</label>
              <Input id="signup-phone" inputMode="tel" autoComplete="tel" error={fieldState.error?.message} className={FIELD_CLASS} {...field} />
            </div>
          )}
        />
        <Button type="submit" className="h-[50px] w-full rounded-full text-base font-bold" isLoading={isPending}>
          Hoàn tất
        </Button>
      </form>
    </Form>
  );
}
```

(Trước khi chạy, mở `src/components/ui/datepicker/DatePicker.tsx` xác nhận các prop `editable`, `captionLayout`, `fromYear`, `toYear`, `disableFutureDates`, `presets` vẫn tồn tại — chúng đang được `register/steps.tsx` dùng. Nếu prop nào đã bị đổi tên trong commit UI mới nhất, dùng đúng tên hiện hành.)

- [ ] **Step 7: Viết `src/features/auth/components/login/HandoffDone.tsx`**

```tsx
'use client';

import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';

/** Trình duyệt đã xác thực xong — trả quyền về app desktop qua deep link halo://. */
export function HandoffDone({ redirectUrl }: { redirectUrl: string }) {
  useEffect(() => {
    window.location.assign(redirectUrl);
  }, [redirectUrl]);

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <CheckCircle2 className="size-12 text-success" aria-hidden="true" />
      <h2 className="text-xl font-bold text-foreground">Đã xác thực</h2>
      <p className="text-sm text-muted-foreground">
        Quay lại ứng dụng Halo để tiếp tục. Bạn có thể đóng tab này.
      </p>
      <Button variant="outline" onClick={() => window.location.assign(redirectUrl)}>
        Mở ứng dụng Halo
      </Button>
    </div>
  );
}
```

- [ ] **Step 8: Test thất bại `src/features/auth/components/login/LoginFlow.test.tsx`**

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/lib/api/client';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/features/auth/components/GoogleSignInButton', () => ({
  GoogleSignInButton: ({ onCredential }: { onCredential: (t: string) => void }) => (
    <button type="button" onClick={() => onCredential('google-id-token')}>Google</button>
  ),
}));
vi.mock('@/features/auth/components/RestoreAccountDialog', () => ({
  RestoreAccountDialog: ({ restoreToken }: { restoreToken: string }) => <div>restore:{restoreToken}</div>,
}));

const m = vi.hoisted(() => ({
  requestCode: vi.fn(),
  verify: vi.fn(),
  google: vi.fn(),
  signup: vi.fn(),
}));
vi.mock('@/features/auth/hooks/use-login-mutations', () => ({
  useRequestLoginCode: () => ({ mutateAsync: m.requestCode, isPending: false }),
  useVerifyLoginCode: () => ({ mutateAsync: m.verify, isPending: false }),
  useGoogleLogin: () => ({ mutateAsync: m.google, isPending: false }),
  useCompleteSignup: () => ({ mutateAsync: m.signup, isPending: false }),
}));

import { toast } from 'sonner';
import { LoginFlow } from './LoginFlow';

async function submitEmailAndCode(): Promise<void> {
  await userEvent.type(screen.getByLabelText('Email'), 'Huy@Gmail.com');
  await userEvent.click(screen.getByRole('button', { name: 'Gửi mã đăng nhập' }));
  await userEvent.type(await screen.findByLabelText('Mã đăng nhập'), '123456');
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
}

describe('LoginFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.requestCode.mockResolvedValue({ message: 'ok' });
  });

  it('email → mã → vào /chat khi AUTHENTICATED (email đã chuẩn hoá)', async () => {
    m.verify.mockResolvedValue({ status: 'AUTHENTICATED' });
    render(<LoginFlow handoff={null} />);

    await submitEmailAndCode();

    expect(m.requestCode).toHaveBeenCalledWith('huy@gmail.com');
    expect(m.verify).toHaveBeenCalledWith({ email: 'huy@gmail.com', code: '123456', handoff: null });
    expect(push).toHaveBeenCalledWith('/chat');
  });

  it('chuyển sang hoàn tất hồ sơ khi SIGNUP_REQUIRED', async () => {
    m.verify.mockResolvedValue({ status: 'SIGNUP_REQUIRED', signupTicket: 't', prefill: { email: 'huy@gmail.com', displayName: 'huy' } });
    render(<LoginFlow handoff={null} />);

    await submitEmailAndCode();

    expect(await screen.findByRole('button', { name: 'Hoàn tất' })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('hiện hướng dẫn dùng Google khi admin nhập mã email', async () => {
    m.verify.mockRejectedValue(new ApiError(403, 'AUTH_ADMIN_GOOGLE_REQUIRED', 'x'));
    render(<LoginFlow handoff={null} />);

    await submitEmailAndCode();

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('chỉ đăng nhập bằng Google'));
  });

  it('mở luồng khôi phục khi Google trả AUTH_ACCOUNT_DELETED', async () => {
    m.google.mockRejectedValue(new ApiError(403, 'AUTH_ACCOUNT_DELETED', 'x', { restoreToken: 'r-1', email: 'h**@gmail.com' }));
    render(<LoginFlow handoff={null} />);

    await userEvent.click(screen.getByRole('button', { name: 'Google' }));

    expect(await screen.findByText('restore:r-1')).toBeInTheDocument();
  });

  it('gửi handoff và hiện màn quay lại app khi HANDOFF', async () => {
    const handoff = { state: 's'.repeat(16), codeChallenge: 'c'.repeat(43) };
    m.google.mockResolvedValue({ status: 'HANDOFF', redirectUrl: 'halo://auth/callback?code=c&state=s' });
    const assign = vi.fn();
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, assign } });
    render(<LoginFlow handoff={handoff} />);

    await userEvent.click(screen.getByRole('button', { name: 'Google' }));

    expect(m.google).toHaveBeenCalledWith({ idToken: 'google-id-token', handoff });
    expect(await screen.findByText('Đã xác thực')).toBeInTheDocument();
    expect(assign).toHaveBeenCalledWith('halo://auth/callback?code=c&state=s');
  });
});
```

- [ ] **Step 9: Viết `src/features/auth/components/login/LoginFlow.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator/Separator';
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton';
import { RestoreAccountDialog } from '@/features/auth/components/RestoreAccountDialog';
import {
  useCompleteSignup,
  useGoogleLogin,
  useRequestLoginCode,
  useVerifyLoginCode,
} from '@/features/auth/hooks/use-login-mutations';
import type { CompleteProfileInput } from '@/features/auth/schemas';
import type { HandoffParams, LoginOutcome } from '@/features/auth/types';
import { CodeStep } from './CodeStep';
import { CompleteProfileForm } from './CompleteProfileForm';
import { EmailStep } from './EmailStep';
import { HandoffDone } from './HandoffDone';
import { useLoginError } from './use-login-error';

type Step =
  | { kind: 'email' }
  | { kind: 'code'; email: string }
  | { kind: 'profile'; signupTicket: string; prefill: { email: string; displayName: string } }
  | { kind: 'handoff'; redirectUrl: string };

/** Đăng nhập web: Google hoặc mã email; email mới → hoàn tất hồ sơ; desktop → trả về app. */
export function LoginFlow({ handoff }: { handoff: HandoffParams | null }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: 'email' });
  const [lastEmail, setLastEmail] = useState('');
  const requestCode = useRequestLoginCode();
  const verify = useVerifyLoginCode();
  const google = useGoogleLogin();
  const signup = useCompleteSignup();
  const { restoreInfo, clearRestore, handleError } = useLoginError();

  const follow = (outcome: LoginOutcome): void => {
    if (outcome.status === 'AUTHENTICATED') router.push('/chat');
    else if (outcome.status === 'HANDOFF') setStep({ kind: 'handoff', redirectUrl: outcome.redirectUrl });
    else setStep({ kind: 'profile', signupTicket: outcome.signupTicket, prefill: outcome.prefill });
  };

  const run = async (action: () => Promise<LoginOutcome>): Promise<void> => {
    try {
      follow(await action());
    } catch (error) {
      handleError(error);
    }
  };

  const sendCode = async (email: string): Promise<void> => {
    try {
      await requestCode.mutateAsync(email);
      setLastEmail(email);
      setStep({ kind: 'code', email });
    } catch (error) {
      handleError(error);
    }
  };

  const submitProfile = (signupTicket: string, input: CompleteProfileInput): Promise<void> =>
    run(() =>
      signup.mutateAsync({
        signupTicket,
        username: input.username,
        displayName: input.displayName,
        dateOfBirth: input.dateOfBirth,
        ...(input.phone ? { phone: input.phone } : {}),
        handoff,
      }),
    );

  if (step.kind === 'handoff') return <HandoffDone redirectUrl={step.redirectUrl} />;

  return (
    <div className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-500">
      <p className="text-2xl font-bold text-primary">Halo</p>
      <h1 className="mt-1 text-[32px] font-bold leading-tight text-foreground lg:text-[38px]">
        {step.kind === 'profile' ? 'Hoàn tất hồ sơ' : 'Đăng nhập'}
      </h1>
      {handoff && <p className="mt-2 text-sm text-muted-foreground">Đăng nhập cho ứng dụng Halo trên máy tính.</p>}

      <div className="mt-8 space-y-6">
        {step.kind === 'email' && (
          <>
            <GoogleSignInButton
              disabled={google.isPending}
              onCredential={(idToken) => void run(() => google.mutateAsync({ idToken, handoff }))}
            />
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">hoặc nhận mã qua email</span>
              <Separator className="flex-1" />
            </div>
            <EmailStep defaultEmail={lastEmail} isPending={requestCode.isPending} onSubmit={(email) => void sendCode(email)} />
          </>
        )}
        {step.kind === 'code' && (
          <CodeStep
            email={step.email}
            isVerifying={verify.isPending}
            isResending={requestCode.isPending}
            onVerify={(code) => void run(() => verify.mutateAsync({ email: step.email, code, handoff }))}
            onResend={() => sendCode(step.email)}
            onChangeEmail={() => setStep({ kind: 'email' })}
          />
        )}
        {step.kind === 'profile' && (
          <CompleteProfileForm
            prefill={step.prefill}
            isPending={signup.isPending}
            onSubmit={(input) => void submitProfile(step.signupTicket, input)}
          />
        )}
      </div>

      {restoreInfo && (
        <RestoreAccountDialog
          open
          onOpenChange={(open) => {
            if (!open) clearRestore();
          }}
          restoreToken={restoreInfo.restoreToken}
          maskedEmail={restoreInfo.maskedEmail}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 10: Trang `/login` — không tự chuyển vào app ở chế độ desktop**

`src/app/(auth)/login/page.tsx`:

```tsx
import { AuthBootstrap } from '@/features/auth';
import { LoginEntry } from '@/features/auth/components/LoginEntry';
import { parseHandoffParams } from '@/features/auth/lib/handoff-params';
import { LoginPageShell } from './_components/LoginPageShell';

export const metadata = { title: 'Đăng nhập · Halo' };

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const handoff = parseHandoffParams(await searchParams);
  return (
    <>
      {/* Trình duyệt mở từ app desktop có thể đã đăng nhập web sẵn — vẫn phải hiện
          form để cấp mã chuyển giao, không được tự vào /chat. */}
      <AuthBootstrap redirectIfAuthed={handoff ? undefined : '/chat'} />
      <LoginPageShell>
        <LoginEntry handoff={handoff} />
      </LoginPageShell>
    </>
  );
}
```

`src/features/auth/components/LoginEntry.tsx` (Task 6 thêm nhánh Electron; tạm thời):

```tsx
'use client';

import type { HandoffParams } from '@/features/auth/types';
import { LoginFlow } from './login/LoginFlow';

export function LoginEntry({ handoff }: { handoff: HandoffParams | null }) {
  return <LoginFlow handoff={handoff} />;
}
```

Thêm test vào `src/app/(auth)/login/_components/LoginPageShell.test.tsx`? Không — thêm file `src/features/auth/lib/handoff-params.test.ts` đã phủ parse; thêm test trang:

`src/app/(auth)/login/page.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

const bootstrap = vi.hoisted(() => vi.fn(() => null));
vi.mock('@/features/auth', () => ({ AuthBootstrap: bootstrap }));
vi.mock('@/features/auth/components/LoginEntry', () => ({ LoginEntry: () => null }));
vi.mock('./_components/LoginPageShell', () => ({ LoginPageShell: ({ children }: { children: React.ReactNode }) => children }));

import LoginPage from './page';

describe('LoginPage', () => {
  it('không tự chuyển vào /chat khi trang được app desktop mở', async () => {
    render(await LoginPage({ searchParams: Promise.resolve({ client: 'desktop', state: 's'.repeat(16), code_challenge: 'c'.repeat(43) }) }));
    expect(bootstrap).toHaveBeenCalledWith(expect.objectContaining({ redirectIfAuthed: undefined }), undefined);
  });

  it('chuyển vào /chat khi đã đăng nhập ở web thường', async () => {
    render(await LoginPage({ searchParams: Promise.resolve({}) }));
    expect(bootstrap).toHaveBeenLastCalledWith(expect.objectContaining({ redirectIfAuthed: '/chat' }), undefined);
  });
});
```

- [ ] **Step 11: Chạy test** — `npx vitest run src/features/auth src/app/\(auth\)/login` → PASS.

- [ ] **Step 12: Commit**

```bash
git add src/features/auth src/app/\(auth\)/login
git commit -m "feat(auth): màn đăng nhập Google + mã email, hoàn tất hồ sơ, chuyển giao desktop"
```

---

### Task 5: Gỡ màn mật khẩu cũ + Settings phương thức đăng nhập

**Files:**
- Delete: `src/features/auth/components/LoginForm.tsx`, `LoginForm.test.tsx`, `RegisterForm.tsx`, `RegisterForm.test.tsx`, `VerifyEmailForm.tsx`, `ForgotPasswordForm.tsx`, `SocialLoginRow.tsx`, `SocialLoginRow.test.tsx`, `register/PasswordStrength.tsx`, `register/StepProgress.tsx`, `register/steps.tsx`
- Modify: `src/app/(auth)/register/page.tsx`, `src/app/(auth)/verify-email/page.tsx`, `src/app/(auth)/forgot-password/page.tsx`
- Modify: `src/features/auth/index.ts`
- Create: `src/features/auth/hooks/use-identities.ts`, `src/features/settings/components/LoginMethodsSection.tsx`
- Modify: `src/features/settings/components/tabs/GeneralTab.tsx`, `GeneralTab.test.tsx`
- Test: `src/features/settings/components/LoginMethodsSection.test.tsx`

**Interfaces:**
- Consumes: `authApi.listIdentities` (Task 1), `authKeys.identities` (Task 1).
- Produces: `useIdentities(): UseQueryResult<LoginIdentity[]>`; `<LoginMethodsSection />`.

- [ ] **Step 1: Xoá component cũ, đổi trang cũ thành redirect**

```bash
git rm src/features/auth/components/LoginForm.tsx src/features/auth/components/LoginForm.test.tsx \
  src/features/auth/components/RegisterForm.tsx src/features/auth/components/RegisterForm.test.tsx \
  src/features/auth/components/VerifyEmailForm.tsx src/features/auth/components/ForgotPasswordForm.tsx \
  src/features/auth/components/SocialLoginRow.tsx src/features/auth/components/SocialLoginRow.test.tsx \
  src/features/auth/components/register/PasswordStrength.tsx src/features/auth/components/register/StepProgress.tsx \
  src/features/auth/components/register/steps.tsx
```

Nội dung mới cho **cả 3** file `src/app/(auth)/register/page.tsx`, `verify-email/page.tsx`, `forgot-password/page.tsx`:

```tsx
import { redirect } from 'next/navigation';

// Halo đã bỏ mật khẩu: đăng ký/xác thực email/quên mật khẩu gộp vào /login.
export default function LegacyAuthPage(): never {
  redirect('/login');
}
```

`index.ts`: bỏ export `LoginForm`, `RegisterForm`, `VerifyEmailForm`, `ForgotPasswordForm`; thêm `export { LoginFlow } from './components/login/LoginFlow';`.

Run: `grep -rnE "LoginForm|RegisterForm|VerifyEmailForm|ForgotPasswordForm|SocialLoginRow|loginSchema|registerSchema|useLogin\b" src`
Expected: không có kết quả (sửa chỗ còn sót, ví dụ comment trong `BrandIcons.tsx` nhắc `SocialLoginRow` → đổi thành "nút Google").

- [ ] **Step 2: Test thất bại `src/features/settings/components/LoginMethodsSection.test.tsx`**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';

const listIdentities = vi.hoisted(() => vi.fn());
vi.mock('@/services/auth.api', () => ({ authApi: { listIdentities } }));

import { LoginMethodsSection } from './LoginMethodsSection';

describe('LoginMethodsSection', () => {
  it('liệt kê phương thức đăng nhập đã gắn', async () => {
    listIdentities.mockResolvedValue([
      { provider: 'GOOGLE', email: 'huy@gmail.com', createdAt: '2026-10-17T00:00:00Z', lastUsedAt: null },
      { provider: 'EMAIL', email: 'huy@gmail.com', createdAt: '2026-10-17T00:00:00Z', lastUsedAt: null },
    ]);

    renderWithProviders(<LoginMethodsSection />);

    expect(await screen.findByText('Google')).toBeInTheDocument();
    expect(screen.getByText('Mã qua email')).toBeInTheDocument();
  });

  it('báo lỗi khi không tải được', async () => {
    listIdentities.mockRejectedValue(new Error('x'));

    renderWithProviders(<LoginMethodsSection />);

    expect(await screen.findByText('Không tải được phương thức đăng nhập.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Viết hook + component**

`src/features/auth/hooks/use-identities.ts`:

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/services/auth.api';
import { authKeys } from '@/services/keys';

export function useIdentities() {
  return useQuery({ queryKey: authKeys.identities(), queryFn: () => authApi.listIdentities() });
}
```

Export trong `index.ts`: `export { useIdentities } from './hooks/use-identities';`

`src/features/settings/components/LoginMethodsSection.tsx`:

```tsx
'use client';

import { Mail } from 'lucide-react';
import { GoogleColorIcon } from '@/components/common/BrandIcons';
import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useIdentities } from '@/features/auth';
import { SettingsSection } from './SettingsSection';

const LABELS = { GOOGLE: 'Google', EMAIL: 'Mã qua email' } as const;

/** Halo không dùng mật khẩu — hiển thị các cách user có thể đăng nhập. */
export function LoginMethodsSection() {
  const { data, isPending, isError } = useIdentities();

  return (
    <SettingsSection title="Phương thức đăng nhập" desc="Halo không dùng mật khẩu.">
      {isPending && <Skeleton className="h-14 w-full rounded-lg" />}
      {isError && <p className="text-[13px] text-danger">Không tải được phương thức đăng nhập.</p>}
      {data?.length === 0 && <p className="text-[13px] text-muted-foreground">Chưa có phương thức nào.</p>}
      {data && data.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {data.map((identity) => (
            <li key={identity.provider} className="flex items-center gap-3 px-3 py-2.5">
              {identity.provider === 'GOOGLE' ? (
                <GoogleColorIcon className="h-5 w-5" />
              ) : (
                <Mail className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-foreground">{LABELS[identity.provider]}</p>
                <p className="truncate text-[12px] text-muted-foreground">{identity.email}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SettingsSection>
  );
}
```

(Nếu `src/components/ui/skeleton/Skeleton.tsx` export tên khác, dùng đúng tên trong file.)

`GeneralTab.tsx`: import `LoginMethodsSection` và render ngay sau `</SettingsSection>` của "Phiên đăng nhập" (trước `<AppVersionSection />`). `GeneralTab.test.tsx`: thêm `vi.mock('@/features/settings/components/LoginMethodsSection', () => ({ LoginMethodsSection: () => null }));` cạnh mock `AppVersionSection`.

- [ ] **Step 4: Chạy kiểm tra web**

Run: `npx vitest run src/features/settings src/features/auth && npm run typecheck && npm run lint`
Expected: PASS, typecheck sạch.

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "refactor(auth): gỡ đăng ký/mật khẩu cũ, Settings hiển thị phương thức đăng nhập"
```

---

### Task 6: Electron — đăng nhập qua trình duyệt hệ thống

**Files:**
- Create: `electron/browser-login.js`
- Modify: `electron/main.js`, `electron/preload.js`
- Modify: `src/lib/electron/index.ts`
- Create: `src/features/auth/components/DesktopLoginPanel.tsx`
- Modify: `src/features/auth/components/LoginEntry.tsx`
- Modify: `package.json` (`build.files`, `build.protocols`, `version`), `CHANGELOG.md`
- Test: `src/test/electron/browser-login.test.ts`, `src/features/auth/components/DesktopLoginPanel.test.tsx`

**Interfaces:**
- Consumes: `useExchangeHandoff` (Task 2).
- Produces (main process, CommonJS): `createPkcePair(): { verifier, challenge, state }`; `buildLoginUrl(webUrl, pkce): string`; `parseCallback(rawUrl): { code, state } | null`; `findDeepLink(argv: string[]): string | null`; `createBrowserLoginCoordinator({ openExternal, webUrl, timeoutMs? }): { start(): Promise<{ code, codeVerifier }>, handleCallback(rawUrl): boolean, cancel(): void }`. Renderer: `startElectronBrowserLogin(): Promise<{ code: string; codeVerifier: string }>`, `cancelElectronBrowserLogin(): void`, `canUseBrowserLogin(): boolean`.

- [ ] **Step 1: Test thất bại `src/test/electron/browser-login.test.ts`**

```ts
// @vitest-environment node
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import browserLogin from '../../../electron/browser-login.js';

const { buildLoginUrl, createBrowserLoginCoordinator, createPkcePair, findDeepLink, parseCallback } = browserLogin;

describe('electron browser-login', () => {
  afterEach(() => vi.useRealTimers());

  it('sinh PKCE S256 đúng chuẩn và URL login chế độ desktop', () => {
    const pkce = createPkcePair();
    expect(pkce.verifier).toMatch(/^[A-Za-z0-9_-]{64}$/);
    expect(pkce.challenge).toBe(createHash('sha256').update(pkce.verifier).digest('base64url'));

    const url = new URL(buildLoginUrl('https://chat.krux.io.vn', pkce));
    expect(url.pathname).toBe('/login');
    expect(Object.fromEntries(url.searchParams)).toEqual({ client: 'desktop', state: pkce.state, code_challenge: pkce.challenge });
  });

  it('chỉ chấp nhận đúng halo://auth/callback có code và state', () => {
    expect(parseCallback('halo://auth/callback?code=c&state=s')).toEqual({ code: 'c', state: 's' });
    expect(parseCallback('halo://other/callback?code=c&state=s')).toBeNull();
    expect(parseCallback('https://evil.test/callback?code=c&state=s')).toBeNull();
    expect(parseCallback('halo://auth/callback?code=c')).toBeNull();
    expect(findDeepLink(['/opt/halo', '--flag', 'halo://auth/callback?code=c&state=s'])).toBe('halo://auth/callback?code=c&state=s');
  });

  it('trả code + verifier khi callback khớp state đang chờ', async () => {
    const openExternal = vi.fn().mockResolvedValue(undefined);
    const coordinator = createBrowserLoginCoordinator({ openExternal, webUrl: 'https://chat.krux.io.vn' });

    const pending = coordinator.start();
    const state = new URL(openExternal.mock.calls[0][0]).searchParams.get('state');

    expect(coordinator.handleCallback(`halo://auth/callback?code=abc&state=${state}`)).toBe(true);
    const result = await pending;
    expect(result.code).toBe('abc');
    expect(result.codeVerifier).toMatch(/^[A-Za-z0-9_-]{64}$/);
  });

  it('bỏ qua callback sai state hoặc khi không có phiên chờ', () => {
    const coordinator = createBrowserLoginCoordinator({ openExternal: vi.fn().mockResolvedValue(undefined), webUrl: 'https://x.test' });

    expect(coordinator.handleCallback('halo://auth/callback?code=a&state=nope')).toBe(false);
    void coordinator.start().catch(() => undefined);
    expect(coordinator.handleCallback('halo://auth/callback?code=a&state=wrong')).toBe(false);
  });

  it('hết hạn sau 5 phút và cho phép huỷ', async () => {
    vi.useFakeTimers();
    const coordinator = createBrowserLoginCoordinator({ openExternal: vi.fn().mockResolvedValue(undefined), webUrl: 'https://x.test' });

    const timedOut = coordinator.start();
    vi.advanceTimersByTime(5 * 60 * 1000);
    await expect(timedOut).rejects.toThrow('timeout');

    const cancelled = coordinator.start();
    coordinator.cancel();
    await expect(cancelled).rejects.toThrow('cancelled');
  });
});
```

Nếu TypeScript báo thiếu khai báo kiểu cho `../../../electron/browser-login.js`, tạo `electron/browser-login.d.ts`:

```ts
export interface PkcePair { verifier: string; challenge: string; state: string }
export interface BrowserLoginResult { code: string; codeVerifier: string }
export interface BrowserLoginCoordinator {
  start(): Promise<BrowserLoginResult>;
  handleCallback(rawUrl: string): boolean;
  cancel(): void;
}
declare const browserLogin: {
  createPkcePair(): PkcePair;
  buildLoginUrl(webUrl: string, pkce: PkcePair): string;
  parseCallback(rawUrl: string): { code: string; state: string } | null;
  findDeepLink(argv: string[]): string | null;
  createBrowserLoginCoordinator(opts: {
    openExternal: (url: string) => Promise<void>;
    webUrl: string;
    timeoutMs?: number;
  }): BrowserLoginCoordinator;
};
export default browserLogin;
```

- [ ] **Step 2: Viết `electron/browser-login.js`**

```js
'use strict';

const crypto = require('crypto');

const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

/** PKCE (RFC 7636) + state chống CSRF. Verifier không bao giờ rời main process trước bước đổi mã. */
function createPkcePair() {
  const verifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const state = crypto.randomBytes(24).toString('base64url');
  return { verifier, challenge, state };
}

function buildLoginUrl(webUrl, pkce) {
  const url = new URL('/login', webUrl);
  url.searchParams.set('client', 'desktop');
  url.searchParams.set('state', pkce.state);
  url.searchParams.set('code_challenge', pkce.challenge);
  return url.toString();
}

function parseCallback(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'halo:' || url.host !== 'auth' || url.pathname !== '/callback') return null;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  return code && state ? { code, state } : null;
}

/** Windows/Linux: deep link đến dưới dạng 1 phần tử argv của instance thứ hai. */
function findDeepLink(argv) {
  return argv.find((arg) => typeof arg === 'string' && arg.startsWith('halo://')) ?? null;
}

/** Giữ tối đa 1 phiên đăng nhập trình duyệt đang chờ; phiên mới thay phiên cũ. */
function createBrowserLoginCoordinator({ openExternal, webUrl, timeoutMs = LOGIN_TIMEOUT_MS }) {
  let pending = null;

  function settle() {
    const current = pending;
    if (current) clearTimeout(current.timer);
    pending = null;
    return current;
  }

  function start() {
    const previous = settle();
    if (previous) previous.reject(new Error('superseded'));
    const pkce = createPkcePair();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending = null;
        reject(new Error('timeout'));
      }, timeoutMs);
      pending = { pkce, resolve, reject, timer };
      Promise.resolve(openExternal(buildLoginUrl(webUrl, pkce))).catch((err) => {
        settle();
        reject(err);
      });
    });
  }

  function handleCallback(rawUrl) {
    const callback = parseCallback(rawUrl);
    if (!callback || !pending || callback.state !== pending.pkce.state) return false;
    const current = settle();
    current.resolve({ code: callback.code, codeVerifier: current.pkce.verifier });
    return true;
  }

  function cancel() {
    const current = settle();
    if (current) current.reject(new Error('cancelled'));
  }

  return { start, handleCallback, cancel };
}

module.exports = { createPkcePair, buildLoginUrl, parseCallback, findDeepLink, createBrowserLoginCoordinator };
```

- [ ] **Step 3: Chạy test** — `npx vitest run src/test/electron` → 5 PASS.

- [ ] **Step 4: Tích hợp vào `electron/main.js`**

Thêm sau các `require` đầu file:

```js
const { createBrowserLoginCoordinator, findDeepLink } = require('./browser-login');

// Trang /login của bản web dùng cho luồng đăng nhập qua trình duyệt hệ thống.
const WEB_URL = process.env.HALO_WEB_URL || 'https://chat.krux.io.vn';
const DEEP_LINK_PROTOCOL = 'halo';

const browserLogin = createBrowserLoginCoordinator({
  openExternal: (url) => shell.openExternal(url),
  webUrl: WEB_URL,
});

// Deep link mở instance thứ hai → chuyển URL cho instance đang chạy rồi thoát.
const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();

function focusMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function registerDeepLinkProtocol() {
  // Chạy dev (`electron .`) phải truyền đường dẫn script để OS gọi đúng app.
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(DEEP_LINK_PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  } else {
    app.setAsDefaultProtocolClient(DEEP_LINK_PROTOCOL);
  }
}

app.on('second-instance', (_event, argv) => {
  const link = findDeepLink(argv);
  if (link && !browserLogin.handleCallback(link)) {
    console.warn('[electron] bỏ qua deep link không khớp phiên đăng nhập đang chờ');
  }
  focusMainWindow();
});

// macOS gửi deep link qua open-url thay vì argv.
app.on('open-url', (event, url) => {
  event.preventDefault();
  browserLogin.handleCallback(url);
  focusMainWindow();
});
```

Trong `registerIpc()` thêm:

```js
  ipcMain.handle('auth:start-browser-login', () => browserLogin.start());
  ipcMain.handle('auth:cancel-browser-login', () => browserLogin.cancel());
```

Trong handler `notif.on('click', …)` thay thân hàm bằng `focusMainWindow();`.

Trong `app.whenReady().then(() => { … })` thêm ở đầu callback:

```js
  if (!hasSingleInstanceLock) return;
  registerDeepLinkProtocol();
```

- [ ] **Step 5: `electron/preload.js`** — thêm vào object `electronAPI`:

```js
  // Đăng nhập qua trình duyệt hệ thống (PKCE ở main process). Trả { code, codeVerifier }.
  startBrowserLogin: () => ipcRenderer.invoke('auth:start-browser-login'),
  cancelBrowserLogin: () => ipcRenderer.invoke('auth:cancel-browser-login'),
```

- [ ] **Step 6: `src/lib/electron/index.ts`** — thêm vào `type ElectronApi`:

```ts
  startBrowserLogin?: () => Promise<{ code: string; codeVerifier: string }>;
  cancelBrowserLogin?: () => Promise<void>;
```

và cuối file:

```ts
/** App desktop có hỗ trợ đăng nhập qua trình duyệt (bản ≥ 0.3.0). */
export function canUseBrowserLogin(): boolean {
  return typeof getApi()?.startBrowserLogin === 'function';
}

/** Mở trình duyệt hệ thống để đăng nhập; resolve khi app nhận deep link halo:// hợp lệ. */
export function startElectronBrowserLogin(): Promise<{ code: string; codeVerifier: string }> {
  const start = getApi()?.startBrowserLogin;
  if (!start) return Promise.reject(new Error('Ứng dụng không hỗ trợ đăng nhập qua trình duyệt'));
  return start();
}

export function cancelElectronBrowserLogin(): void {
  void getApi()?.cancelBrowserLogin?.();
}
```

- [ ] **Step 7: Test thất bại `src/features/auth/components/DesktopLoginPanel.test.tsx`**

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
const electron = vi.hoisted(() => ({ startElectronBrowserLogin: vi.fn(), cancelElectronBrowserLogin: vi.fn() }));
vi.mock('@/lib/electron', () => electron);
const exchange = vi.hoisted(() => vi.fn());
vi.mock('@/features/auth/hooks/use-login-mutations', () => ({
  useExchangeHandoff: () => ({ mutateAsync: exchange, isPending: false }),
}));

import { toast } from 'sonner';
import { DesktopLoginPanel } from './DesktopLoginPanel';

describe('DesktopLoginPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('đổi mã nhận từ trình duyệt rồi vào /chat', async () => {
    electron.startElectronBrowserLogin.mockResolvedValue({ code: 'c', codeVerifier: 'v' });
    exchange.mockResolvedValue({ status: 'AUTHENTICATED' });
    render(<DesktopLoginPanel />);

    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập bằng trình duyệt' }));

    expect(exchange).toHaveBeenCalledWith({ code: 'c', codeVerifier: 'v' });
    expect(push).toHaveBeenCalledWith('/chat');
  });

  it('không báo lỗi khi người dùng tự huỷ', async () => {
    electron.startElectronBrowserLogin.mockRejectedValue(new Error("Error invoking remote method 'auth:start-browser-login': Error: cancelled"));
    render(<DesktopLoginPanel />);

    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập bằng trình duyệt' }));

    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Đăng nhập bằng trình duyệt' })).toBeInTheDocument();
  });

  it('báo hết thời gian chờ', async () => {
    electron.startElectronBrowserLogin.mockRejectedValue(new Error('Error: timeout'));
    render(<DesktopLoginPanel />);

    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập bằng trình duyệt' }));

    expect(toast.error).toHaveBeenCalledWith('Quá thời gian chờ đăng nhập, vui lòng thử lại');
  });
});
```

- [ ] **Step 8: Viết `src/features/auth/components/DesktopLoginPanel.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button/Button';
import { useExchangeHandoff } from '@/features/auth/hooks/use-login-mutations';
import { cancelElectronBrowserLogin, startElectronBrowserLogin } from '@/lib/electron';

// Lỗi IPC đến dạng "Error invoking remote method …: Error: <lý do>".
const reasonOf = (error: unknown): string => (error instanceof Error ? error.message : '');

/**
 * Google chặn đăng nhập trong cửa sổ Electron → app mở trình duyệt hệ thống,
 * người dùng đăng nhập ở trang web rồi được đưa lại app qua halo://.
 */
export function DesktopLoginPanel() {
  const router = useRouter();
  const exchange = useExchangeHandoff();
  const [waiting, setWaiting] = useState(false);

  const start = async (): Promise<void> => {
    setWaiting(true);
    try {
      const { code, codeVerifier } = await startElectronBrowserLogin();
      const outcome = await exchange.mutateAsync({ code, codeVerifier });
      if (outcome.status === 'AUTHENTICATED') router.push('/chat');
    } catch (error) {
      const reason = reasonOf(error);
      if (reason.endsWith('cancelled') || reason.endsWith('superseded')) return;
      toast.error(reason.endsWith('timeout') ? 'Quá thời gian chờ đăng nhập, vui lòng thử lại' : 'Đăng nhập không thành công, vui lòng thử lại');
    } finally {
      setWaiting(false);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-6">
      <div>
        <p className="text-2xl font-bold text-primary">Halo</p>
        <h1 className="mt-1 text-[32px] font-bold leading-tight text-foreground">Đăng nhập</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Halo sẽ mở trình duyệt để bạn đăng nhập bằng Google hoặc mã email, rồi tự quay lại ứng dụng.
        </p>
      </div>
      {waiting ? (
        <div className="space-y-3">
          <p className="text-sm text-foreground">Đang chờ bạn đăng nhập trên trình duyệt…</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void start()}>Mở lại trình duyệt</Button>
            <Button variant="ghost" onClick={cancelElectronBrowserLogin}>Huỷ</Button>
          </div>
        </div>
      ) : (
        <Button className="h-[50px] w-full rounded-full text-base font-bold" onClick={() => void start()} isLoading={exchange.isPending}>
          <Globe className="size-5" aria-hidden="true" />
          Đăng nhập bằng trình duyệt
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 9: `LoginEntry.tsx` chọn nhánh Electron**

```tsx
'use client';

import { useState } from 'react';
import { canUseBrowserLogin } from '@/lib/electron';
import type { HandoffParams } from '@/features/auth/types';
import { DesktopLoginPanel } from './DesktopLoginPanel';
import { LoginFlow } from './login/LoginFlow';

export function LoginEntry({ handoff }: { handoff: HandoffParams | null }) {
  // Đọc 1 lần ở client — preload không đổi trong vòng đời trang.
  const [isDesktop] = useState(canUseBrowserLogin);
  return isDesktop ? <DesktopLoginPanel /> : <LoginFlow handoff={handoff} />;
}
```

- [ ] **Step 10: `package.json` + CHANGELOG**

`build.files`: thêm `"electron/browser-login.js"` sau `"electron/url-guard.js"`. Thêm vào `build` (cùng cấp `appId`):

```json
"protocols": [{ "name": "Halo", "schemes": ["halo"] }],
```

Run: `npm run release:minor` → version `0.3.0`.

`CHANGELOG.md` thêm trên mục 0.2.0:

```markdown
## [0.3.0] — <ngày phát hành>

### Thay đổi
- Đăng nhập không mật khẩu: Google hoặc mã 6 số gửi qua email; email mới hoàn tất hồ sơ ngay sau khi xác thực.
- App desktop đăng nhập qua trình duyệt hệ thống, quay lại app bằng liên kết `halo://`.
- Bỏ đăng ký bằng mật khẩu, xác thực email riêng và quên mật khẩu.

### Bắt buộc
- Bản desktop < 0.3.0 không đăng nhập được với máy chủ mới — đặt `DESKTOP_MIN_VERSION=0.3.0` khi phát hành.
```

- [ ] **Step 11: Kiểm tra toàn bộ**

Run: `npm run typecheck && npm run lint && npm test`
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add electron src package.json package-lock.json CHANGELOG.md
git commit -m "feat(desktop): đăng nhập qua trình duyệt hệ thống với deep link halo:// (PKCE)"
```

---

### Task 7: Kiểm tra thủ công và build

- [ ] **Step 1: Web dev** — với backend Plan A chạy local, `.env.local` có `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (client web, Authorized JavaScript origins gồm `http://localhost:3000` và `https://chat.krux.io.vn`):

```bash
npm run dev
```

Kiểm tay: (1) mã email → vào `/chat`; (2) email mới → hoàn tất hồ sơ → vào `/chat`; (3) Google → vào `/chat`; (4) mở `/login?client=desktop&state=aaaaaaaaaaaaaaaa&code_challenge=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA` khi đã đăng nhập → vẫn thấy form, đăng nhập xong hiện "Đã xác thực"; (5) `/register` → về `/login`; (6) Settings → Chung → "Phương thức đăng nhập".

- [ ] **Step 2: Desktop dev** — trỏ app về web local:

```bash
HALO_WEB_URL=http://localhost:3000 npm run electron:dev
```

Bấm "Đăng nhập bằng trình duyệt" → trình duyệt mở `/login?client=desktop…` → đăng nhập → trình duyệt hỏi mở Halo → app vào `/chat`; Settings → Thiết bị hiển thị phiên **Ứng dụng máy tính**.

- [ ] **Step 3: Build bộ cài** (shell profile đang export `NODE_ENV=development` — phải ghi đè):

```bash
NODE_ENV=production NEXT_PUBLIC_UPDATE_MANIFEST_URL=https://chat.krux.io.vn/version.json npm run electron:pack:linux
```

```bash
NODE_ENV=production NEXT_PUBLIC_UPDATE_MANIFEST_URL=https://chat.krux.io.vn/version.json npm run electron:pack:win
```

Expected: `dist-electron/halo-chat_0.3.0_amd64.deb`, `dist-electron/Halo-Setup-0.3.0.exe`. Cài bản deb, chạy `xdg-mime query default x-scheme-handler/halo` → trả file `.desktop` của Halo.
