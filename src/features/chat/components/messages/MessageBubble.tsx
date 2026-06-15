'use client';

import {
  AlertCircle,
  Check,
  CheckCheck,
  Clock,
  Phone,
  PhoneMissed,
  Pin,
  RotateCw,
  Video,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { Message } from '@/features/chat/types';
import { formatBubbleTime } from '@/features/chat/utils';
import { useDiscardFailedMessage, useResendMessage } from '@/features/chat/hooks/use-mutations';
import { EmojiText } from '@/components/common/EmojiText';
import { MentionText } from './MentionText';
import { RichText } from './RichText';
import { getRichText } from './rich-text-utils';
import { Avatar } from '@/features/chat/components/common/Avatar';
import { MediaContent } from './MediaContent';
import { MessageActions } from './MessageActions';
import { MessageReactions } from './MessageReactions';
import { ReplyQuote } from './ReplyQuote';
import { SelfDestructTimer } from './SelfDestructTimer';

const MEDIA_TYPES = ['IMAGE', 'VIDEO', 'AUDIO', 'FILE'] as const;

type MessageBubbleProps = {
  message: Message;
  meId: string | null;
  showAvatar: boolean;
  senderName?: string | null;
  /** Hiện tên người gửi trên bubble (group, tin đầu của mỗi chuỗi tin). */
  showSenderName?: boolean;
  /** Avatar người gửi (URL đã ký, từ conversation.members). */
  senderAvatarUrl?: string | null;
  senderSeed?: string;
  /** Tin gốc được trả lời, tra từ cache; null nếu tin không reply hoặc ngoài khung nhìn. */
  repliedTo?: Message | null;
  /** Tên người gửi tin gốc đã resolve (cho ReplyQuote). */
  repliedToName?: string | null;
  /** Bấm quote → cuộn tới tin gốc (do MessageList cung cấp). */
  onQuoteClick?: (messageId: string) => void;
  /** Đang được nháy sáng do vừa cuộn tới từ một reply. */
  isHighlighted?: boolean;
  /** Có quyền ghim/bỏ ghim tin trong conversation này (truyền xuống MessageActions). */
  canPin?: boolean;
  /** Tin này đang được ghim. */
  isPinned?: boolean;
  /** Nhãn "Trưởng nhóm"/"Phó nhóm" của người gửi (chỉ khi markLeaderMessages). */
  leaderLabel?: string | null;
};

export function MessageBubble({
  message, meId, showAvatar, senderName, showSenderName, senderAvatarUrl, senderSeed,
  repliedTo, repliedToName, onQuoteClick, isHighlighted, canPin, isPinned, leaderLabel,
}: MessageBubbleProps) {
  const isMe = message.senderId === meId;
  const isSending = message.metadata?.optimistic === true;
  const isFailed = message.metadata?.failed === true;
  const isSeen = isMe && !isSending && !isFailed && message.isView === true;
  const resendMut = useResendMessage();
  const discardFailed = useDiscardFailedMessage();
  // Ảnh/video hiển thị sát viền → bóng dùng padding nhỏ.
  const isVisualMedia =
    !message.isDeleted && (message.type === 'IMAGE' || message.type === 'VIDEO');
  // Menu hành động: mọi tin đã gửi xong, chưa gỡ. Reply cho tất cả;
  // Sửa/Gỡ chỉ tin của mình (gate trong MessageActions qua isMe).
  const canActions = !isSending && !isFailed && !message.isDeleted;
  // Thanh action (emoji + ⋮) nổi absolute phía trên bubble — chỉ hiện khi hover
  // ĐÚNG bubble (group/msg), không chiếm layout, không trigger theo cả dòng.
  const actionsMenu = canActions && (
    <MessageActions
      message={message}
      meId={meId}
      isMe={isMe}
      senderName={senderName}
      canPin={canPin}
      isPinned={isPinned}
      className={cn(
        // w-max: rộng theo nội dung, không bị shrink-to-fit co theo bubble hẹp.
        // pointer-events-none khi ẩn: bar opacity-0 nằm phía trên bubble nhưng KHÔNG
        // bắt chuột → rê vào vùng trên bubble không bị tính là hover. Khi hover đúng
        // bubble mới bật pointer-events-auto để bấm emoji. -top-6: đè nhẹ mép trên
        // bubble (không tạo khe) nên vẫn rê lên bar bấm được.
        // KHÔNG dùng focus-within (gây kẹt mở sau khi click emoji); MessageActions
        // tự ép hiện khi dropdown đang mở.
        'pointer-events-none absolute -top-6 z-20 w-max opacity-0 transition-opacity',
        'group-hover/msg:pointer-events-auto group-hover/msg:opacity-100',
        isMe ? 'right-0' : 'left-0',
      )}
    />
  );

  return (
    <div
      data-message-id={message.id}
      className={cn('flex items-end gap-1.5', isMe ? 'justify-end' : 'justify-start')}
    >
      {!isMe && (
        <div className="w-7 shrink-0">
          {showAvatar && (
            <Avatar
              name={senderName ?? null}
              src={senderAvatarUrl}
              seed={senderSeed ?? message.senderId}
              size="sm"
              className="!h-7 !w-7 !rounded-lg !text-[9px]"
            />
          )}
        </div>
      )}
      <div className="max-w-[65%]">
        {isPinned && (
          <span
            className={cn(
              'mb-0.5 flex items-center gap-1 text-[10px] font-medium text-primary',
              isMe ? 'justify-end pr-1' : 'ml-1.5',
            )}
          >
            <Pin className="h-3 w-3" /> Đã ghim
          </span>
        )}
        {!isMe && showSenderName && senderName && (
          <p className="mb-0.5 ml-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            {senderName}
            {leaderLabel && (
              <span className="rounded bg-primary/15 px-1.5 py-px text-[9.5px] font-bold text-primary">
                {leaderLabel}
              </span>
            )}
          </p>
        )}
        <div
          className={cn(
            'group/msg relative rounded-2xl transition-all',
            isVisualMedia ? 'p-1.5' : 'px-3.5 py-2.5',
            isMe
              ? 'rounded-br-md bg-primary text-primary-foreground'
              : 'rounded-bl-md border border-border bg-muted text-foreground',
            isSending && 'opacity-70',
            isFailed && 'border border-danger/60',
            isHighlighted && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
          )}
        >
          {actionsMenu}
          {message.replyToMessageId && (
            <ReplyQuote
              repliedTo={repliedTo ?? null}
              repliedToName={repliedToName ?? null}
              replyToMessageId={message.replyToMessageId}
              isMe={isMe}
              onClick={onQuoteClick ?? (() => {})}
            />
          )}
          <BubbleContent message={message} isMe={isMe} />
          <div className={cn('mt-1 flex items-center justify-end gap-1', isVisualMedia && 'px-1 pb-0.5')}>
            {message.expireAt && !message.isDeleted && !isSending && !isFailed && (
              <SelfDestructTimer expireAt={message.expireAt} isMe={isMe} />
            )}
            {message.isEdited && !message.isDeleted && (
              <span
                className={cn(
                  'text-[9.5px] italic',
                  isMe ? 'text-primary-foreground/50' : 'text-muted-foreground/70',
                )}
              >
                đã chỉnh sửa
              </span>
            )}
            <span className={cn('text-[10px]', isMe ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
              {isSending
                ? 'Đang gửi…'
                : isFailed
                  ? 'Gửi thất bại'
                  : formatBubbleTime(message.createdAt)}
            </span>
            {isMe && (
              isFailed ? (
                <AlertCircle className="h-3.5 w-3.5 text-danger-foreground" aria-label="Gửi thất bại" />
              ) : isSending ? (
                <Clock className="h-3.5 w-3.5 opacity-70" aria-label="Đang gửi" />
              ) : isSeen ? (
                <CheckCheck className="h-3.5 w-3.5  opacity-80" aria-label="Đã xem" />
              ) : (
                <Check className="h-3.5 w-3.5 opacity-80" aria-label="Đã gửi" />
              )
            )}
          </div>
        </div>
        {!message.isDeleted && <MessageReactions message={message} isMe={isMe} />}
        {isFailed && isMe && (
          <div className="mt-1 flex items-center justify-end gap-2 text-[11px] text-danger">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-danger/10"
              disabled={resendMut.isPending}
              onClick={() =>
                resendMut.mutate({
                  conversationId: message.conversationId,
                  tempId: message.id,
                })
              }
              aria-label="Gửi lại"
              title="Gửi lại"
            >
              <RotateCw className={cn('h-3 w-3', resendMut.isPending && 'animate-spin')} />
              Gửi lại
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-muted-foreground hover:bg-muted"
              onClick={() => discardFailed(message.conversationId, message.id)}
              aria-label="Bỏ"
              title="Bỏ"
            >
              <X className="h-3 w-3" />
              Bỏ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BubbleContent({ message, isMe }: { message: Message; isMe: boolean }) {
  if (message.isDeleted) {
    return <span className="text-[13.5px] italic opacity-70">Tin nhắn đã thu hồi</span>;
  }
  if (message.type === 'TEXT') {
    const body = message.plaintext ?? message.contentPreview ?? '';
    const textClass = 'block whitespace-pre-wrap break-words text-[13.5px] leading-relaxed';
    const richText = getRichText(message.metadata);
    if (richText) {
      return (
        <RichText
          text={body}
          mentions={message.mentions ?? []}
          richText={richText}
          className={textClass}
          largeEmoji
          isMe={isMe}
        />
      );
    }
    if (message.mentions?.length) {
      return <MentionText text={body} mentions={message.mentions} className={textClass} largeEmoji isMe={isMe} />;
    }
    return <EmojiText text={body} className={textClass} largeEmoji linkify />;
  }
  if (message.type === 'CALL') {
    return <CallMessageContent message={message} />;
  }
  if ((MEDIA_TYPES as readonly string[]).includes(message.type)) {
    const caption = message.plaintext?.trim();
    return (
      <>
        <MediaContent message={message} isMe={isMe} />
        {caption &&
          (message.mentions?.length ? (
            <MentionText
              text={caption}
              mentions={message.mentions}
              className="mt-1.5 block whitespace-pre-wrap break-words px-1 text-[13.5px] leading-relaxed"
              largeEmoji
              isMe={isMe}
            />
          ) : (
            <EmojiText
              text={caption}
              className="mt-1.5 block whitespace-pre-wrap break-words px-1 text-[13.5px] leading-relaxed"
              largeEmoji
              linkify
            />
          ))}
      </>
    );
  }
  return (
    <span className="block text-[13.5px] italic opacity-80">
      [{message.type.toLowerCase()}]
    </span>
  );
}

/** Tin hệ thống loại CALL: icon theo loại/kết quả + preview do BE dựng sẵn. */
function CallMessageContent({ message }: { message: Message }) {
  const meta = (message.metadata ?? {}) as {
    callType?: 'AUDIO' | 'VIDEO';
    durationSec?: number;
    endReason?: string;
  };
  const isVideo = meta.callType === 'VIDEO';
  const isMissed =
    meta.endReason === 'MISSED' ||
    meta.endReason === 'CANCELLED' ||
    meta.endReason === 'DECLINED' ||
    (meta.durationSec ?? 0) === 0;
  const Icon = isMissed ? PhoneMissed : isVideo ? Video : Phone;
  const text =
    message.contentPreview ?? (isVideo ? 'Cuộc gọi video' : 'Cuộc gọi thoại');
  return (
    <span className="inline-flex items-center gap-2 text-[13.5px]">
      <Icon className={cn('h-4 w-4 shrink-0', isMissed && 'text-destructive')} />
      <span>{text}</span>
    </span>
  );
}

