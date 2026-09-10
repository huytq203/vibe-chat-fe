import type { BundledLanguage } from 'shiki';

export const CODE_BLOCK_LANGUAGES = {
  text: { name: 'Văn bản thuần', aliases: ['txt', 'plaintext'] },
  javascript: { name: 'JavaScript', aliases: ['js'] },
  typescript: { name: 'TypeScript', aliases: ['ts'] },
  jsx: { name: 'JSX' },
  tsx: { name: 'TSX' },
  html: { name: 'HTML' },
  css: { name: 'CSS' },
  json: { name: 'JSON' },
  bash: { name: 'Shell / Bash', aliases: ['sh', 'shell'] },
  python: { name: 'Python', aliases: ['py'] },
  java: { name: 'Java' },
  c: { name: 'C' },
  cpp: { name: 'C++' },
  csharp: { name: 'C#', aliases: ['cs'] },
  go: { name: 'Go' },
  rust: { name: 'Rust' },
  sql: { name: 'SQL' },
  markdown: { name: 'Markdown', aliases: ['md'] },
  yaml: { name: 'YAML', aliases: ['yml'] },
} satisfies Record<string, { name: string; aliases?: string[] }>;

export type CodeBlockLanguage = keyof typeof CODE_BLOCK_LANGUAGES;

let highlighterPromise: ReturnType<typeof createCodeHighlighter> | undefined;

async function createCodeHighlighter() {
  const { createHighlighter } = await import('shiki');
  return createHighlighter({
    langs: [],
    themes: ['github-light', 'github-dark'],
  });
}

export function getCodeHighlighter() {
  highlighterPromise ??= createCodeHighlighter();
  return highlighterPromise;
}

export function resolveCodeLanguage(value: string | undefined): CodeBlockLanguage {
  const normalized = value?.trim().toLowerCase() ?? '';
  const match = Object.entries(CODE_BLOCK_LANGUAGES).find(([id, language]) => {
    const { aliases } = language as { aliases?: string[] };
    return id === normalized || aliases?.includes(normalized);
  });
  return (match?.[0] ?? 'text') as CodeBlockLanguage;
}

export function detectCodeLanguage(source: string): CodeBlockLanguage {
  const code = source.trim();
  if (!code) return 'text';

  if (/^#!.*\b(?:bash|sh)\b/m.test(code)) return 'bash';
  if (/^\s*(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|WITH)\b/im.test(code)) return 'sql';
  if (/^\s*(?:package\s+main|func\s+\w+\s*\()/m.test(code)) return 'go';
  if (/\b(?:fn\s+main|let\s+mut|println!)\b/.test(code)) return 'rust';
  if (/\b(?:using\s+System|Console\.WriteLine|namespace\s+\w+)/.test(code)) return 'csharp';
  if (/\b(?:public\s+(?:static\s+)?class|System\.out\.)/.test(code)) return 'java';
  if (/#include\s*[<"]|\bstd::|\bcout\s*<</.test(code)) return 'cpp';
  if (/^\s*(?:def|from|import)\s+\w+|\bprint\s*\(/m.test(code)) return 'python';
  if (/^\s*</.test(code) && /<\/?[a-z][^>]*>/i.test(code)) return 'html';
  if (/\b(?:interface|type|enum)\s+\w+|:\s*(?:string|number|boolean|unknown|never)\b/.test(code)) {
    return 'typescript';
  }
  if (/\b(?:console\.|function\s+|const\s+|let\s+|var\s+|document\.|=>)/.test(code)) {
    return 'javascript';
  }
  if (/^[\[{]/.test(code)) {
    try {
      JSON.parse(code);
      return 'json';
    } catch {
      // Tiếp tục dò các cú pháp khác khi nội dung chỉ trông giống JSON.
    }
  }
  if (/^[\w.#:[\]="' >+~*-]+\{[\s\S]*\b[a-z-]+\s*:/i.test(code)) return 'css';
  if (/^(?:---\s*\n)?[\w.-]+:\s*\S+/m.test(code)) return 'yaml';
  if (/^#{1,6}\s+|\[[^\]]+\]\([^)]+\)|^```/m.test(code)) return 'markdown';

  return 'text';
}

export function isHighlightableLanguage(language: CodeBlockLanguage): language is Exclude<CodeBlockLanguage, 'text'> {
  return language !== 'text';
}

export function asBundledLanguage(language: Exclude<CodeBlockLanguage, 'text'>): BundledLanguage {
  return language as BundledLanguage;
}
