// ─── Token Interfaces ─────────────────────────────────────────────────────────

export interface ThemeColors {
  // Surface
  background: string;
  foreground: string;
  // Brand
  primary: string;
  primaryForeground: string;
  // Secondary surface
  secondary: string;
  secondaryForeground: string;
  // Muted surface
  muted: string;
  mutedForeground: string;
  // Accent / hover surface
  accent: string;
  accentForeground: string;
  // Semantic states
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  danger: string;
  dangerForeground: string;
  // Form / input
  border: string;
  input: string;
  ring: string;
  // Popover / overlay
  popover: string;
  popoverForeground: string;
}

export interface Theme {
  name: string;
  label: string;
  colors: ThemeColors;
}

export type BuiltInThemeName = 'indigo' | 'blue' | 'violet' | 'rose' | 'emerald' | 'orange' | 'slate';

// ─── Built-in Themes ──────────────────────────────────────────────────────────

export const themes: Theme[] = [
  // ─── Default: Vibe Night (design mockup) ──────────────────────────────────────
  // Palette lấy trực tiếp từ design (/Downloads/vibe-chat) — dark purple.
  {
    name: 'indigo',
    label: 'Halo Night (Default)',
    colors: {
      background: '#130f1a',              
      foreground: '#fbfbfc',             
      primary: '#7f49e0',                
      primaryForeground: '#ffffff',
      secondary: '#221a30',              
      secondaryForeground: '#9e75e7',    
      muted: '#1a1425',                  
      mutedForeground: '#8778a0',        
      accent: '#221a30',                 
      accentForeground: '#fbfbfc',
      success: '#49e049',                
      successForeground: '#0e0c14',
      warning: '#e0c849',                
      warningForeground: '#1a1425',
      danger: '#e04949',
      dangerForeground: '#ffffff',
      border: '#2e2540',                 
      input: '#221a30',
      ring: '#7f49e0',
      popover: '#1a1425',
      popoverForeground: '#fbfbfc',
    },
  },

  // ─── Blue — same contrast standard as Kraken ──────────────────────────────────
  {
    name: 'blue',
    label: 'Blue',
    colors: {
      background: '#ffffff',
      foreground: '#101114',
      primary: '#2563eb',
      primaryForeground: '#ffffff',
      secondary: '#dbeafe',
      secondaryForeground: '#1d4ed8',
      muted: '#f8f9fc',
      mutedForeground: '#9497a9',         
      accent: '#eff6ff',
      accentForeground: '#101114',
      success: '#149e61',
      successForeground: '#ffffff',
      warning: '#f59e0b',
      warningForeground: '#ffffff',
      danger: '#ef4444',
      dangerForeground: '#ffffff',
      border: '#dde5f0',
      input: '#dde5f0',
      ring: '#2563eb',
      popover: '#ffffff',
      popoverForeground: '#101114',
    },
  },

  // ─── Violet ────────────────────────────────────────────────────────────────────
  {
    name: 'violet',
    label: 'Violet',
    colors: {
      background: '#ffffff',
      foreground: '#101114',
      primary: '#7c3aed',
      primaryForeground: '#ffffff',
      secondary: '#ede9fe',
      secondaryForeground: '#5b21b6',
      muted: '#f5f3ff',
      mutedForeground: '#9491c4',         // violet-tinted, same relative lightness
      accent: '#f5f3ff',
      accentForeground: '#101114',
      success: '#149e61',
      successForeground: '#ffffff',
      warning: '#f59e0b',
      warningForeground: '#ffffff',
      danger: '#ef4444',
      dangerForeground: '#ffffff',
      border: '#ddd6fe',
      input: '#ddd6fe',
      ring: '#7c3aed',
      popover: '#ffffff',
      popoverForeground: '#101114',
    },
  },

  // ─── Rose ──────────────────────────────────────────────────────────────────────
  {
    name: 'rose',
    label: 'Rose',
    colors: {
      background: '#ffffff',
      foreground: '#101114',
      primary: '#e11d48',
      primaryForeground: '#ffffff',
      secondary: '#ffe4e6',
      secondaryForeground: '#9f1239',
      muted: '#fff1f2',
      mutedForeground: '#9e9099',         // rose-tinted silver
      accent: '#fff1f2',
      accentForeground: '#101114',
      success: '#149e61',
      successForeground: '#ffffff',
      warning: '#f59e0b',
      warningForeground: '#ffffff',
      danger: '#ef4444',
      dangerForeground: '#ffffff',
      border: '#f0d5d9',
      input: '#f0d5d9',
      ring: '#e11d48',
      popover: '#ffffff',
      popoverForeground: '#101114',
    },
  },

  // ─── Emerald ───────────────────────────────────────────────────────────────────
  {
    name: 'emerald',
    label: 'Emerald',
    colors: {
      background: '#ffffff',
      foreground: '#101114',
      primary: '#059669',
      primaryForeground: '#ffffff',
      secondary: '#d1fae5',
      secondaryForeground: '#065f46',
      muted: '#ecfdf5',
      mutedForeground: '#7a9e8d',         // emerald-tinted silver
      accent: '#ecfdf5',
      accentForeground: '#101114',
      success: '#149e61',
      successForeground: '#ffffff',
      warning: '#f59e0b',
      warningForeground: '#ffffff',
      danger: '#ef4444',
      dangerForeground: '#ffffff',
      border: '#c5e8d9',
      input: '#c5e8d9',
      ring: '#059669',
      popover: '#ffffff',
      popoverForeground: '#101114',
    },
  },

  // ─── Orange ────────────────────────────────────────────────────────────────────
  {
    name: 'orange',
    label: 'Orange',
    colors: {
      background: '#ffffff',
      foreground: '#101114',
      primary: '#ea580c',
      primaryForeground: '#ffffff',
      secondary: '#ffedd5',
      secondaryForeground: '#9a3412',
      muted: '#fff7ed',
      mutedForeground: '#9e9087',         // warm-tinted silver
      accent: '#fff7ed',
      accentForeground: '#101114',
      success: '#149e61',
      successForeground: '#ffffff',
      warning: '#f59e0b',
      warningForeground: '#ffffff',
      danger: '#ef4444',
      dangerForeground: '#ffffff',
      border: '#f5d9b8',
      input: '#f5d9b8',
      ring: '#ea580c',
      popover: '#ffffff',
      popoverForeground: '#101114',
    },
  },

  // ─── Slate ─────────────────────────────────────────────────────────────────────
  {
    name: 'slate',
    label: 'Slate',
    colors: {
      background: '#ffffff',
      foreground: '#101114',
      primary: '#475569',
      primaryForeground: '#ffffff',
      secondary: '#f1f5f9',
      secondaryForeground: '#334155',
      muted: '#f8f9fc',
      mutedForeground: '#9497a9',
      accent: '#f1f5f9',
      accentForeground: '#101114',
      success: '#149e61',
      successForeground: '#ffffff',
      warning: '#f59e0b',
      warningForeground: '#ffffff',
      danger: '#ef4444',
      dangerForeground: '#ffffff',
      border: '#dedee5',
      input: '#dedee5',
      ring: '#475569',
      popover: '#ffffff',
      popoverForeground: '#101114',
    },
  },
];

