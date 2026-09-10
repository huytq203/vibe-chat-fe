'use client';

import { useEffect, useRef } from 'react';
import type { z } from 'zod';

import type { publicPageSchema } from '@/features/notes/schemas';
import { createCodeCopyButton } from '@/features/notes/lib/code-copy-button';
import {
  asBundledLanguage,
  CODE_BLOCK_LANGUAGES,
  detectCodeLanguage,
  getCodeHighlighter,
  isHighlightableLanguage,
  resolveCodeLanguage,
} from '@/features/notes/lib/code-highlighting';

type PublicPage = z.infer<typeof publicPageSchema>;

const PUBLIC_CONTENT_STYLES = `
  body {
    margin: 0;
    color: #18181b;
    color-scheme: light;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 1rem;
    line-height: 1.65;
    overflow-wrap: anywhere;
  }

  .bn-block-outer {
    margin-block: 0.125rem;
  }

  h1, h2, h3, h4, h5, h6,
  [data-content-type="heading"] {
    margin: 0;
    padding-top: 0.75rem;
    font-weight: 700;
    line-height: 1.3;
  }

  h1, [data-content-type="heading"][data-level="1"] { font-size: 1.75rem; }
  h2, [data-content-type="heading"][data-level="2"] { font-size: 1.375rem; }
  h3, [data-content-type="heading"][data-level="3"] { font-size: 1.125rem; }
  h4, [data-content-type="heading"][data-level="4"] { font-size: 1rem; }
  h5, [data-content-type="heading"][data-level="5"] { font-size: 0.9375rem; }
  h6, [data-content-type="heading"][data-level="6"] { font-size: 0.875rem; }

  [data-content-type="heading"] > :is(h1, h2, h3, h4, h5, h6) {
    margin: 0;
    padding: 0;
    font: inherit;
  }

  [data-content-type="bulletListItem"],
  [data-content-type="numberedListItem"] {
    position: relative;
    padding-inline-start: 1.5rem;
  }

  [data-content-type="bulletListItem"]::before,
  [data-content-type="numberedListItem"]::before {
    position: absolute;
    inset-inline-start: 0.25rem;
  }

  [data-content-type="bulletListItem"]::before { content: "•"; }
  [data-content-type="numberedListItem"]::before { content: attr(data-index) "."; }

  [data-content-type="checkListItem"] {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
  }

  [data-content-type="checkListItem"] input[type="checkbox"] {
    flex: none;
    margin-block-start: 0.35rem;
  }

  [data-content-type="codeBlock"] {
    position: relative;
    margin-block: 0.5rem;
  }

  [data-content-type="codeBlock"] pre {
    margin: 0;
    overflow-x: auto;
    border: 1px solid #e4e4e7;
    border-radius: 0.75rem;
    background: #f4f4f5;
    padding: 2.75rem 1rem 1rem;
    font-family: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    font-size: 0.875rem;
    font-variant-ligatures: contextual;
    line-height: 1.65;
    tab-size: 2;
  }

  [data-content-type="codeBlock"] pre code {
    border-radius: 0;
    background: none;
    padding: 0;
    font: inherit;
  }

  .shiki, .shiki span { color: var(--shiki-light); }

  .public-code-language {
    position: absolute;
    z-index: 1;
    inset-block-start: 0.5rem;
    inset-inline-start: 0.625rem;
    display: inline-flex;
    height: 1.75rem;
    max-width: calc(100% - 7rem);
    align-items: center;
    overflow: hidden;
    color: #52525b;
    font: 600 0.75rem/1 ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .public-code-copy {
    position: absolute;
    z-index: 1;
    inset-block-start: 0.5rem;
    inset-inline-end: 0.625rem;
    height: 1.75rem;
    border: 1px solid #d4d4d8;
    border-radius: 0.375rem;
    background: #ffffff;
    padding-inline: 0.625rem;
    color: #3f3f46;
    font: 500 0.75rem/1 ui-sans-serif, system-ui, sans-serif;
    cursor: pointer;
  }

  .public-code-copy:hover { background: #e4e4e7; color: #18181b; }
  .public-code-copy:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }
  .public-code-copy[data-state="copied"] { color: #15803d; }
  .public-code-copy[data-state="error"] { color: #b91c1c; }

  code:not(pre code) {
    border-radius: 0.375rem;
    background: #f4f4f5;
    padding: 0.1em 0.35em;
    font-family: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    font-size: 0.875em;
  }
`;

