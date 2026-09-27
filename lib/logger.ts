const isProd = process.env.NODE_ENV === 'production';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function formatMessage(level: LogLevel, scope: string, msg: string, data?: unknown): string {
  const ts = new Date().toISOString();
  const base = `[${ts}] ${level.toUpperCase()} [${scope}] ${msg}`;
  return base;
}

function createLogger(scope: string) {
  return {
    debug(msg: string, data?: unknown) {
      if (!isProd) console.debug(formatMessage('debug', scope, msg), data ?? '');
    },
    info(msg: string, data?: unknown) {
      if (!isProd) console.info(formatMessage('info', scope, msg), data ?? '');
    },
    warn(msg: string, data?: unknown) {
      console.warn(formatMessage('warn', scope, msg), data ?? '');
    },
    error(msg: string, err?: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err ?? '');
      console.error(formatMessage('error', scope, msg), errorMsg);
    },
  };
}

export { createLogger };
export type { LogLevel };
