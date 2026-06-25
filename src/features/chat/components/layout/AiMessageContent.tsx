'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import { ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';

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

export function AiMessageContent({ content }: AiMessageContentProps) {
  const imageAction = parseImageAction(content);
  if (imageAction) {
    return <ImageActionCard prompt={imageAction.prompt} thought={imageAction.thought} />;
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        pre: ({ children, ...props }) => (
          <pre {...props} className="my-2 overflow-x-auto rounded-lg bg-[#282c34] p-3 text-[12px]">
            {children}
          </pre>
        ),
        code: ({ children, className, ...props }) => (
          <code {...props} className={className ?? 'rounded bg-muted px-1 py-0.5 text-[12px] font-mono'}>
            {children}
          </code>
        ),
        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="mb-1 ml-4 list-disc space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="mb-1 ml-4 list-decimal space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="text-[13px]">{children}</li>,
        h1: ({ children }) => <h1 className="mb-1 text-base font-bold">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-1 text-[14px] font-semibold">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-1 text-[13px] font-semibold">{children}</h3>,
        blockquote: ({ children }) => (
          <blockquote className="my-1 border-l-2 border-primary/40 pl-3 text-muted-foreground">
            {children}
          </blockquote>
        ),
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
            {children}
          </a>
        ),
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-border bg-muted px-2 py-1 text-left font-semibold">{children}</th>
        ),
        td: ({ children }) => (
          <td className="border border-border px-2 py-1">{children}</td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