// ─── Apply Theme ──────────────────────────────────────────────────────────────

const THEME_STYLE_ID = 'basuicn-theme';

/**
 * Applies a theme by injecting a <style> tag at the START of <head>.
 *
 * Why <style> tag instead of element.style.setProperty():
 *   Inline styles have the highest CSS specificity and would override
 *   .dark { } class rules, breaking dark mode. A <style> tag injected
 *   before the app's CSS bundle has lower specificity than .dark { }
 *   rules defined later in the bundle — so dark mode always wins.
 */
export function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return;
  if (!theme?.colors) return;
  const { colors: c } = theme;

  const css = `
:root:not(.dark) {
  --background: ${c.background};
  --foreground: ${c.foreground};
  --primary: ${c.primary};
  --primary-foreground: ${c.primaryForeground};
  --secondary: ${c.secondary};
  --secondary-foreground: ${c.secondaryForeground};
  --muted: ${c.muted};
  --muted-foreground: ${c.mutedForeground};
  --accent: ${c.accent};
  --accent-foreground: ${c.accentForeground};
  --success: ${c.success};
  --success-foreground: ${c.successForeground};
  --warning: ${c.warning};
  --warning-foreground: ${c.warningForeground};
  --danger: ${c.danger};
  --danger-foreground: ${c.dangerForeground};
  --destructive: ${c.danger};
  --destructive-foreground: ${c.dangerForeground};
  --border: ${c.border};
  --input: ${c.input};
  --ring: ${c.ring};
  --popover: ${c.popover};
  --popover-foreground: ${c.popoverForeground};
  /* Sidebar + switch dẫn xuất từ palette → luôn đúng cặp tương phản theo theme.
     Trước đây các token này không được ghi đè nên giữ giá trị tím tối mặc định
     khi đổi sang theme sáng (chữ tím / nền tím). */
  --sidebar: ${c.muted};
  --sidebar-foreground: ${c.foreground};
  --sidebar-border: ${c.border};
  --sidebar-accent: ${c.accent};
  --sidebar-accent-foreground: ${c.accentForeground};
  --sidebar-ring: ${c.ring};
  --switch-background: ${c.border};
}`.trim();

  let styleEl = document.getElementById(THEME_STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = THEME_STYLE_ID;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;
}

