# Store File Browser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gộp `FolderSidebar` (cây thư mục cố định bên trái) và `FilePanel`
(danh sách file bên phải) trong tab "File" của "Kho của tôi" thành 1 card
duy nhất, điều hướng kiểu Google Drive: click 1 thư mục → view thay bằng
nội dung thư mục đó (thư mục con + file), có breadcrumb để quay lại.

**Architecture:** Tách `FileRow` (từ `FilePanel.tsx`) sang file riêng
không đổi hành vi. Tạo mới `FolderRow` (thay `FolderNode` — bỏ
expand/collapse + thụt lề, chỉ còn click-để-drill-in). Tạo mới
`StoreFileBrowserHeader` (breadcrumb dùng `@/components/ui/breadcrumb/Breadcrumb`
có sẵn + nút Tạo thư mục/Tải lên). Tạo mới `StoreFileBrowser` (component
chính — quản lý state điều hướng `path: string[]`, ráp header + list thư
mục con + file + dialog). Xoá `FolderSidebar.tsx` và `FilePanel.tsx`, thay
bằng `StoreFileBrowser` trong `MyStoreLayout.tsx`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict,
Tailwind v4, Vitest + Testing Library, TanStack Query v5.

## Global Constraints

- No `any`, no `@ts-ignore`/`eslint-disable` không giải thích.
- Component < 200 dòng; function < 50 dòng; file < 300 dòng; hook < 80 dòng.
- Named exports cho mọi component (trừ Next.js page/layout default).
- `interface`/`type XxxProps` khai báo ngay trên component dùng nó.
- Styling: Tailwind v4 utility class — không hardcode màu ngoài token,
  không inline `style` trừ giá trị runtime (progress bar width %).
- Card pattern đã thiết lập: `rounded-2xl border bg-background/75
  shadow-subtle backdrop-blur-md` cho card nội dung chính (đã dùng ở
  `MyStoreLayout.tsx` cho content-card của tab notes/files).
- Không đổi API/service layer, không đổi `QuotaBar`, `ConfirmDialog`,
  `PromptDialog`, `FilePreviewDialog`, `MyStoreInfoPanel`.
- Không implement rename thật (nút "Đổi tên" cũ chỉ là stub — bỏ hẳn, theo
  quyết định của user, xem
  `docs/superpowers/specs/2026-07-11-store-file-browser-design.md`).
- Nút "Tải lên" ở root (chưa vào thư mục nào) → hiện nhưng disable (không
  ẩn), theo quyết định của user.
- Tham chiếu spec: `docs/superpowers/specs/2026-07-11-store-file-browser-design.md`.

---

### Task 1: Helper `findFolderById`

**Files:**
- Create: `src/features/my-store/utils.ts`
- Test: `src/features/my-store/utils.test.ts`

**Interfaces:**
- Consumes: `StoreFolder` type từ `@/features/my-store/types` (đã có sẵn,
  field `children?: StoreFolder[]`).
- Produces: `export function findFolderById(folders: StoreFolder[], id:
  string): StoreFolder | null` — Task 5 dùng hàm này để tra cứu
  `currentFolder`/breadcrumb path từ cây `folders` sống (không cache object
  tại thời điểm click, tránh stale sau khi tạo/xoá thư mục con).

- [ ] **Step 1: Viết test fail trước**

Tạo `src/features/my-store/utils.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { findFolderById } from './utils';
import type { StoreFolder } from './types';

function makeFolder(overrides: Partial<StoreFolder>): StoreFolder {
  return {
    id: 'default-id',
    userId: 'u1',
    name: 'default',
    parentId: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('findFolderById', () => {
  it('tìm thấy folder ở cấp top-level', () => {
    const folders = [makeFolder({ id: 'a', name: 'A' }), makeFolder({ id: 'b', name: 'B' })];
    expect(findFolderById(folders, 'b')?.name).toBe('B');
  });

  it('tìm thấy folder lồng sâu trong children', () => {
    const folders = [
      makeFolder({
        id: 'a',
        name: 'A',
        children: [
          makeFolder({
            id: 'a1',
            name: 'A1',
            parentId: 'a',
            children: [makeFolder({ id: 'a1a', name: 'A1A', parentId: 'a1' })],
          }),
        ],
      }),
    ];
    expect(findFolderById(folders, 'a1a')?.name).toBe('A1A');
  });

  it('trả về null nếu không tìm thấy', () => {
    const folders = [makeFolder({ id: 'a', name: 'A' })];
    expect(findFolderById(folders, 'zzz')).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npx vitest run src/features/my-store/utils.test.ts`
Expected: FAIL — "Cannot find module './utils'".

- [ ] **Step 3: Viết implementation**

Tạo `src/features/my-store/utils.ts`:

