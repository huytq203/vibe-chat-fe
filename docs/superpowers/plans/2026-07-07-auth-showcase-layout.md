# Auth Showcase Layout (Login/Register) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `/login` and `/register` a split-screen layout (form left, brand showcase panel right) inspired by a Figma community template's structure, while keeping the project's existing Charcoal+Cyan design system untouched.

**Architecture:** One new shared Server Component (`AuthShowcaseLayout`) wraps the existing `LoginForm`/`RegisterForm` from each page. A new `SocialLoginRow` client component (disabled placeholder buttons for Google/Facebook/GitHub) is inserted into `LoginForm` and into the first step of the `RegisterForm` wizard. Three tiny brand-mark SVG icon components back `SocialLoginRow` since `lucide-react` ships no trademarked logos.

**Tech Stack:** Next.js 16 (App Router, Server Components), React 19, TypeScript strict, Tailwind v4, Basuicn (`Button`, `Separator`, `Tooltip`), `next/image`, Vitest + Testing Library.

## Global Constraints

- No `any`, no `@ts-ignore`/`@ts-expect-error`, no `as` without narrowing (`.claude/rules/01-typescript.md`).
- Component < 200 lines, function < 50 lines, file < 300 lines (`.claude/CLAUDE.md` §0).
- Default = Server Component; `'use client'` only on the smallest leaf that needs it (`.claude/rules/02-components.md`).
- UI primitives from Basuicn only (`Button`, `Separator`, `Tooltip`) — do not hand-roll new ones (`.claude/CLAUDE.md` §0.10).
- No new npm dependency — brand icons are hand-written inline SVG (`.claude/CLAUDE.md` §2 "Thêm lib mới ngoài bảng này → DỪNG, hỏi user").
- Keep the existing Charcoal+Cyan palette, 12px max border-radius, no pill buttons (`Design/DESIGN.md` §7 Do/Don't) — do **not** copy the Figma reference's colors, pill radius, or font.
- Named exports for all non-page/layout components (`.claude/rules/06-naming-structure.md`).
- Do not modify `forgot-password` or `verify-email` pages (out of spec scope).
- Spec reference: `docs/superpowers/specs/2026-07-07-auth-showcase-layout-design.md`.

---

### Task 1: Brand-mark icons (`BrandIcons`)

**Files:**
- Create: `src/components/common/BrandIcons.tsx`
- Test: `src/components/common/BrandIcons.test.tsx`

**Interfaces:**
- Produces: `GoogleIcon(props: React.SVGProps<SVGSVGElement>)`, `FacebookIcon(props: React.SVGProps<SVGSVGElement>)`, `GithubIcon(props: React.SVGProps<SVGSVGElement>)` — each a named function component rendering a single `<svg>` (`viewBox="0 0 24 24"`, `fill="currentColor"`, `aria-hidden="true"`), forwarding all other SVG props (notably `className`).

- [ ] **Step 1: Write the failing test**

Create `src/components/common/BrandIcons.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { GoogleIcon, FacebookIcon, GithubIcon } from './BrandIcons';

describe('BrandIcons', () => {
  it('renders each brand icon as an svg element', () => {
    const { container: google } = render(<GoogleIcon />);
    const { container: facebook } = render(<FacebookIcon />);
    const { container: github } = render(<GithubIcon />);

    expect(google.querySelector('svg')).toBeInTheDocument();
    expect(facebook.querySelector('svg')).toBeInTheDocument();
    expect(github.querySelector('svg')).toBeInTheDocument();
  });

  it('forwards className to the svg element', () => {
    const { container } = render(<GoogleIcon className="h-4 w-4" />);
    expect(container.querySelector('svg')).toHaveClass('h-4', 'w-4');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/common/BrandIcons.test.tsx`
Expected: FAIL — `Failed to resolve import "./BrandIcons"` (file doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/components/common/BrandIcons.tsx`:

```tsx
import * as React from 'react';

export type BrandIconProps = React.SVGProps<SVGSVGElement>;

/** Logo Google (đơn sắc, currentColor) — placeholder cho nút đăng nhập nhanh chưa nối OAuth. */
export function GoogleIcon(props: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.344-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" />
    </svg>
  );
}

/** Logo Facebook (đơn sắc, currentColor) — placeholder cho nút đăng nhập nhanh chưa nối OAuth. */
export function FacebookIcon(props: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
  );
}

