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
  :root {
    --note-text-gray: #45556c;
    --note-text-orange: #f54900;
    --note-text-yellow: #e17100;
    --note-text-green: #009966;
    --note-text-blue: #0084d1;
    --note-text-purple: #7f22fe;
    --note-text-pink: #e60076;
    --note-text-red: #e7000b;
    --note-hl-gray: #90a1b938;
    --note-hl-orange: #ff890438;
    --note-hl-yellow: #ffb90040;
    --note-hl-green: #00d49238;
    --note-hl-blue: #00bcff38;
    --note-hl-purple: #a684ff38;
    --note-hl-pink: #fb64b638;
    --note-hl-red: #ff646738;
  }

  body {
    margin: 0;
    color: #18181b;
    color-scheme: light;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 1rem;
    line-height: 1.65;
    overflow-wrap: anywhere;
  }

  p, ul, ol { margin-block: 0.125rem; }

  h1, h2, h3, h4, h5, h6 {
    margin: 0;
    padding-top: 0.75rem;
    font-weight: 700;
    line-height: 1.3;
  }

  h1 { font-size: 1.75rem; } h2 { font-size: 1.375rem; }
  h3 { font-size: 1.125rem; } h4 { font-size: 1rem; }
  h5 { font-size: 0.9375rem; } h6 { font-size: 0.875rem; }

  ul, ol {
    padding-inline-start: 1.5rem;
  }

  li > p { margin: 0; }

  ul[data-type="taskList"] {
    list-style: none;
    padding-inline-start: 0;
  }

  li[data-type="taskItem"] {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
  }

  li[data-type="taskItem"] > label {
    display: flex;
    height: 1.65rem;
    align-items: center;
  }

  li[data-type="taskItem"] input[type="checkbox"] {
    flex: none;
    width: 1rem; height: 1rem;
    margin: 0;
    accent-color: #7c3aed;
  }

  li[data-type="taskItem"] > div { min-width: 0; flex: 1; }

  blockquote {
    margin: 0.5rem 0;
    border-inline-start: 1px solid #d4d4d8;
    padding: 0.5rem 1rem;
    color: #3f3f46;
  }

  blockquote p { margin: 0; }

  pre {
    position: relative;
    margin-block: 0.5rem;
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

  pre code {
    border-radius: 0;
    background: none;
    padding: 0;
    font: inherit;
  }

  table {
    width: 100%;
    margin-block: 0.5rem;
    overflow: hidden;
    border: 1px solid #e4e4e7;
    border-radius: 0.75rem;
    border-spacing: 0;
    border-collapse: separate;
    table-layout: fixed;
  }

  th, td {
    border-inline-end: 1px solid #e4e4e7;
    border-block-end: 1px solid #e4e4e7;
    padding: 0.5rem 0.75rem;
    text-align: start;
    vertical-align: top;
  }

  th { background: #f4f4f5; font-weight: 700; }
  tr:last-child > * { border-block-end: 0; }
  tr > *:last-child { border-inline-end: 0; }

  hr {
    margin-block: 1.5rem;
    border: 0;
    border-top: 1px solid #e4e4e7;
  }

  a { color: #7c3aed; text-decoration-thickness: 1px; text-underline-offset: 0.1875rem; }
  a:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }

  mark[data-color="gray"] { background: var(--note-hl-gray) !important; }
  mark[data-color="orange"] { background: var(--note-hl-orange) !important; }
  mark[data-color="yellow"] { background: var(--note-hl-yellow) !important; }
  mark[data-color="green"] { background: var(--note-hl-green) !important; }
  mark[data-color="blue"] { background: var(--note-hl-blue) !important; }
  mark[data-color="purple"] { background: var(--note-hl-purple) !important; }
  mark[data-color="pink"] { background: var(--note-hl-pink) !important; }
  mark[data-color="red"] { background: var(--note-hl-red) !important; }

  img {
    display: block;
    max-width: 100%;
    height: auto; margin: 1rem auto;
    border-radius: 0.75rem;
  }

  figure[data-embed] {
    position: relative;
    width: 100%;
    margin: 0.5rem 0;
    overflow: hidden;
    border: 1px solid #e4e4e7;
    border-radius: 0.75rem;
    background: #f4f4f5;
    aspect-ratio: 16 / 9;
  }

  figure[data-embed][data-aspect="4:3"] { aspect-ratio: 4 / 3; }
  figure[data-embed][data-aspect="1:1"] { aspect-ratio: 1; }
  figure[data-embed][data-aspect="auto"] { height: 24rem; aspect-ratio: auto; }

  figure[data-embed] iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
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
  const blockLanguage = code.closest<HTMLPreElement>('pre')?.dataset.language;
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

  const blocks = Array.from(frameDocument.querySelectorAll<HTMLPreElement>('pre'));
  const highlightTargets: Array<{
    code: HTMLElement;
    language: ReturnType<typeof languageFrom>;
    pre: HTMLPreElement;
    source: string;
  }> = [];

  for (const pre of blocks) {
    const code = pre.querySelector<HTMLElement>(':scope > code');
    if (!code) continue;

    const source = code.textContent ?? '';
    const language = languageFrom(code, source);
    if (isHighlightableLanguage(language)
      && !pre.querySelector(':scope > .public-code-language')) {
      const languageLabel = frameDocument.createElement('span');
      languageLabel.className = 'public-code-language';
      languageLabel.textContent = CODE_BLOCK_LANGUAGES[language].name;
      pre.appendChild(languageLabel);
    }
    if (!pre.querySelector(':scope > .public-code-copy')) {
      const copyControl = createCodeCopyButton(
        frameDocument,
        () => source,
        'public-code-copy',
      );
      pre.appendChild(copyControl.button);
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