```ts
import type { StoreFolder } from '@/features/my-store/types';

/** Tìm 1 folder theo id trong cây folder lồng nhau (duyệt đệ quy qua `children`). */
export function findFolderById(folders: StoreFolder[], id: string): StoreFolder | null {
  for (const folder of folders) {
    if (folder.id === id) return folder;
    if (folder.children?.length) {
      const found = findFolderById(folder.children, id);
      if (found) return found;
    }
  }
  return null;
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npx vitest run src/features/my-store/utils.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/my-store/utils.ts src/features/my-store/utils.test.ts
git commit -m "feat(my-store): add findFolderById tree helper"
```

---

### Task 2: Tách `FileRow` sang file riêng

**Files:**
- Create: `src/features/my-store/components/FileRow.tsx`
- Test: `src/features/my-store/components/FileRow.test.tsx`
- Modify (sau, ở Task 6): `src/features/my-store/components/FilePanel.tsx` sẽ bị xoá — task này chỉ tạo file mới, chưa xoá `FilePanel.tsx`.

**Interfaces:**
- Consumes: `useDeleteFile` từ `@/features/my-store/hooks/use-mutations`;
  `mediaApi` từ `@/services/media.api`; `triggerSave` từ
  `@/features/chat/utils`; `ConfirmDialog`, `FilePreviewDialog` (cùng thư
  mục); `StoreFileRef` từ `@/features/my-store/types`.
- Produces: `export function FileRow({ file, folderId }: { file:
  StoreFileRef; folderId: string })` — y nguyên hành vi hiện có trong
  `FilePanel.tsx` (preview, tải về, gỡ file, progress bar khi tải). Task 5
  import `FileRow` từ file này.

- [ ] **Step 1: Viết test fail trước**

Tạo `src/features/my-store/components/FileRow.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FileRow } from './FileRow';
import type { StoreFileRef } from '@/features/my-store/types';

vi.mock('@/features/my-store/hooks/use-mutations', () => ({
  useDeleteFile: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('./FilePreviewDialog', () => ({
  FilePreviewDialog: () => null,
}));

const file: StoreFileRef = {
  id: 1,
  folderId: 'f1',
  userId: 'u1',
  mediaId: 'm1',
  name: 'photo.jpg',
  fileSize: 2048,
  mimeType: 'image/jpeg',
  createdAt: '2026-01-01T00:00:00Z',
};

describe('FileRow', () => {
  it('hiển thị tên file và dung lượng đã format', () => {
    render(<FileRow file={file} folderId="f1" />);
    expect(screen.getByText('photo.jpg')).toBeInTheDocument();
    expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument();
  });

  it('mở menu và hiện tuỳ chọn Tải về / Gỡ file', () => {
    render(<FileRow file={file} folderId="f1" />);
    const buttons = screen.getAllByRole('button');
    const menuButton = buttons.find((b) => b.getAttribute('title') !== 'Xem trước');
    if (!menuButton) throw new Error('Không tìm thấy nút menu "..."');
    fireEvent.click(menuButton);
    expect(screen.getByText('Tải về')).toBeInTheDocument();
    expect(screen.getByText('Gỡ file')).toBeInTheDocument();
  });
});
```

Thêm import `fireEvent` và `vi` vào dòng đầu (đổi dòng 1 thành):

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npx vitest run src/features/my-store/components/FileRow.test.tsx`
Expected: FAIL — "Cannot find module './FileRow'".

- [ ] **Step 3: Tạo `FileRow.tsx`**

Tạo `src/features/my-store/components/FileRow.tsx` — copy nguyên logic
`FileRow` + `FileIcon` + `formatBytes` từ `FilePanel.tsx` (dòng 1-144 của
file hiện tại), CHỈ đổi import path (bớt các import chỉ `FilePanel` cần,
như `useRef`, `useStoreFiles`, `useCreateFolder`, `useUploadStoreFile`,
`ContextMenu*`, `PromptDialog`, `Paperclip`, `FolderPlus`, `Upload`):

```tsx
'use client';

import { useState } from 'react';
import { Download, File, FileText, Image, Loader2, MoreHorizontal, Music, Trash2, Video } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { mediaApi } from '@/services/media.api';
import { triggerSave } from '@/features/chat/utils';
import { useDeleteFile } from '@/features/my-store/hooks/use-mutations';
import { ConfirmDialog } from './ConfirmDialog';
import { FilePreviewDialog } from './FilePreviewDialog';
import type { StoreFileRef } from '@/features/my-store/types';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />;
  if (mimeType.startsWith('video/')) return <Video className="h-4 w-4 text-purple-500" />;
  if (mimeType.startsWith('audio/')) return <Music className="h-4 w-4 text-green-500" />;
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text'))
    return <FileText className="h-4 w-4 text-orange-500" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

type FileRowProps = {
  file: StoreFileRef;
  folderId: string;
};