/** Logo GitHub (đơn sắc, currentColor) — placeholder cho nút đăng nhập nhanh chưa nối OAuth. */
export function GithubIcon(props: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.207 11.387.6.113.793-.26.793-.577 0-.285-.01-1.04-.016-2.04-3.338.725-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.238 1.84 1.238 1.07 1.834 2.807 1.304 3.492.997.108-.775.42-1.305.763-1.605-2.665-.303-5.467-1.334-5.467-5.93 0-1.31.468-2.38 1.235-3.22-.123-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.3 1.23a11.5 11.5 0 0 1 3.003-.404c1.02.005 2.047.138 3.003.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.652.242 2.873.12 3.176.77.84 1.233 1.91 1.233 3.22 0 4.61-2.807 5.624-5.48 5.92.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .32.19.694.8.576C20.565 21.795 24 17.298 24 12c0-6.63-5.37-12-12-12z"
      />
    </svg>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/common/BrandIcons.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/common/BrandIcons.tsx src/components/common/BrandIcons.test.tsx
git commit -m "feat(auth): add Google/Facebook/GitHub brand icon components"
```

---

### Task 2: `SocialLoginRow` placeholder component

**Files:**
- Create: `src/features/auth/components/SocialLoginRow.tsx`
- Test: `src/features/auth/components/SocialLoginRow.test.tsx`

**Interfaces:**
- Consumes: `GoogleIcon`, `FacebookIcon`, `GithubIcon` from `@/components/common/BrandIcons` (Task 1); `Button` from `@/components/ui/button/Button`; `Separator` from `@/components/ui/separator/Separator`; `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` from `@/components/ui/tooltip/Tooltip`.
- Produces: `SocialLoginRow({ label = 'Hoặc tiếp tục với' }: SocialLoginRowProps)` — named export, `'use client'` component. Renders a divider row + 3 disabled icon buttons, each `aria-label="Đăng nhập với <Provider>"`.

- [ ] **Step 1: Write the failing test**

Create `src/features/auth/components/SocialLoginRow.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SocialLoginRow } from './SocialLoginRow';

