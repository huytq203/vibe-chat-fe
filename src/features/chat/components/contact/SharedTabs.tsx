'use client';

import { useMemo, useState } from 'react';
import { Download, ImageOff, Link as LinkIcon, Play } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs/Tabs';
import { Progress } from '@/components/ui/progress/Progress';
import { ImageLightbox, type LightboxSlide } from '@/components/common/ImageLightbox';
import { fileExtFromName, formatFileSize, getFileIconMeta } from '@/features/chat/utils';
import { useMediaDownload } from '@/features/chat/hooks/useMediaDownload';
import { useRefreshableUrl } from '@/features/chat/hooks/useRefreshableUrl';
import { useSharedContent, type SharedMedia } from '@/features/chat/hooks/useSharedContent';

const EMPTY_CLS = 'py-3 text-center text-[11.5px] text-muted-foreground';

/** Số item hiển thị mỗi lần bấm "Xem thêm" (mở rộng phía FE, không gọi BE). */
const EXPAND_STEP = 12;

/** Mở rộng hiển thị dần phía FE: cắt `items` theo `visible`, "Xem thêm" tăng thêm EXPAND_STEP. */
function useExpandable<T>(items: T[]): { visible: T[]; hasMore: boolean; showMore: () => void } {
  const [count, setCount] = useState(EXPAND_STEP);
  const visible = useMemo(() => items.slice(0, count), [items, count]);
  return {
    visible,
    hasMore: count < items.length,
    showMore: () => setCount((c) => c + EXPAND_STEP),
  };
}

/** Nút "Xem thêm" — mở rộng hiển thị phía FE, không fetch BE. */
function ShowMore({ hasMore, onClick }: { hasMore: boolean; onClick: () => void }) {
  if (!hasMore) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 w-full rounded-lg py-1.5 text-[12px] font-semibold text-primary hover:bg-secondary"
    >
      Xem thêm
    </button>
  );
}

export function SharedTabs({ conversationId }: { conversationId: string }) {
  const { media, files, links } = useSharedContent(conversationId);
  const mediaEx = useExpandable(media.items);
  const filesEx = useExpandable(files.items);
  const linksEx = useExpandable(links.items);

  return (
    <Tabs defaultValue="media">
      <TabsList size="xs" className="w-full">
        <TabsTrigger value="media" className="flex-1">Ảnh & Video</TabsTrigger>
        <TabsTrigger value="files" className="flex-1">Tài liệu</TabsTrigger>
        <TabsTrigger value="links" className="flex-1">Liên kết</TabsTrigger>
      </TabsList>

      <TabsContent value="media" className="pt-3">
        {media.items.length === 0 ? (
          <p className={EMPTY_CLS}>
            {media.isLoading ? 'Đang tải…' : 'Chưa có ảnh hoặc video được chia sẻ'}
          </p>
        ) : (
          <>
            <MediaGrid conversationId={conversationId} items={mediaEx.visible} />
            <ShowMore hasMore={mediaEx.hasMore} onClick={mediaEx.showMore} />
          </>
        )}
      </TabsContent>

      <TabsContent value="files" className="pt-2">
        {files.items.length === 0 ? (
          <p className={EMPTY_CLS}>
            {files.isLoading ? 'Đang tải…' : 'Chưa có tệp được chia sẻ'}
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              {filesEx.visible.map((f) => (
                <FileRow key={f.key} conversationId={conversationId} item={f} />
              ))}
            </div>
            <ShowMore hasMore={filesEx.hasMore} onClick={filesEx.showMore} />
          </>
        )}
      </TabsContent>

      <TabsContent value="links" className="pt-2">
        {links.items.length === 0 ? (
          <p className={EMPTY_CLS}>
            {links.isLoading ? 'Đang tải…' : 'Chưa có liên kết được chia sẻ'}
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              {linksEx.visible.map((l) => (
              <a
                key={l.key}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-secondary"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <LinkIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold text-foreground">{hostOf(l.url)}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{l.url}</span>
                </span>
              </a>
              ))}
            </div>
            <ShowMore hasMore={linksEx.hasMore} onClick={linksEx.showMore} />
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}

function MediaGrid({ conversationId, items }: { conversationId: string; items: SharedMedia[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [video, setVideo] = useState<string | null>(null);

  // Album ảnh cho lightbox (chỉ IMAGE) + ánh xạ key → index để mở đúng slide.
  const { slides, indexByKey } = useMemo(() => {
    const slides: LightboxSlide[] = [];
    const indexByKey: Record<string, number> = {};
    for (const it of items) {
      if (it.message.type === 'IMAGE' && it.attachment.downloadUrl) {
        indexByKey[it.key] = slides.length;
        slides.push({ src: it.attachment.downloadUrl, alt: it.attachment.fileName });
      }
    }
    return { slides, indexByKey };
  }, [items]);

  return (
    <>
      <div className="grid grid-cols-3 gap-1">
        {items.map((it) => (
          <MediaThumb
            key={it.key}
            conversationId={conversationId}
            item={it}
            onOpen={() => {
              if (it.message.type === 'VIDEO') setVideo(it.attachment.downloadUrl);
              else setLightboxIndex(indexByKey[it.key] ?? 0);
            }}
          />
        ))}
      </div>

      <ImageLightbox
        open={lightboxIndex !== null}
        slides={slides}
        index={lightboxIndex ?? 0}
        onClose={() => setLightboxIndex(null)}
      />

      {video && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
          onClick={() => setVideo(null)}
        >
          <video src={video} controls autoPlay className="max-h-full max-w-full rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

function MediaThumb({
  conversationId,
  item,
  onOpen,
}: {
  conversationId: string;
  item: SharedMedia;
  onOpen: () => void;
}) {
  const att = item.attachment;
  const isVideo = item.message.type === 'VIDEO';
  const { url, onError } = useRefreshableUrl(conversationId, att.mediaId, att.downloadUrl, true);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative aspect-square overflow-hidden rounded-lg bg-border/40"
      aria-label={isVideo ? 'Xem video' : 'Xem ảnh'}
    >
      {url ? (
        isVideo ? (
          <video src={url} muted preload="metadata" onError={onError} className="h-full w-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={att.fileName} onError={onError} className="h-full w-full object-cover" />
        )
      ) : (
        <span className="flex h-full w-full items-center justify-center text-muted-foreground">
          <ImageOff className="h-5 w-5" />
        </span>
      )}
      {isVideo && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/20">
          <Play className="h-6 w-6 fill-white text-white drop-shadow" />
        </span>
      )}
    </button>
  );
}

function FileRow({ conversationId, item }: { conversationId: string; item: SharedMedia }) {
  const att = item.attachment;
  const icon = getFileIconMeta(fileExtFromName(att.fileName));
  const { downloading, progress, download } = useMediaDownload(conversationId, att.mediaId, att.fileName);

  return (
    <button
      type="button"
      onClick={() => void download(att.downloadUrl)}
      disabled={downloading}
      className="block w-full rounded-lg px-1.5 py-1.5 text-left hover:bg-secondary disabled:cursor-wait disabled:opacity-80"
      aria-label={`Tải xuống ${att.fileName}`}
    >
      <span className="flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[9px] font-extrabold"
          style={{ backgroundColor: `${icon.color}22`, color: icon.color }}
        >
          {icon.label}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-semibold text-foreground">{att.fileName}</span>
          <span className="block text-[11px] text-muted-foreground">{formatFileSize(att.fileSize)}</span>
        </span>
        <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
      </span>
      {downloading && <Progress value={progress} size="sm" className="mt-1.5" />}
    </button>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