export function FileRow({ file, folderId }: FileRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [dlProgress, setDlProgress] = useState<number | null>(null);
  const del = useDeleteFile();

  async function download() {
    setMenuOpen(false);
    if (dlProgress !== null) return;
    setDlProgress(0);
    try {
      const media = await mediaApi.get(file.mediaId);
      if (media.downloadUrl) {
        triggerSave(await mediaApi.download(media.downloadUrl, setDlProgress), file.name);
      }
    } finally {
      setDlProgress(null);
    }
  }

  return (
    <div className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent transition-colors">
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        title="Xem trước"
      >
        <FileIcon mimeType={file.mimeType} />
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate">{file.name}</p>
          {dlProgress !== null ? (
            <span className="mt-1 flex items-center gap-2">
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                <span
                  className="block h-full rounded-full bg-primary transition-all"
                  style={{ width: `${dlProgress}%` }}
                />
              </span>
              <span className="text-[10px] text-muted-foreground">Tải {dlProgress}%</span>
            </span>
          ) : (
            <p className="text-xs text-muted-foreground">
              {formatBytes(file.fileSize)} · {file.mimeType.split('/')[1]?.toUpperCase()}
            </p>
          )}
        </div>
      </button>
      <div className="relative shrink-0">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={cn(
            'text-muted-foreground hover:text-foreground transition-colors p-1 rounded',
            menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-6 z-50 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[120px]">
              <button
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                onClick={download}
              >
                <Download className="h-3 w-3" /> Tải về
              </button>
              <button
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmOpen(true);
                }}
              >
                <Trash2 className="h-3 w-3" /> Gỡ file
              </button>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Gỡ file?"
        description={
          <>
            Gỡ <span className="font-semibold text-foreground">{file.name}</span> khỏi thư mục này?
          </>
        }
        confirmLabel="Gỡ file"
        destructive
        isPending={del.isPending}
        onConfirm={() =>
          del.mutate(
            { folderId, fileRefId: String(file.id) },
            { onSuccess: () => setConfirmOpen(false) },
          )
        }
      />

      <FilePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} file={file} />
    </div>
  );
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npx vitest run src/features/my-store/components/FileRow.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/my-store/components/FileRow.tsx src/features/my-store/components/FileRow.test.tsx
git commit -m "feat(my-store): extract FileRow into its own file"
```

---

### Task 3: `FolderRow` mới (thay `FolderNode`)

**Files:**
- Create: `src/features/my-store/components/FolderRow.tsx`
- Test: `src/features/my-store/components/FolderRow.test.tsx`

**Interfaces:**
- Consumes: `StoreFolder` từ `@/features/my-store/types`; `cn` từ
  `@/lib/utils/cn`.
- Produces: `export function FolderRow({ folder, onOpen, onDelete }: {
  folder: StoreFolder; onOpen: (id: string) => void; onDelete: (id:
  string) => void })`. Click vào hàng → `onOpen(folder.id)`. Menu "..."
  CHỈ có "Xoá" (không có "Đổi tên" — bỏ hẳn theo quyết định user), click
  "Xoá" → `onDelete(folder.id)`. Task 5 import `FolderRow` từ file này.

- [ ] **Step 1: Viết test fail trước**

Tạo `src/features/my-store/components/FolderRow.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FolderRow } from './FolderRow';
import type { StoreFolder } from '@/features/my-store/types';

