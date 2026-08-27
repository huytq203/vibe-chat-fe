'use client';

import { useEffect, type ReactNode } from 'react';
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
import { ShareTab } from './ShareTab';
import { VersionList } from './VersionList';

const tabs: { value: SidePanelTab; label: string }[] = [
  { value: 'comments', label: 'Bình luận' },
  { value: 'versions', label: 'Lịch sử' },
  { value: 'share', label: 'Chia sẻ' },
];

function isSidePanelTab(value: unknown): value is SidePanelTab {
  return value === 'comments' || value === 'versions' || value === 'share';
}

const emptyTitleByTab: Record<SidePanelTab, string> = {
  comments: 'Chọn một trang để xem bình luận',
  versions: 'Chọn một trang để xem lịch sử',
  share: 'Chọn một trang để chia sẻ',
};

const emptyIconByTab: Record<SidePanelTab, ReactNode> = {
  comments: <MessageSquareText aria-hidden="true" />,
  versions: <History aria-hidden="true" />,
  share: <Share2 aria-hidden="true" />,
};

function PanelContent({ pageId, tab, workspaceId }: {
  pageId?: string;
  tab: SidePanelTab;
  workspaceId?: string;
}) {
  if (!pageId) return <EmptyState icon={emptyIconByTab[tab]} title={emptyTitleByTab[tab]} size="sm" />;
  if (tab === 'comments') return <CommentThread pageId={pageId} />;
  if (tab === 'versions') return <VersionList key={pageId} pageId={pageId} />;
  if (!workspaceId) return <EmptyState icon={emptyIconByTab.share} title={emptyTitleByTab.share} size="sm" />;
  return <ShareTab key={pageId} pageId={pageId} workspaceId={workspaceId} />;
}

export function SidePanel() {
  const params = useParams<{ workspaceId?: string; pageId?: string }>();
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
        'relative z-20 h-full shrink-0 overflow-hidden bg-sidebar text-sidebar-foreground',
        'transition-[width,margin] duration-200 ease-[cubic-bezier(.32,.72,0,1)]',
        'motion-reduce:transition-none max-[1279px]:fixed max-[1279px]:inset-0 max-[1279px]:z-50',
        isOpen
          ? 'pointer-events-auto w-[340px] max-[1279px]:w-full min-[1280px]:ml-3 min-[1280px]:rounded-2xl min-[1280px]:border min-[1280px]:bg-sidebar/75 min-[1280px]:shadow-subtle min-[1280px]:backdrop-blur-md'
          : 'pointer-events-none w-0 border-0 shadow-none max-[1279px]:invisible min-[1280px]:ml-0',
      )}
    >
      {isOpen && (
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (isSidePanelTab(value)) setActiveTab(value);
          }}
          className="flex h-full min-w-[340px] flex-col max-[1279px]:min-w-0"
        >
          <div className="flex min-h-14 shrink-0 items-center border-b border-border max-[1279px]:pt-[var(--safe-top)]">
            <TabsList
              size="sm"
              aria-label="Nội dung bảng bên"
              className="h-14 w-full flex-1 rounded-none bg-transparent p-0 [&>span:first-child]:hidden"
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
              className="me-2 size-11 rounded-xl min-[1280px]:hidden"
              onClick={() => setOpen(false)}
            >
              <PanelRightClose aria-hidden="true" className="size-4" />
            </Button>
          </div>
          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-0 min-h-0 flex-1 overflow-hidden pb-[var(--safe-bottom)] min-[1280px]:pb-0">
              <PanelContent pageId={params.pageId} workspaceId={params.workspaceId} tab={tab.value} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </aside>
  );
}