// ─── CSS Variable Generator ───────────────────────────────────────────────────

/**
 * Converts a Theme's colors into a CSS `:root { }` block string.
 * Used by scripts to generate or sync CSS.
 */
export function toCssVars(theme: Theme): string {
  const { colors: c } = theme;
  const vars: [string, string][] = [
    ['--background', c.background],
    ['--foreground', c.foreground],
    ['--primary', c.primary],
    ['--primary-foreground', c.primaryForeground],
    ['--secondary', c.secondary],
    ['--secondary-foreground', c.secondaryForeground],
    ['--muted', c.muted],
    ['--muted-foreground', c.mutedForeground],
    ['--accent', c.accent],
    ['--accent-foreground', c.accentForeground],
    ['--success', c.success],
    ['--success-foreground', c.successForeground],
    ['--warning', c.warning],
    ['--warning-foreground', c.warningForeground],
    ['--danger', c.danger],
    ['--danger-foreground', c.dangerForeground],
    ['--destructive', c.danger],
    ['--destructive-foreground', c.dangerForeground],
    ['--border', c.border],
    ['--input', c.input],
    ['--ring', c.ring],
    ['--popover', c.popover],
    ['--popover-foreground', c.popoverForeground],
    ['--sidebar', c.muted],
    ['--sidebar-foreground', c.foreground],
    ['--sidebar-border', c.border],
    ['--sidebar-accent', c.accent],
    ['--sidebar-accent-foreground', c.accentForeground],
    ['--sidebar-ring', c.ring],
    ['--switch-background', c.border],
  ];
  const body = vars.map(([k, v]) => `        ${k}: ${v};`).join('\n');
  return `:root {\n${body}\n    }`;
}

// ─── Custom Theme Factory ─────────────────────────────────────────────────────

/**
 * Creates a custom theme by merging overrides with the default (indigo) theme.
 *
 * @example
 * const myTheme = createTheme('brand', 'My Brand', { primary: '#ff6b35' });
 */
export function createTheme(
  name: string,
  label: string,
  colors: Partial<ThemeColors>
): Theme {
  const base = themes[0]; // indigo as default base
  return {
    name,
    label,
    colors: { ...base.colors, ...colors },
  };
}