const folder: StoreFolder = {
  id: 'f1',
  userId: 'u1',
  name: 'Ảnh',
  parentId: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('FolderRow', () => {
  it('gọi onOpen với folder.id khi click vào hàng', () => {
    const onOpen = vi.fn();
    render(<FolderRow folder={folder} onOpen={onOpen} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByText('Ảnh'));
    expect(onOpen).toHaveBeenCalledWith('f1');
  });

  it('menu "..." chỉ có "Xoá", không có "Đổi tên", và gọi onDelete khi bấm', () => {
    const onDelete = vi.fn();
    render(<FolderRow folder={folder} onOpen={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tuỳ chọn thư mục' }));
    expect(screen.queryByText(/Đổi tên/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Xoá/i }));
    expect(onDelete).toHaveBeenCalledWith('f1');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npx vitest run src/features/my-store/components/FolderRow.test.tsx`
Expected: FAIL — "Cannot find module './FolderRow'".

- [ ] **Step 3: Viết implementation**

Tạo `src/features/my-store/components/FolderRow.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { ChevronRight, Folder, MoreHorizontal, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { StoreFolder } from '@/features/my-store/types';

type FolderRowProps = {
  folder: StoreFolder;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
};

/** 1 hàng thư mục trong StoreFileBrowser — click để "vào trong" (drill-in). */
export function FolderRow({ folder, onOpen, onDelete }: FolderRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer select-none transition-colors hover:bg-accent"
      onClick={() => onOpen(folder.id)}
    >
      <Folder className="h-4 w-4 shrink-0 text-amber-500" />
      <span className="text-sm truncate flex-1">{folder.name}</span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="relative shrink-0">
        <button
          type="button"
          aria-label="Tuỳ chọn thư mục"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className={cn(
            'p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors',
            menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
              }}
            />
            <div className="absolute right-0 top-5 z-50 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[100px]">
              <button
                type="button"
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete(folder.id);
                }}
              >
                <Trash2 className="h-3 w-3" /> Xoá
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npx vitest run src/features/my-store/components/FolderRow.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/my-store/components/FolderRow.tsx src/features/my-store/components/FolderRow.test.tsx
git commit -m "feat(my-store): add FolderRow (drill-in row, replaces tree FolderNode)"
```

---

### Task 4: `StoreFileBrowserHeader` (breadcrumb + actions)

**Files:**
- Create: `src/features/my-store/components/StoreFileBrowserHeader.tsx`
- Test: `src/features/my-store/components/StoreFileBrowserHeader.test.tsx`

**Interfaces:**
- Consumes: `Breadcrumb`, `BreadcrumbItem`, `BreadcrumbLink`,
  `BreadcrumbList`, `BreadcrumbPage`, `BreadcrumbSeparator` từ
  `@/components/ui/breadcrumb/Breadcrumb` (đã có sẵn trong dự án — KHÔNG
  tự viết breadcrumb mới). `StoreFolder` từ `@/features/my-store/types`.
- Produces: `export function StoreFileBrowserHeader({ breadcrumbPath,
  onGoToCrumb, onCreateFolder, onUploadClick, canUpload, uploading }:
  StoreFileBrowserHeaderProps)` với:
  ```ts
  type StoreFileBrowserHeaderProps = {
    breadcrumbPath: StoreFolder[];
    onGoToCrumb: (index: number) => void; // -1 = về root "Kho của tôi"
    onCreateFolder: () => void;
    onUploadClick: () => void;
    canUpload: boolean;
    uploading: boolean;
  };
  ```
  Task 5 import `StoreFileBrowserHeader` và `StoreFileBrowserHeaderProps`
  từ file này (dùng type khi truyền props).

- [ ] **Step 1: Viết test fail trước**

Tạo `src/features/my-store/components/StoreFileBrowserHeader.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { StoreFileBrowserHeader } from './StoreFileBrowserHeader';
import type { StoreFolder } from '@/features/my-store/types';

function makeFolder(overrides: Partial<StoreFolder>): StoreFolder {
  return {
    id: 'default-id',
    userId: 'u1',
    name: 'default',
    parentId: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('StoreFileBrowserHeader', () => {
  it('ở root: "Kho của tôi" là page hiện tại (không click được)', () => {
    render(
      <StoreFileBrowserHeader
        breadcrumbPath={[]}
        onGoToCrumb={vi.fn()}
        onCreateFolder={vi.fn()}
        onUploadClick={vi.fn()}
        canUpload={false}
        uploading={false}
      />,
    );
    expect(screen.getByText('Kho của tôi')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Kho của tôi' })).not.toBeInTheDocument();
  });

  it('có path: hiện breadcrumb đầy đủ, click crumb gốc gọi onGoToCrumb(-1)', () => {
    const onGoToCrumb = vi.fn();
    render(
      <StoreFileBrowserHeader
        breadcrumbPath={[makeFolder({ id: 'a', name: 'Ảnh' })]}
        onGoToCrumb={onGoToCrumb}
        onCreateFolder={vi.fn()}
        onUploadClick={vi.fn()}
        canUpload
        uploading={false}
      />,
    );
    expect(screen.getByText('Ảnh')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Kho của tôi' }));
    expect(onGoToCrumb).toHaveBeenCalledWith(-1);
  });

  it('nút Tải lên disable khi canUpload=false, enable khi canUpload=true', () => {
    const { rerender } = render(
      <StoreFileBrowserHeader
        breadcrumbPath={[]}
        onGoToCrumb={vi.fn()}
        onCreateFolder={vi.fn()}
        onUploadClick={vi.fn()}
        canUpload={false}
        uploading={false}
      />,
    );
    expect(screen.getByRole('button', { name: /Tải lên/i })).toBeDisabled();

    rerender(
      <StoreFileBrowserHeader
        breadcrumbPath={[]}
        onGoToCrumb={vi.fn()}
        onCreateFolder={vi.fn()}
        onUploadClick={vi.fn()}
        canUpload
        uploading={false}
      />,
    );
    expect(screen.getByRole('button', { name: /Tải lên/i })).not.toBeDisabled();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npx vitest run src/features/my-store/components/StoreFileBrowserHeader.test.tsx`
Expected: FAIL — "Cannot find module './StoreFileBrowserHeader'".

- [ ] **Step 3: Viết implementation**

Tạo `src/features/my-store/components/StoreFileBrowserHeader.tsx`:

```tsx
'use client';

import { Fragment } from 'react';
import { FolderPlus, Loader2, Upload } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb/Breadcrumb';
import type { StoreFolder } from '@/features/my-store/types';

type StoreFileBrowserHeaderProps = {
  breadcrumbPath: StoreFolder[];
  onGoToCrumb: (index: number) => void;
  onCreateFolder: () => void;
  onUploadClick: () => void;
  canUpload: boolean;
  uploading: boolean;
};

export function StoreFileBrowserHeader({
  breadcrumbPath,
  onGoToCrumb,
  onCreateFolder,
  onUploadClick,
  canUpload,
  uploading,
}: StoreFileBrowserHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList>
          <BreadcrumbItem>
            {breadcrumbPath.length === 0 ? (
              <BreadcrumbPage>Kho của tôi</BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <button type="button" onClick={() => onGoToCrumb(-1)}>
                  Kho của tôi
                </button>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {breadcrumbPath.map((folder, i) => (
            <Fragment key={folder.id}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {i === breadcrumbPath.length - 1 ? (
                  <BreadcrumbPage className="max-w-[160px] truncate">{folder.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <button type="button" onClick={() => onGoToCrumb(i)} className="max-w-[160px] truncate">
                      {folder.name}
                    </button>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <button
        type="button"
        onClick={onCreateFolder}
        className="shrink-0 flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        title="Tạo thư mục"
      >
        <FolderPlus className="h-3.5 w-3.5" />
        Tạo thư mục
      </button>
      <button
        type="button"
        onClick={onUploadClick}
        disabled={!canUpload || uploading}
        className="shrink-0 flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
        title={canUpload ? 'Tải tệp lên thư mục này' : 'Chọn thư mục trước'}
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        Tải lên
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npx vitest run src/features/my-store/components/StoreFileBrowserHeader.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/my-store/components/StoreFileBrowserHeader.tsx src/features/my-store/components/StoreFileBrowserHeader.test.tsx
git commit -m "feat(my-store): add StoreFileBrowserHeader with breadcrumb navigation"
```

---

### Task 5: `StoreFileBrowser` (component chính)

**Files:**
- Create: `src/features/my-store/components/StoreFileBrowser.tsx`
- Test: `src/features/my-store/components/StoreFileBrowser.test.tsx`

**Interfaces:**
- Consumes: `findFolderById` (Task 1); `FileRow` (Task 2); `FolderRow`
  (Task 3); `StoreFileBrowserHeader` (Task 4); `useStoreFiles`,
  `useStoreFolders` từ `@/features/my-store/hooks/use-query`;
  `useCreateFolder`, `useDeleteFolder`, `useUploadStoreFile` từ
  `@/features/my-store/hooks/use-mutations`; `ConfirmDialog`,
  `PromptDialog` (cùng thư mục); `ContextMenu*` từ
  `@/components/ui/context-menu/ContextMenu`.
- Produces: `export function StoreFileBrowser()` — không nhận props. Task 6
  import và render `<StoreFileBrowser />` trong `MyStoreLayout.tsx`, thay
  cho cặp `<FolderSidebar />` + file-panel wrapper hiện tại. Component tự
  chứa class `rounded-2xl border bg-background/75 shadow-subtle
  backdrop-blur-md` (card wrapper) — `MyStoreLayout.tsx` KHÔNG bọc thêm
  wrapper card nào quanh nó.

- [ ] **Step 1: Viết test fail trước**

Tạo `src/features/my-store/components/StoreFileBrowser.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { StoreFileBrowser } from './StoreFileBrowser';
import type { StoreFolder } from '@/features/my-store/types';

function makeFolder(overrides: Partial<StoreFolder>): StoreFolder {
  return {
    id: 'default-id',
    userId: 'u1',
    name: 'default',
    parentId: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const rootFolders: StoreFolder[] = [
  makeFolder({
    id: 'a',
    name: 'Ảnh',
    children: [makeFolder({ id: 'a1', name: 'Vacation', parentId: 'a' })],
  }),
];

vi.mock('@/features/my-store/hooks/use-query', () => ({
  useStoreFolders: () => ({ data: rootFolders, isLoading: false }),
  useStoreFiles: () => ({
    data: undefined,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
  }),
}));
vi.mock('@/features/my-store/hooks/use-mutations', () => ({
  useCreateFolder: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteFolder: () => ({ mutate: vi.fn(), isPending: false }),
  useUploadStoreFile: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe('StoreFileBrowser', () => {
  it('ở root: hiện thư mục top-level, breadcrumb chỉ có "Kho của tôi"', () => {
    render(<StoreFileBrowser />);
    expect(screen.getByText('Ảnh')).toBeInTheDocument();
    expect(screen.queryByText('Vacation')).not.toBeInTheDocument();
  });

  it('click vào thư mục → drill in, breadcrumb thêm 1 crumb, hiện thư mục con', () => {
    render(<StoreFileBrowser />);
    fireEvent.click(screen.getByText('Ảnh'));
    expect(screen.getByText('Vacation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kho của tôi' })).toBeInTheDocument();
  });

  it('click crumb gốc "Kho của tôi" sau khi drill in → quay về root', () => {
    render(<StoreFileBrowser />);
    fireEvent.click(screen.getByText('Ảnh'));
    fireEvent.click(screen.getByRole('button', { name: 'Kho của tôi' }));
    expect(screen.queryByText('Vacation')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npx vitest run src/features/my-store/components/StoreFileBrowser.test.tsx`
Expected: FAIL — "Cannot find module './StoreFileBrowser'".

- [ ] **Step 3: Viết implementation**

Tạo `src/features/my-store/components/StoreFileBrowser.tsx`:

```tsx
'use client';

import { useRef, useState } from 'react';
import { FolderOpen, FolderPlus, Loader2, Upload } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu/ContextMenu';
import { useStoreFiles, useStoreFolders } from '@/features/my-store/hooks/use-query';
import { useCreateFolder, useDeleteFolder, useUploadStoreFile } from '@/features/my-store/hooks/use-mutations';
import { findFolderById } from '@/features/my-store/utils';
import { ConfirmDialog } from './ConfirmDialog';
import { PromptDialog } from './PromptDialog';
import { FolderRow } from './FolderRow';
import { FileRow } from './FileRow';
import { StoreFileBrowserHeader } from './StoreFileBrowserHeader';

export function StoreFileBrowser() {
  const { data: folders, isLoading: foldersLoading } = useStoreFolders();
  const [path, setPath] = useState<string[]>([]);
  const currentFolderId = path.at(-1) ?? null;

  const {
    data: filesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: filesLoading,
  } = useStoreFiles(currentFolderId);
  const createFolder = useCreateFolder();
  const deleteFolder = useDeleteFolder();
  const upload = useUploadStoreFile();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Array<{ id: string; name: string; progress: number }>>([]);

  const currentFolder = currentFolderId ? findFolderById(folders ?? [], currentFolderId) : null;
  const childFolders = currentFolder ? (currentFolder.children ?? []) : (folders ?? []);
  const allFiles = Array.from(
    new Map((filesData?.pages ?? []).flatMap((p) => p.items).map((f) => [f.id, f])).values(),
  );
  const breadcrumbPath = path
    .map((id) => findFolderById(folders ?? [], id))
    .filter((f): f is NonNullable<typeof f> => f !== null);

  function openFolder(id: string) {
    setPath((p) => [...p, id]);
  }

  function goToCrumb(index: number) {
    setPath((p) => (index < 0 ? [] : p.slice(0, index + 1)));
  }

  function openPicker() {
    fileInputRef.current?.click();
  }

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    if (!currentFolderId) return;
    const folderId = currentFolderId;
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const id = crypto.randomUUID();
      setUploads((u) => [...u, { id, name: file.name, progress: 0 }]);
      upload.mutate(
        {
          folderId,
          file,
          onProgress: (p) => setUploads((u) => u.map((x) => (x.id === id ? { ...x, progress: p } : x))),
        },
        { onSettled: () => setUploads((u) => u.filter((x) => x.id !== id)) },
      );
    });
    e.target.value = '';
  }

  function submitCreate(name: string) {
    createFolder.mutate(
      { name, parentId: currentFolderId ?? undefined },
      { onSuccess: () => setCreateOpen(false) },
    );
  }

  const showEmptyState =
    !foldersLoading &&
    childFolders.length === 0 &&
    (!currentFolderId || (!filesLoading && allFiles.length === 0 && uploads.length === 0));

  return (
    <ContextMenu>
      <ContextMenuTrigger className="flex flex-1 min-w-0 flex-col overflow-hidden rounded-2xl border bg-background/75 shadow-subtle backdrop-blur-md">
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesSelected} />

        <StoreFileBrowserHeader
          breadcrumbPath={breadcrumbPath}
          onGoToCrumb={goToCrumb}
          onCreateFolder={() => setCreateOpen(true)}
          onUploadClick={openPicker}
          canUpload={currentFolderId !== null}
          uploading={upload.isPending}
        />

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {uploads.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-lg px-3 py-2">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{u.name}</p>
                <span className="mt-1 flex items-center gap-2">
                  <span className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                    <span
                      className="block h-full rounded-full bg-primary transition-all"
                      style={{ width: `${u.progress}%` }}
                    />
                  </span>
                  <span className="text-[10px] text-muted-foreground">{u.progress}%</span>
                </span>
              </div>
            </div>
          ))}

          {(foldersLoading || (currentFolderId !== null && filesLoading)) && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {childFolders.map((folder) => (
            <FolderRow
              key={folder.id}
              folder={folder}
              onOpen={openFolder}
              onDelete={(id) => setPendingDeleteId(id)}
            />
          ))}

          {currentFolderId &&
            allFiles.map((file) => <FileRow key={file.id} file={file} folderId={currentFolderId} />)}

          {showEmptyState && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <FolderOpen className="h-8 w-8 opacity-30" />
              <p className="text-sm">{currentFolderId ? 'Thư mục trống' : 'Chưa có thư mục nào'}</p>
            </div>
          )}

          {currentFolderId && hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full text-xs text-muted-foreground hover:text-foreground py-2 text-center transition-colors"
            >
              {isFetchingNextPage ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : 'Tải thêm'}
            </button>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={() => setCreateOpen(true)}>
          <FolderPlus /> Tạo thư mục
        </ContextMenuItem>
        {currentFolderId && (
          <ContextMenuItem onClick={openPicker}>
            <Upload /> Tải lên tệp
          </ContextMenuItem>
        )}
      </ContextMenuContent>

      <PromptDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Tạo thư mục"
        placeholder="Tên thư mục..."
        isPending={createFolder.isPending}
        onSubmit={submitCreate}
      />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Xoá thư mục?"
        description="Thư mục và toàn bộ file bên trong sẽ bị xoá."
        confirmLabel="Xoá"
        destructive
        isPending={deleteFolder.isPending}
        onConfirm={() => {
          const id = pendingDeleteId;
          if (!id) return;
          deleteFolder.mutate(id, { onSuccess: () => setPendingDeleteId(null) });
        }}
      />
    </ContextMenu>
  );
}
```

> Lưu ý: `pendingDeleteId` luôn là id của 1 `childFolders` (con của
> `currentFolder`), không bao giờ trùng `currentFolderId` — vì `FolderRow`
> chỉ render cho danh sách `childFolders`, không có hàng nào đại diện cho
> chính `currentFolder` đang đứng trong. Vì vậy xoá xong không cần điều
> chỉnh `path`.

> Lưu ý: `StoreFileBrowser` KHÔNG render `<QuotaBar />` (khác
> `FolderSidebar` cũ). Đây không phải thiếu sót — `MyStoreInfoPanel.tsx:113`
> đã tự render `<QuotaBar />` riêng và luôn hiện cạnh `StoreFileBrowser`
> trong tab "File" (không phụ thuộc `activeTab`, xem `MyStoreLayout.tsx`).
> `FolderSidebar` cũ vốn hiện `QuotaBar` trùng lặp 2 lần trên cùng 1 màn
> hình — bỏ đi ở đây là dọn trùng lặp, không phải mất tính năng.

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npx vitest run src/features/my-store/components/StoreFileBrowser.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/my-store/components/StoreFileBrowser.tsx src/features/my-store/components/StoreFileBrowser.test.tsx
git commit -m "feat(my-store): add StoreFileBrowser with drill-in navigation"
```

---

### Task 6: Wire vào `MyStoreLayout`, xoá `FolderSidebar` + `FilePanel`

**Files:**
- Modify: `src/features/my-store/components/MyStoreLayout.tsx`
- Delete: `src/features/my-store/components/FolderSidebar.tsx`
- Delete: `src/features/my-store/components/FolderSidebar.test.tsx`
- Delete: `src/features/my-store/components/FilePanel.tsx`
- Delete: `src/features/my-store/components/FilePanel.test.tsx` (nếu tồn tại)

**Interfaces:**
- Consumes: `StoreFileBrowser` (Task 5).
- Produces: `export function MyStoreLayout()` — signature không đổi, vẫn
  export như cũ. `ChatLayout.tsx` tiếp tục import không đổi.

- [ ] **Step 1: Kiểm tra `FilePanel.test.tsx` có tồn tại không**

Run: `ls src/features/my-store/components/FilePanel.test.tsx 2>/dev/null || echo "không tồn tại"`

(File này có thể không tồn tại — `FilePanel.tsx` gốc không có test trước
khi bắt đầu plan này. Nếu không tồn tại thì bỏ qua bước xoá file test này ở
Step 4.)

- [ ] **Step 2: Sửa `MyStoreLayout.tsx`**

Thay toàn bộ nội dung `src/features/my-store/components/MyStoreLayout.tsx`
bằng:

```tsx
'use client';

import { useState } from 'react';
import { MyStoreFeed } from './MyStoreFeed';
import { MyStoreComposer } from './MyStoreComposer';
import { StoreFileBrowser } from './StoreFileBrowser';
import { MyStoreHeader, type MyStoreTab } from './MyStoreHeader';
import { MyStoreInfoPanel } from './MyStoreInfoPanel';
import { useStoreConversation } from '@/features/my-store/hooks/use-query';
import { useMyStoreRealtime } from '@/features/my-store/hooks/useMyStoreRealtime';

export function MyStoreLayout() {
  const [activeTab, setActiveTab] = useState<MyStoreTab>('notes');
  const { data: selfConv } = useStoreConversation();
  useMyStoreRealtime(selfConv?.id ?? null);

  return (
    <div className="flex h-full w-full flex-col gap-3">
      <MyStoreHeader activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex flex-1 min-h-0 gap-3">
        {activeTab === 'notes' ? (
          <div className="flex flex-1 min-w-0 flex-col overflow-hidden rounded-2xl border bg-background/75 shadow-subtle backdrop-blur-md">
            <MyStoreFeed />
            <MyStoreComposer />
          </div>
        ) : (
          <StoreFileBrowser />
        )}

        {selfConv?.id && (
          <MyStoreInfoPanel conversationId={selfConv.id} onOpenFiles={() => setActiveTab('files')} />
        )}
      </div>
    </div>
  );
}
```

(Bỏ `selectedFolderId`/`selectedFolder` state, bỏ import `useStoreFolders`,
`FolderSidebar`, `FilePanel`, `FolderOpen` — không còn dùng ở file này.)

- [ ] **Step 3: Xoá `FolderSidebar.tsx` và `FolderSidebar.test.tsx`**

```bash
git rm src/features/my-store/components/FolderSidebar.tsx
git rm src/features/my-store/components/FolderSidebar.test.tsx
```

- [ ] **Step 4: Xoá `FilePanel.tsx` (và test nếu có)**

```bash
git rm src/features/my-store/components/FilePanel.tsx
git rm src/features/my-store/components/FilePanel.test.tsx 2>/dev/null || true
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (xác nhận không còn chỗ nào import `FolderSidebar`
hoặc `FilePanel`).

- [ ] **Step 6: Chạy toàn bộ test suite my-store**

Run: `npx vitest run src/features/my-store`
Expected: PASS (tất cả test từ Task 1-5, không có test nào của
`FolderSidebar`/`FilePanel` còn sót).

- [ ] **Step 7: Commit**

```bash
git add src/features/my-store/components/MyStoreLayout.tsx
git commit -m "feat(my-store): wire StoreFileBrowser into MyStoreLayout, remove FolderSidebar/FilePanel"
```

(`git rm` ở Step 3-4 đã stage sẵn phần xoá — commit này gộp luôn cả xoá +
sửa `MyStoreLayout.tsx` vì đây là 1 thay đổi nguyên khối: đổi implementation
của tab "File".)

---

### Task 7: Kiểm tra thủ công trên trình duyệt

**Files:** không có (chỉ verify).

- [ ] **Step 1: Xác nhận dev server đang chạy**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3002/`
Expected: `200` hoặc `307`. Nếu chưa chạy, khởi động bằng `npm run dev` từ
thư mục gốc dự án và đợi sẵn sàng.

- [ ] **Step 2: Mở Store, vào tab File**

Vào `http://localhost:3002/store`, bấm tab "File". Xác nhận:
- Chỉ còn 1 card (không còn 2 card cạnh nhau như trước) chứa breadcrumb
  "Kho của tôi" + nút "Tạo thư mục"/"Tải lên" (Tải lên phải disabled ở
  root).
- Danh sách hiện các thư mục top-level (nếu có), không hiện file nào ở
  root.

- [ ] **Step 3: Drill-in vào 1 thư mục**

Bấm vào 1 thư mục (tạo trước nếu chưa có thư mục nào, qua nút "Tạo thư
mục"). Xác nhận:
- Breadcrumb đổi thành "Kho của tôi > <tên thư mục>", crumb "Kho của tôi"
  giờ bấm được (có gạch chân/hover), crumb tên thư mục hiện tại không bấm
  được.
- Danh sách hiện thư mục con (nếu có) + file trong thư mục đó.
- Nút "Tải lên" giờ enable, bấm mở được file picker.

- [ ] **Step 4: Quay lại root qua breadcrumb**

Bấm crumb "Kho của tôi". Xác nhận quay về danh sách top-level, nút "Tải
lên" disable lại.

- [ ] **Step 5: Xoá 1 thư mục con qua menu "..."**

Vào 1 thư mục có thư mục con, bấm "..." trên 1 hàng thư mục con → xác nhận
menu CHỈ có "Xoá" (không có "Đổi tên") → bấm Xoá → confirm dialog hiện →
xác nhận xoá thành công, danh sách cập nhật.

- [ ] **Step 6: Kiểm tra console và hồi quy**

Đọc console (`mcp__claude-in-chrome__read_console_messages`) — không có
lỗi app-specific mới. Xác nhận tab "Ghi chú" của Store vẫn hoạt động bình
thường (không bị ảnh hưởng). Xác nhận `MyStoreInfoPanel` bên phải vẫn hiện
đúng như trước (không đổi).

- [ ] **Step 7: Chạy lại test suite + typecheck lần cuối**

Run: `npx vitest run src/features/my-store`
Expected: PASS, không có test nào fail.

Run: `npx tsc --noEmit`
Expected: no errors.

Không commit ở task này (chỉ verify) — nếu phát hiện lỗi, sửa ở file liên
quan và commit riêng với message `fix:` mô tả lỗi.
