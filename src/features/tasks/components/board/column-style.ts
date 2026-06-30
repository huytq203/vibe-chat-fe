import {
  Activity,
  AtSign,
  HelpCircle,
  AlertTriangle,
  Home,
  Laptop,
  Camera,
  Music,
  Monitor,
  CheckCircle2,
  BarChart3,
  FileText,
  Inbox,
  Calendar,
  Clock,
  Target,
  Bug,
  Settings,
  type LucideIcon,
} from 'lucide-react';

/** Bộ icon cho header cột (giống "Section Icon" của design). */
export const COLUMN_ICONS = {
  activity: Activity,
  at: AtSign,
  help: HelpCircle,
  alert: AlertTriangle,
  home: Home,
  laptop: Laptop,
  camera: Camera,
  music: Music,
  monitor: Monitor,
  check: CheckCircle2,
  chart: BarChart3,
  file: FileText,
  inbox: Inbox,
  calendar: Calendar,
  clock: Clock,
  target: Target,
  bug: Bug,
  settings: Settings,
} satisfies Record<string, LucideIcon>;

export type ColumnIconKey = keyof typeof COLUMN_ICONS;

export const DEFAULT_COLUMN_ICON: ColumnIconKey = 'activity';

/** Bảng màu header cột (giống dải swatch của design). */
export const COLUMN_COLORS = [
  '#06B6D4',
  '#14B8A6',
  '#0EA5E9',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#22C55E',
  '#10B981',
  '#64748B',
  '#94A3B8',
] as const;

export const DEFAULT_COLUMN_COLOR = '#6366F1';
