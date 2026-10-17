import { NoteHtmlFrame } from '@/features/notes/components/shared/NoteHtmlFrame';
import { cn } from '@/lib/utils/cn';
import { AI_REVIEW_FRAME_STYLES } from './ai-review-styles';

interface AiReviewSectionProps {
  html: string;
  hint: string;
  id: string;
  label: string;
  title: string;
  /** Tô màu tiêu đề khi tiêu đề khác giữa hai bản. */
  titleTone?: 'added' | 'removed';
}

export function AiReviewSection({ html, hint, id, label, title, titleTone }: AiReviewSectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-32">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={headingId} className="text-[13px] font-semibold text-muted-foreground">{label}</h2>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <p
        className={cn(
          'mt-2 text-2xl font-bold leading-tight tracking-tight text-balance break-words',
          !title && 'text-muted-foreground',
          titleTone === 'removed' && 'text-danger line-through decoration-2',
          titleTone === 'added' && 'text-success',
        )}
      >
        {titleTone && <span className="sr-only">{titleTone === 'removed' ? 'Tiêu đề cũ: ' : 'Tiêu đề mới: '}</span>}
        {title || 'Không tiêu đề'}
      </p>
      {html.trim() ? (
        <div className="-mx-2 mt-2">
          <NoteHtmlFrame html={html} title={`${label}: ${title || 'không tiêu đề'}`} extraStyles={AI_REVIEW_FRAME_STYLES} />
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Trang trống.</p>
      )}
    </section>
  );
}
