# Auth Showcase Layout (Login/Register) — Design Spec

**Date:** 2026-07-07
**Reference design:** Figma Community "Login Page Design" (https://www.figma.com/design/Jo6gOiIapAAON8Wjo6wPce/) — chỉ tham khảo **bố cục**, không copy màu/pill-button/font (xung đột `Design/DESIGN.md`).
**Color theme:** Giữ nguyên Charcoal + Cyan hiện có, radius tối đa 12px, không pill.
**Scope:** `login/page.tsx` + `register/page.tsx` (KHÔNG đụng `forgot-password`, `verify-email`).

---

## 1. Mục tiêu

Áp dụng bố cục split-screen (form bên trái + panel minh hoạ thương hiệu bên phải) tham khảo từ mẫu Figma cho 2 màn Login và Register, mà không phá vỡ Design System hiện tại (Charcoal+Cyan, radius 12px, Basuicn components).

Không trong phạm vi: OAuth thật (Google/Facebook/GitHub chỉ là placeholder UI disabled), redesign forgot-password/verify-email.

---

## 2. Kiến trúc tổng thể

```
AuthShowcaseLayout (Server Component, src/components/layout/AuthShowcaseLayout.tsx)
├── div.flex.min-h-screen
│   ├── div.flex-1.flex.items-center.justify-center.p-4.lg:p-8   ← cột form (~55%)
│   │   └── {children}   (LoginForm | RegisterForm, giữ nguyên logic)
│   └── div.hidden.lg:block.lg:w-[45%].relative.overflow-hidden  ← cột minh hoạ (~45%), ẩn < lg (1024px)
│       ├── next/image fill object-cover src="/asset/banner.png" priority
│       ├── div overlay: gradient charcoal (from-background via-background/70 to-background/10)
│       ├── 2 blur blob cyan nhẹ (bg-primary/20 blur-3xl) góc trên-phải & dưới-trái
│       └── div nội dung (z-10, absolute bottom-0, p-10): logo/icon + heading + tagline
```

`login/page.tsx` / `register/page.tsx`: bỏ wrapper `<main className="flex min-h-screen items-center justify-center bg-background px-4">` hiện tại, thay bằng:

```tsx
<AuthShowcaseLayout>
  <LoginForm />  {/* hoặc <RegisterForm /> */}
</AuthShowcaseLayout>
```

`AuthBootstrap` giữ nguyên vị trí (sibling, ngoài layout).

---

## 3. `AuthShowcaseLayout` — chi tiết

**File:** `src/components/layout/AuthShowcaseLayout.tsx` (Server Component — không cần `'use client'`, không có state/event).

**Props:**
```ts
interface AuthShowcaseLayoutProps {
  children: React.ReactNode;
  /** Heading hiển thị đè lên ảnh, mặc định "Halo" */
  title?: string;
  /** Tagline ngắn dưới heading */
  tagline?: string;
}
```

**Panel minh hoạ (cột phải):**
- Ảnh nền: `/asset/banner.png` (bản KHÔNG có nhãn tên thành phố — tránh rối mắt), `next/image` `fill` + `object-cover`, `priority`.
- Overlay tối: `absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10` — hoà ảnh pastel vào nền charcoal `#111318`.
- 2 blob glow cyan trang trí: `absolute rounded-full bg-primary/20 blur-3xl` (kích thước ~200-300px, đặt góc trên-phải và dưới-trái panel) — gợi accent cyan thương hiệu, không hardcode màu ngoài token `primary`.
- Nội dung đè lên (góc dưới-trái, `absolute bottom-0 left-0 z-10 p-10`):
  - Heading: `text-2xl font-bold text-foreground` — mặc định "Halo".
  - Tagline: `text-sm text-muted-foreground` — mặc định `"Kết nối không giới hạn, trò chuyện mọi lúc."`, override được qua prop `tagline`.
- Cột ẩn hoàn toàn dưới breakpoint `lg` (1024px, đúng bảng breakpoint DESIGN.md §8) — mobile chỉ thấy cột form full-width.

---

## 4. Điều chỉnh form panel (Login/Register)

- Không đổi logic, chỉ nới `max-w-sm` → `max-w-md` trên `Card` gốc của `LoginForm`/`RegisterForm` để cân đối trong cột trái rộng hơn.
- Giữ nguyên toàn bộ token màu/radius/spacing hiện có của `Card`, `Input`, `Button` — KHÔNG áp pill radius hay màu từ Figma.

---

## 5. `SocialLoginRow` (placeholder, disabled)

**File:** `src/features/auth/components/SocialLoginRow.tsx` (Client Component — dùng `Tooltip`).

**Cấu trúc:**
```
div.flex.flex-col.gap-3
├── div.flex.items-center.gap-3          ← divider
│   ├── Separator (flex-1)
│   ├── span.text-xs.text-muted-foreground  "Hoặc tiếp tục với"
│   └── Separator (flex-1)
└── div.flex.gap-2.justify-center
    └── 3x Tooltip > Button(variant="outline", size="icon", disabled, aria-label="Đăng nhập với Google/Facebook/GitHub")
        content Tooltip: "Sắp ra mắt"
        icon: <GoogleIcon /> | <FacebookIcon /> | <GithubIcon />
```

**Icon brand-mark:** `lucide-react` không có logo thương hiệu (chủ đích của lucide) → viết 3 SVG tĩnh mới:
`src/components/common/icons/GoogleIcon.tsx`, `FacebookIcon.tsx`, `GithubIcon.tsx` — mỗi file <20 dòng, `<svg>` inline path chuẩn brand mark, nhận `className` để chỉnh size qua Tailwind. Không thêm dependency mới.

**Vị trí sử dụng:**
- `LoginForm.tsx`: thêm `<SocialLoginRow />` ngay dưới nút "Đăng nhập", trên đoạn "Chưa có tài khoản?".
- `register/components/steps.tsx` → `StepIdentity`: thêm `<SocialLoginRow />` cuối component, kèm đổi label divider thành "Hoặc đăng ký nhanh với" (prop `label` cho `SocialLoginRow`, mặc định "Hoặc tiếp tục với").

---

## 6. Testing

- `AuthShowcaseLayout.test.tsx`: render với `children` bất kỳ → assert children xuất hiện, assert ảnh/overlay render (theo pattern Vitest + Testing Library hiện có trong `RegisterForm.test.tsx`).
- `SocialLoginRow.test.tsx`: assert cả 3 nút render với đúng `aria-label`, đều `disabled`.
- `RegisterForm.test.tsx` hiện có: kiểm tra lại không bị vỡ khi `StepIdentity` có thêm `SocialLoginRow` (các `getByLabelText` hiện tại không đổi nên không cần sửa).
- Verify thủ công qua `/run` hoặc browser: kiểm tra breakpoint `lg` ẩn/hiện đúng cột minh hoạ, dark/light mode (nếu áp dụng) không vỡ overlay.

---

## 7. Non-goals

- Không tích hợp OAuth thật (Google/Facebook/GitHub) — chỉ UI disabled.
- Không đổi `forgot-password`, `verify-email`.
- Không thêm thư viện icon mới (dùng SVG viết tay).
- Không đổi màu sắc/radius theo Figma gốc (giữ Charcoal+Cyan, 12px radius).

---

## 8. Addendum (2026-07-07) — Đổi ảnh minh hoạ sang nhân vật Vespa

Sau khi Task 3/4 đã hoàn thành với `banner.png` (bản đồ Việt Nam), user cung cấp thêm asset nhân vật 3D lấy trực tiếp từ file Figma tham khảo (`avatar_makata_vespa_04 1.png` — nhân vật đội mũ bảo hiểm đứng cạnh xe Vespa, đúng nhân vật ở trang "Login Page Design - 2"). Quyết định:

- **Thay `banner.png` bằng ảnh nhân vật này**, dùng chung cho cả Login và Register (không dùng 2 nhân vật khác nhau theo 2 trang Figma).
- Ảnh gốc có 1 khối nền hình chữ nhật bo góc màu xanh nhạt (`~rgb(225,239,246)`) phía sau xe (là nền gốc của ô minh hoạ trong Figma, không phải nền trong suốt hoàn toàn) — đã viết script Python (PIL, không thêm dependency vào project — chạy 1 lần, không phải runtime code) chroma-key vùng màu phẳng này về alpha=0. Kết quả lưu tại `public/asset/avatar-vespa.png` (1132×849, RGBA).
- Còn sót 1 vệt bóng đổ mờ nhỏ dưới bánh xe (gradient bóng trong ảnh gốc pha quá gần màu thân xe/mũ bảo hiểm để tách an toàn bằng color-key đơn giản) — **được chấp nhận**, không chặn tiến độ.
- Panel bên phải của `AuthShowcaseLayout` đổi cấu trúc:
  - Nền: `bg-background` phẳng (bỏ ảnh `banner.png` + overlay gradient tối, vì không còn ảnh nền photo cần làm tối) + giữ 2 blob glow cyan (`bg-primary/20 blur-3xl`) như cũ.
  - Heading/tagline "Halo" + logo chuyển lên **góc trên-trái** (`p-10`, thay vì góc dưới-trái như bản đầu) để tránh đè lên nhân vật.
  - Ảnh nhân vật (`/asset/avatar-vespa.png`) đặt ở khu vực dưới của panel, `object-contain object-bottom`, chiều cao ước lượng ~70-80% panel, căn giữa theo chiều ngang.
- Props `AuthShowcaseLayoutProps` không đổi (`children`, `title`, `tagline`) — chỉ đổi phần triển khai nội bộ.

---

## 9. Addendum (2026-07-08) — Pixel-clone Login theo Figma "Login Page Design - 2" (chỉ `/login`)

User cung cấp link Figma cụ thể (node `2:2`, file `W6TbpTC0DL1wUqkA1OEbsI`) và yêu cầu implement **chính xác pixel** thiết kế này cho riêng trang Login. Lấy design context qua Figma MCP (`get_design_context` + `get_screenshot`) xác nhận: nền gradient `#00b4db → #0083b0`, card trắng bo góc 40px, input/button bo tròn pill (`rounded-full`), nút "Sign in" màu mận `#a93159`, panel ảnh nền `#e2eef5`.

**Xung đột rule:** `rules/03-styling.md` cấm hardcode màu ngoài `Design/DESIGN.md` và cấm bo pill cho button (radius tối đa 12px). Theo CLAUDE.md §7 (yêu cầu mâu thuẫn rule → dừng hỏi user), đã hỏi user và được chọn: **override có chủ đích, chỉ áp dụng cho `/login`**, giữ nguyên `AuthShowcaseLayout` + theme Charcoal+Cyan cho `/register`.

**Thay đổi:**
- `AuthShowcaseLayout` **không còn dùng cho `/login`** (vẫn dùng cho `/register`, không đổi gì ở đó).
- Component mới `src/app/(auth)/login/_components/LoginPageShell.tsx` (route-scoped, theo `rules/06-naming-structure.md`): nền gradient cyan hardcode, watermark nhân vật Vespa mờ 10% góc trái, card trắng `rounded-[40px]` chứa cột form + cột ảnh nền `#e2eef5`.
- Asset tải trực tiếp qua Figma MCP (`get_design_context`) để đảm bảo đúng pixel, lưu tại `public/asset/login-vespa-card.png` (nhân vật trong card, RGBA có vùng trong suốt) và `public/asset/login-vespa-watermark.png` (ảnh nền mờ toàn trang).
- `LoginForm.tsx`: giữ nguyên 100% logic (React Hook Form + Zod, `useLogin` mutation, xử lý lỗi `AUTH_EMAIL_NOT_VERIFIED`/`AUTH_ACCOUNT_DELETED`, `RestoreAccountDialog`) — chỉ đổi JSX/className sang style pill hardcode (`FIELD_CLASS`, `LABEL_CLASS` hằng số trong file, có comment giải thích override). Bỏ icon trái trong input (Figma không có), bỏ `Card*` wrapper, "Quên mật khẩu?" chuyển sang căn trái.
- 3 icon social màu thật (`GoogleColorIcon`, `GithubColorIcon`, `FacebookColorIcon`) thêm vào `src/components/common/BrandIcons.tsx` — lấy path SVG chính xác từ Figma MCP, tách riêng khỏi `GoogleIcon`/`FacebookIcon`/`GithubIcon` (currentColor, dùng ở `SocialLoginRow` cho `/register`) để không ảnh hưởng route khác. Hàng social button trong `LoginForm` viết inline (không tái dùng `SocialLoginRow`) vì style khác biệt (pill 64px, không có divider line).
- Responsive: thiết kế Figma là canvas cố định 1920×1080 — chuyển thành `flex` co giãn (`max-w-5xl`, `flex-col` → `lg:flex-row`), ẩn cột ảnh dưới `lg` giống pattern cũ, thay vì absolute-position tuyệt đối.

**Non-goals của addendum này:** không đổi `/register`, không đổi ngôn ngữ hiển thị (giữ tiếng Việt thay vì copy tiếng Anh từ Figma), không thêm font Gilroy mới (giữ font hệ thống sẵn có).
