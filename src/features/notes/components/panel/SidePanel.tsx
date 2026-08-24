'use client';

import { useEffect } from 'react';
import { History, MessageSquareText, PanelRightClose, Share2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button/Button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs/Tabs';
import {
  useNotesUiStore,
  type SidePanelTab,
} from '@/features/notes/stores/notes-ui.store';
import { cn } from '@/lib/utils/cn';
import { CommentThread } from './CommentThread';

const tabs: { value: SidePanelTab; label: string }[] = [
  { value: 'comments', label: 'Bình luận' },
  { value: 'versions', label: 'Lịch sử' },
  { value: 'share', label: 'Chia sẻ' },
];

function isSidePanelTab(value: unknown): value is SidePanelTab {
  return value === 'comments' || value === 'versions' || value === 'share';
}

function Placeholder({ tab }: { tab: Exclude<SidePanelTab, 'comments'> }) {
  if (tab === 'versions') {
    return (
      <EmptyState
        icon={<History aria-hidden="true" />}
        title="Chưa có danh sách phiên bản"
        hint="Lịch sử phiên bản sẽ có ở M4-T5."
        size="sm"
      />
    );
  }
  return (
    <EmptyState
      icon={<Share2 aria-hidden="true" />}
      title="Chia sẻ"
      hint="Tính năng chia sẻ sẽ có ở M5."
      size="sm"
    />
  );
}

export function SidePanel() {
  const params = useParams<{ pageId?: string }>();
  const isOpen = useNotesUiStore((state) => state.isSidePanelOpen);
  const setOpen = useNotesUiStore((state) => state.setSidePanelOpen);
  const activeTab = useNotesUiStore((state) => state.sidePanelTab);
  const setActiveTab = useNotesUiStore((state) => state.setSidePanelTab);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, setOpen]);

  return (
    <aside
      id="notes-side-panel"
      aria-label="Bảng bên ghi chú"
      aria-hidden={!isOpen}
      data-testid="notes-side-panel"
      className={cn(
        'relative z-20 h-full shrink-0 overflow-hidden bg-muted',
        'transition-[width] duration-200 ease-[cubic-bezier(.32,.72,0,1)]',
        'motion-reduce:transition-none max-[1179px]:fixed max-[1179px]:inset-0 max-[1179px]:z-50',
        isOpen ? 'w-[360px] max-[1179px]:w-full' : 'w-0 max-[1179px]:invisible',
      )}
    >
      {isOpen && (
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (isSidePanelTab(value)) setActiveTab(value);
          }}
          className="h-full min-w-[360px] max-[1179px]:min-w-0"
        >
          <div className="flex h-[44px] items-center">
            <TabsList
              size="sm"
              aria-label="Nội dung bảng bên"
              className="h-full w-full flex-1 rounded-none bg-transparent p-0 [&>span:first-child]:hidden"
            >
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    'h-full flex-1 rounded-none border-b-2 border-transparent px-2',
                    'text-sm font-normal text-muted-foreground',
                    'data-active:border-primary data-active:font-medium data-active:text-foreground',
                  )}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Đóng bảng bên"
              title="Đóng bảng bên"
              className="me-2 min-[1180px]:hidden"
              onClick={() => setOpen(false)}
            >
              <PanelRightClose aria-hidden="true" className="size-4" />
            </Button>
          </div>
          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-0 h-[calc(100%_-_44px)] overflow-hidden">
              {tab.value === 'comments' ? (
                params.pageId ? <CommentThread pageId={params.pageId} /> : (
                  <EmptyState
                    icon={<MessageSquareText aria-hidden="true" />}
                    title="Chọn một trang để xem bình luận"
                    size="sm"
                  />
                )
              ) : <Placeholder tab={tab.value} />}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </aside>
  );
}