function languageFrom(code: HTMLElement, source: string) {
  const blockLanguage = code
    .closest<HTMLElement>('[data-content-type="codeBlock"]')
    ?.dataset.language;
  const classLanguage = Array.from(code.classList)
    .find((className) => className.startsWith('language-'))
    ?.slice('language-'.length);
  const explicitLanguage = resolveCodeLanguage(
    blockLanguage ?? code.dataset.language ?? classLanguage,
  );
  return explicitLanguage === 'text' ? detectCodeLanguage(source) : explicitLanguage;
}

async function enhanceCodeBlocks(frame: HTMLIFrameElement) {
  const frameDocument = frame.contentDocument;
  if (!frameDocument) return;

  const blocks = Array.from(
    frameDocument.querySelectorAll<HTMLElement>('[data-content-type="codeBlock"]'),
  );
  const highlightTargets: Array<{
    code: HTMLElement;
    language: ReturnType<typeof languageFrom>;
    pre: HTMLPreElement;
    source: string;
  }> = [];

  for (const block of blocks) {
    const pre = block.querySelector<HTMLPreElement>('pre');
    const code = pre?.querySelector<HTMLElement>('code');
    if (!pre || !code) continue;

    const source = code.textContent ?? '';
    const language = languageFrom(code, source);
    if (isHighlightableLanguage(language)
      && !block.querySelector(':scope > .public-code-language')) {
      const languageLabel = frameDocument.createElement('span');
      languageLabel.className = 'public-code-language';
      languageLabel.textContent = CODE_BLOCK_LANGUAGES[language].name;
      block.appendChild(languageLabel);
    }
    if (!block.querySelector(':scope > .public-code-copy')) {
      const copyControl = createCodeCopyButton(
        frameDocument,
        () => source,
        'public-code-copy',
      );
      block.appendChild(copyControl.button);
    }
    highlightTargets.push({ code, language, pre, source });
  }

  if (!highlightTargets.some(({ language }) => isHighlightableLanguage(language))) return;

  const highlighter = await getCodeHighlighter();
  for (const { code, language, pre, source } of highlightTargets) {
    if (!isHighlightableLanguage(language)) continue;
    const bundledLanguage = asBundledLanguage(language);
    if (!highlighter.getLoadedLanguages().includes(bundledLanguage)) {
      await highlighter.loadLanguage(bundledLanguage);
    }

    const highlighted = highlighter.codeToHtml(source, {
      defaultColor: false,
      lang: bundledLanguage,
      themes: { light: 'github-light', dark: 'github-dark' },
    });
    const template = frameDocument.createElement('template');
    template.innerHTML = highlighted;
    const highlightedPre = template.content.querySelector('pre');
    const highlightedCode = highlightedPre?.querySelector('code');
    if (!highlightedPre || !highlightedCode || frame.contentDocument !== frameDocument) continue;

    pre.classList.add(...highlightedPre.classList);
    pre.style.cssText = highlightedPre.style.cssText;
    code.replaceChildren(...Array.from(highlightedCode.childNodes));
  }
}

export function PublicPageBody({ page }: { page: PublicPage }) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const enhance = () => void enhanceCodeBlocks(frame);
    // `srcDoc` có thể tải xong trước hydration nên onLoad đơn lẻ sẽ bị bỏ lỡ.
    enhance();
    frame.addEventListener('load', enhance);
    return () => frame.removeEventListener('load', enhance);
  }, [page.html]);

  if (!page.html.trim()) {
    return <p className="py-8 text-sm text-muted-foreground">Trang này chưa có nội dung.</p>;
  }

  return (
    <div className="pb-8 pt-2">
      {/* HTML người dùng vẫn chạy trong iframe không có allow-scripts. Chỉ parent
          cùng origin gắn hành vi copy và syntax spans vào DOM đã bị sandbox. */}
      <iframe
        ref={frameRef}
        title={`Nội dung trang ${page.title || 'không có tiêu đề'}`}
        sandbox="allow-same-origin"
        referrerPolicy="no-referrer"
        srcDoc={`<style>${PUBLIC_CONTENT_STYLES}</style>${page.html}`}
        className="block h-[70vh] min-h-[360px] w-full border-0 bg-background"
      />
    </div>
  );
}
