'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import { ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { cn } from '@/lib/utils/cn';

interface ImageAction {
  prompt: string;
  thought: string;
}

function parseImageAction(content: string): ImageAction | null {
  try {
    const parsed = JSON.parse(content) as {
      action?: string;
      action_input?: string;
      thought?: string;
    };
    if (parsed.action === 'dalle.text2im' && parsed.action_input) {
      const input = JSON.parse(parsed.action_input) as { prompt?: string };
      return { prompt: input.prompt ?? '', thought: parsed.thought ?? '' };
    }
  } catch {
    // not JSON or not image action
  }
  return null;
}

interface ImageActionCardProps {
  prompt: string;
  thought: string;
}

function buildPollinationsUrl(prompt: string): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`;
}

function ImageActionCard({ prompt, thought }: ImageActionCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  function generate() {
    setGenError(null);
    setImgLoading(true);
    setImageUrl(buildPollinationsUrl(prompt));
  }

  return (
    <div className="space-y-2">
      {thought && (
        <p className="text-[12px] italic text-muted-foreground">{thought}</p>
      )}
      <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2">
        <div className="flex items-start gap-2">
          <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-[12px] text-foreground">{prompt}</p>
        </div>
        {!imageUrl && (
          <Button size="sm" variant="solid" onClick={generate} className="w-full">
            <ImageIcon className="h-3.5 w-3.5" /> Tạo ảnh
          </Button>
        )}
        {genError && <p className="text-[11px] text-danger">{genError}</p>}
        {imageUrl && (
          <>
            {imgLoading && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Đang tạo ảnh...
              </div>
            )}
            <img
              src={imageUrl}
              alt={prompt}
              className="w-full rounded-lg object-cover"
              onLoad={() => setImgLoading(false)}
              onError={() => { setImgLoading(false); setGenError('Không tạo được ảnh, thử lại sau'); setImageUrl(null); }}
            />
          </>
        )}
      </div>
    </div>
  );
}

interface AiMessageContentProps {
  content: string;
}

const FENCE_RE = /^\s*```/;
const LOG_KEY_RE =
  /"(time|timestamp|level|req|res|method|url|statusCode|status|msg|message|err|error)"\s*:/i;

function isLikelyRawLogLine(line: string): boolean {
  const value = line.trim();
  if (!value) return false;
  if (/^[\[{]$/.test(value) || /^[\]}],?$/.test(value)) return true;
  if (/^"[^"]+"\s*:/.test(value)) return true;
  if (/^\{.*\},?$/.test(value) && LOG_KEY_RE.test(value)) return true;
  if (/^\[?\s*\{/.test(value) && LOG_KEY_RE.test(value)) return true;
  return /^\d{4}-\d{2}-\d{2}[T\s].*\b(trace|debug|info|warn|error|fatal)\b/i.test(
    value,
  );
}

function fenceRawLogBlock(lines: string[]): string[] {
  if (lines.length === 0) return [];
  const shouldFence =
    lines.length >= 2 || lines.some((line) => LOG_KEY_RE.test(line));
  if (!shouldFence) return lines;
  return ['```json', ...lines, '```'];
}

/**
 * Model đôi khi trả raw JSON/log trước phần tóm tắt mà không bọc bằng ```
 * khiến chat thành một mảng chữ khó đọc. Giữ nguyên Markdown người dùng thấy,
 * chỉ tự bọc các cụm log rõ ràng thành code block để UI hiển thị đúng chất liệu.
 */
export function normalizeAiMarkdownContent(content: string): string {
  const lines = content.split(/\r?\n/);
  const output: string[] = [];
  let rawLogBlock: string[] = [];
  let inFence = false;

  const flushRawLogBlock = () => {
    output.push(...fenceRawLogBlock(rawLogBlock));
    rawLogBlock = [];
  };

  for (const line of lines) {
    if (FENCE_RE.test(line)) {
      flushRawLogBlock();
      output.push(line);
      inFence = !inFence;
      continue;
    }

    if (!inFence && isLikelyRawLogLine(line)) {
      rawLogBlock.push(line);
      continue;
    }

    flushRawLogBlock();
    output.push(line);
  }

  flushRawLogBlock();
  return output.join('\n');
}

export function AiMessageContent({ content }: AiMessageContentProps) {
  const imageAction = parseImageAction(content);
  if (imageAction) {
    return <ImageActionCard prompt={imageAction.prompt} thought={imageAction.thought} />;
  }

  const normalizedContent = normalizeAiMarkdownContent(content);

  return (
    <div className="min-w-0 max-w-full break-words text-[13.5px] leading-relaxed text-current">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          pre: ({ children, ...props }) => (
            <pre
              {...props}
              className="my-2 max-w-full overflow-x-auto rounded-xl bg-zinc-950 px-3.5 py-3 text-[12px] leading-5 text-zinc-100"
            >
              {children}
            </pre>
          ),
          code: ({ children, className, ...props }) => (
            <code
              {...props}
              className={cn(
                'font-mono',
                className
                  ? 'text-[12px]'
                  : 'rounded-md bg-foreground/10 px-1 py-0.5 text-[12px]',
                className,
              )}
            >
              {children}
            </code>
          ),
          p: ({ children }) => (
            <p className="mb-2 text-pretty last:mb-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 ml-5 list-disc space-y-1 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 ml-5 list-decimal space-y-1 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          h1: ({ children }) => (
            <h1 className="mb-2 text-base font-semibold leading-snug text-balance">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 text-[14px] font-semibold leading-snug text-balance">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 text-[13.5px] font-semibold leading-snug text-balance">{children}</h3>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-current">{children}</strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 rounded-xl border border-border/70 bg-background/45 px-3 py-2 text-muted-foreground">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-2 max-w-full overflow-x-auto rounded-xl border border-border/70 bg-background/35">
              <table className="w-full border-collapse text-[12px]">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-r border-border/70 bg-muted/70 px-2 py-1.5 text-left font-semibold last:border-r-0">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-r border-border/60 px-2 py-1.5 align-top last:border-r-0">
              {children}
            </td>
          ),
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}
