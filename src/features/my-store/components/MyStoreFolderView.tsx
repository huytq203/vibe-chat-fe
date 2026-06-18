'use client';

import { useState } from 'react';
import { ArrowLeft, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { FolderSidebar } from './FolderSidebar';
import { FilePanel } from './FilePanel';
import { useStoreFolders } from '@/features/my-store/hooks/use-query';

type Props = {
  onBack: () => void;
};

/** Xem Tệp & thư mục toàn màn hình — thay khung chat + panel để có không gian rộng. */
export function MyStoreFolderView({ onBack }: Props) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const { data: folders } = useStoreFolders();
  const selectedFolder = folders?.find((f) => f.id === selectedFolderId) ?? null;

  return (
    <main className="flex h-full min-w-0 flex-1 flex-col bg-background">
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-sidebar px-3 py-3">
        <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="Quay lại" title="Quay lại">
          <ArrowLeft className="h-[18px] w-[18px]" />
        </Button>
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-primary">
          <Archive className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[14.5px] font-bold text-foreground">Tệp & thư mục</div>
          <div className="truncate text-[11.5px] text-muted-foreground">Kho của tôi</div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <FolderSidebar selectedFolderId={selectedFolderId} onSelectFolder={setSelectedFolderId} />
        <div className="flex min-w-0 flex-1 flex-col">
          {selectedFolderId ? (
            <FilePanel folderId={selectedFolderId} folderName={selectedFolder?.name ?? 'Thư mục'} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
              <p className="text-sm">Chọn một thư mục để xem file</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
