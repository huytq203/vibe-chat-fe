/**
 * Logger wrapper — TUYỆT ĐỐI không log secrets/tokens/PII.
 * Production: thay bằng pino/datadog... mà không cần đổi call site.
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isProd = process.env.NODE_ENV === 'production';

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (level === 'debug' && isProd) return;
  const payload = meta ? { message, ...meta } : { message };
  console[level === 'debug' ? 'log' : level](`[${level.toUpperCase()}]`, payload);
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
} as const;