describe('SocialLoginRow', () => {
  it('renders 3 disabled provider buttons with accessible labels', () => {
    render(<SocialLoginRow />);

    const google = screen.getByRole('button', { name: 'Đăng nhập với Google' });
    const facebook = screen.getByRole('button', { name: 'Đăng nhập với Facebook' });
    const github = screen.getByRole('button', { name: 'Đăng nhập với GitHub' });

    expect(google).toBeDisabled();
    expect(facebook).toBeDisabled();
    expect(github).toBeDisabled();
  });

  it('renders the default divider label', () => {
    render(<SocialLoginRow />);
    expect(screen.getByText('Hoặc tiếp tục với')).toBeInTheDocument();
  });

  it('renders a custom divider label when provided', () => {
    render(<SocialLoginRow label="Hoặc đăng ký nhanh với" />);
    expect(screen.getByText('Hoặc đăng ký nhanh với')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/auth/components/SocialLoginRow.test.tsx`
Expected: FAIL — `Failed to resolve import "./SocialLoginRow"` (file doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/features/auth/components/SocialLoginRow.tsx`:

```tsx
'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button/Button';
import { Separator } from '@/components/ui/separator/Separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip/Tooltip';
import { GoogleIcon, FacebookIcon, GithubIcon } from '@/components/common/BrandIcons';

const PROVIDERS = [
  { key: 'google', label: 'Google', Icon: GoogleIcon },
  { key: 'facebook', label: 'Facebook', Icon: FacebookIcon },
  { key: 'github', label: 'GitHub', Icon: GithubIcon },
] as const;

/** Props for SocialLoginRow */
export interface SocialLoginRowProps {
  /** Nhãn hiển thị trên divider phía trên hàng icon */
  label?: string;
}

/**
 * Hàng nút đăng nhập nhanh Google/Facebook/GitHub — placeholder UI, disabled vì
 * backend chưa có OAuth. Tooltip báo "Sắp ra mắt" khi hover.
 */
export function SocialLoginRow({ label = 'Hoặc tiếp tục với' }: SocialLoginRowProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">{label}</span>
        <Separator className="flex-1" />
      </div>
      <TooltipProvider>
        <div className="flex justify-center gap-2">
          {PROVIDERS.map(({ key, label: providerLabel, Icon }) => (
            <Tooltip key={key}>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled
                    aria-label={`Đăng nhập với ${providerLabel}`}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>Sắp ra mắt</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/auth/components/SocialLoginRow.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/components/SocialLoginRow.tsx src/features/auth/components/SocialLoginRow.test.tsx
git commit -m "feat(auth): add disabled social login placeholder row"
```

---

### Task 3: `AuthShowcaseLayout` shared layout component

**Files:**
- Create: `src/components/layout/AuthShowcaseLayout.tsx`
- Test: `src/components/layout/AuthShowcaseLayout.test.tsx`

**Interfaces:**
- Produces: `AuthShowcaseLayout({ children, title = 'Halo', tagline = 'Kết nối không giới hạn, trò chuyện mọi lúc.' }: AuthShowcaseLayoutProps)` — named export, Server Component (no `'use client'`). Renders a flex row: left column renders `children`, right column (`hidden lg:block`) renders `/asset/banner.png` background + gradient overlay + `title`/`tagline` text.

- [ ] **Step 1: Write the failing test**

Create `src/components/layout/AuthShowcaseLayout.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthShowcaseLayout } from './AuthShowcaseLayout';

describe('AuthShowcaseLayout', () => {
  it('renders children inside the form column', () => {
    render(
      <AuthShowcaseLayout>
        <div>form-content</div>
      </AuthShowcaseLayout>
    );
    expect(screen.getByText('form-content')).toBeInTheDocument();
  });

  it('renders the default title and tagline', () => {
    render(
      <AuthShowcaseLayout>
        <div />
      </AuthShowcaseLayout>
    );
    expect(screen.getByText('Halo')).toBeInTheDocument();
    expect(screen.getByText('Kết nối không giới hạn, trò chuyện mọi lúc.')).toBeInTheDocument();
  });

  it('overrides title and tagline via props', () => {
    render(
      <AuthShowcaseLayout title="Custom" tagline="Custom tagline">
        <div />
      </AuthShowcaseLayout>
    );
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Custom tagline')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/layout/AuthShowcaseLayout.test.tsx`
Expected: FAIL — `Failed to resolve import "./AuthShowcaseLayout"` (file doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/components/layout/AuthShowcaseLayout.tsx`:

```tsx
import Image from 'next/image';
import { MessageCircle } from 'lucide-react';

/** Props for AuthShowcaseLayout */
export interface AuthShowcaseLayoutProps {
  children: React.ReactNode;
  /** Heading hiển thị đè lên ảnh minh hoạ */
  title?: string;
  /** Tagline ngắn dưới heading */
  tagline?: string;
}

/**
 * Layout split-screen dùng chung cho Login/Register: form bên trái, panel
 * thương hiệu bên phải (ẩn dưới breakpoint lg — 1024px, theo Design/DESIGN.md §8).
 */
export function AuthShowcaseLayout({
  children,
  title = 'Halo',
  tagline = 'Kết nối không giới hạn, trò chuyện mọi lúc.',
}: AuthShowcaseLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex flex-1 items-center justify-center p-4 lg:p-8">{children}</div>

      <div className="relative hidden overflow-hidden lg:block lg:w-[45%]">
        {/* Không dùng `priority`: cột này bị ẩn (`hidden`) trên mobile, nhưng priority
            vẫn preload qua thẻ <link> bất kể display — tốn băng thông mobile vô ích.
            Lazy loading mặc định của next/image bỏ qua ảnh không hiển thị. */}
        <Image src="/asset/banner.png" alt="" fill sizes="45vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 z-10 p-10">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageCircle className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/layout/AuthShowcaseLayout.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AuthShowcaseLayout.tsx src/components/layout/AuthShowcaseLayout.test.tsx
git commit -m "feat(auth): add AuthShowcaseLayout split-screen shell"
```

---

### Task 4: Wire `AuthShowcaseLayout` into Login/Register pages

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/register/page.tsx`
- Modify: `src/features/auth/components/LoginForm.tsx:66`

**Interfaces:**
- Consumes: `AuthShowcaseLayout` from `@/components/layout/AuthShowcaseLayout` (Task 3).

- [ ] **Step 1: Update `login/page.tsx`**

Replace the full contents of `src/app/(auth)/login/page.tsx`:

```tsx
import { LoginForm, AuthBootstrap } from '@/features/auth';
import { AuthShowcaseLayout } from '@/components/layout/AuthShowcaseLayout';

export const metadata = { title: 'Đăng nhập · Halo' };

export default function LoginPage() {
  return (
    <>
      <AuthBootstrap redirectIfAuthed="/chat" />
      <AuthShowcaseLayout>
        <LoginForm />
      </AuthShowcaseLayout>
    </>
  );
}
```

- [ ] **Step 2: Update `register/page.tsx`**

Replace the full contents of `src/app/(auth)/register/page.tsx`:

```tsx
import { RegisterForm, AuthBootstrap } from '@/features/auth';
import { AuthShowcaseLayout } from '@/components/layout/AuthShowcaseLayout';

export const metadata = { title: 'Đăng ký · Halo' };

export default function RegisterPage() {
  return (
    <>
      <AuthBootstrap redirectIfAuthed="/chat" />
      <AuthShowcaseLayout>
        <RegisterForm />
      </AuthShowcaseLayout>
    </>
  );
}
```

- [ ] **Step 3: Widen the `LoginForm` card to match the wider left column**

In `src/features/auth/components/LoginForm.tsx:66`, change:

```tsx
    <Card className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-500">
```

to:

```tsx
    <Card className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
```

(`RegisterForm.tsx` already uses `max-w-md` — no change needed there.)

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(auth\)/login/page.tsx src/app/\(auth\)/register/page.tsx src/features/auth/components/LoginForm.tsx
git commit -m "feat(auth): apply AuthShowcaseLayout to login and register pages"
```

---

### Task 5: Insert `SocialLoginRow` into Login form and Register step 1

**Files:**
- Modify: `src/features/auth/components/LoginForm.tsx`
- Modify: `src/features/auth/components/register/steps.tsx`
- Modify: `src/features/auth/components/RegisterForm.test.tsx` (only if Step 3 below reveals a conflict — see note)

**Interfaces:**
- Consumes: `SocialLoginRow` from `./SocialLoginRow` (Task 2, same `features/auth/components/` folder — relative import, no barrel changes needed since it's feature-internal).

- [ ] **Step 1: Add `SocialLoginRow` to `LoginForm`**

In `src/features/auth/components/LoginForm.tsx`, add the import near the other local imports (after the `RestoreAccountDialog` import at line 21):

```tsx
import { RestoreAccountDialog } from './RestoreAccountDialog';
import { SocialLoginRow } from './SocialLoginRow';
```

Then insert `<SocialLoginRow />` between the closing `</Form>` and the "Chưa có tài khoản?" paragraph (currently lines 127-129):

```tsx
        </Form>

        <div className="mt-4">
          <SocialLoginRow />
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Chưa có tài khoản?{' '}
```

- [ ] **Step 2: Add `SocialLoginRow` to Register Step 1 (`StepIdentity`)**

In `src/features/auth/components/register/steps.tsx`, add the import after line 10:

```tsx
import { PasswordStrength } from './PasswordStrength';
import { SocialLoginRow } from '../SocialLoginRow';
```

Then in `StepIdentity` (lines 22-62), insert `<SocialLoginRow label="Hoặc đăng ký nhanh với" />` as the last child of the wrapping `<div className="space-y-4">`, right after the `username` `FormField` closes (after line 59, before the closing `</div>` on line 60):

```tsx
        )}
      />
      <SocialLoginRow label="Hoặc đăng ký nhanh với" />
    </div>
  );
}
```

- [ ] **Step 3: Run the existing RegisterForm test suite to confirm no regression**

Run: `npx vitest run src/features/auth/components/RegisterForm.test.tsx`
Expected: PASS — all existing assertions still pass because `getByRole('button', { name: /tiếp theo/i })` and `getByLabelText(...)` queries are unaffected by the added disabled Google/Facebook/GitHub buttons (different accessible names).

If this fails because of an accidental name collision, adjust `RegisterForm.test.tsx` queries to be more specific (e.g. add `{ exact: true }`) — but do not change `SocialLoginRow`'s labels to work around it without checking the actual collision first.

- [ ] **Step 4: Run the full test suite and lint**

Run: `npm run test` then `npm run lint` then `npm run typecheck`
Expected: all PASS, 0 lint errors, 0 type errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/components/LoginForm.tsx src/features/auth/components/register/steps.tsx
git commit -m "feat(auth): show social login placeholders on login and register step 1"
```

---

### Task 6: Manual verification

**Files:** none (manual QA only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (reuse the already-running instance on port 3003 if present; check with `ss -ltnp | grep 3003` first instead of starting a second one).

- [ ] **Step 2: Verify `/login` at desktop width (≥1024px)**

Open `/login` in a browser at ≥1024px width. Confirm:
- Split-screen layout: form card on the left, banner image + dark gradient + "Halo" heading + tagline + cyan glow blobs on the right.
- `SocialLoginRow` renders under the "Đăng nhập" button with 3 disabled icon buttons; hovering shows "Sắp ra mắt" tooltip; clicking does nothing.
- No layout overflow/scrollbar issues.

- [ ] **Step 3: Verify `/register` at desktop width**

Open `/register`. Confirm the same split-screen shell, and that Step 1 (Danh tính) shows the "Hoặc đăng ký nhanh với" `SocialLoginRow` below the username field. Step through all 4 steps to confirm the wizard still works end-to-end (existing behavior unchanged).

- [ ] **Step 4: Verify mobile width (<1024px)**

Resize the browser to <1024px (or use device toolbar). Confirm the illustration panel is fully hidden and the form column takes the full width, matching the pre-change single-column behavior.

- [ ] **Step 5: Confirm no unrelated regressions**

Check `/forgot-password` and `/verify-email` render exactly as before (untouched by this change).

---

## Plan Self-Review Notes

- Spec coverage: `AuthShowcaseLayout` (spec §2-3) → Task 3; form panel max-w tweak (spec §4) → Task 4; `SocialLoginRow` + brand icons (spec §5) → Tasks 1-2; placement in Login/Register Step 1 (spec §5) → Task 5; testing (spec §6) → Tasks 1-5 unit tests + Task 6 manual QA; non-goals (spec §7) respected — no OAuth wiring, no changes to forgot-password/verify-email, no new dependency, no Figma color/radius/font copied.
- No placeholders left in any step — every step has runnable commands or complete code.
- Type/name consistency checked: `SocialLoginRowProps.label`, `AuthShowcaseLayoutProps.title`/`tagline` used identically across the component definition and every call site.
