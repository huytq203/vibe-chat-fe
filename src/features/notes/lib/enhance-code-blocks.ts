import { createCodeCopyButton } from '@/features/notes/lib/code-copy-button';
import {
  asBundledLanguage,
  CODE_BLOCK_LANGUAGES,
  detectCodeLanguage,
  getCodeHighlighter,
  isHighlightableLanguage,
  resolveCodeLanguage,
} from '@/features/notes/lib/code-highlighting';

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

export async function enhanceCodeBlocks(frame: HTMLIFrameElement) {
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
