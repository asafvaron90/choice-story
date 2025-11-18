import * as Sentry from '@sentry/nextjs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMessage {
  message: string;
  error?: unknown;
  context?: Record<string, unknown>;
  rawBody?: string;
}

class Logger {
  private isDevelopment = (process.env.NODE_ENV || 'development') === 'development';
  private env: string = 'unknown';
  private accountId?: string;
  private userId?: string;

  constructor() {
    if (typeof window !== 'undefined') {
      this.env = process.env.NEXT_PUBLIC_FIREBASE_ENV || 'development';
    }
  }

  setUser(accountId?: string, userId?: string) {
    this.accountId = accountId;
    this.userId = userId;
  }

  private formatMessage(level: LogLevel, { message, error, context, rawBody }: LogMessage): string {
    const timestamp = new Date().toISOString();
    
    const envInfo = `[Env: ${this.env}]`;
    const userInfo = this.accountId ? `[AccountId: ${this.accountId}, UserId: ${this.userId}]` : '';
    
    const contextStr = context ? `\nContext: ${JSON.stringify(context, null, 2)}` : '';
    const errorStr = error ? `\nError: ${this.formatError(error)}` : '';
    const rawBodyStr = rawBody ? `\nRaw Body: ${rawBody}` : '';
    
    return `[${timestamp}] ${envInfo}${userInfo} ${level.toUpperCase()}: ${message}${contextStr}${errorStr}${rawBodyStr}`;
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return `${error.name}: ${error.message}\n${error.stack}`;
    }
    return JSON.stringify(error, null, 2);
  }

  debug({ message, context }: Omit<LogMessage, 'error'>) {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', { message, context }));
    }
  }

  info({ message, context }: Omit<LogMessage, 'error'>) {
    console.info(this.formatMessage('info', { message, context }));
    // Send to Sentry as breadcrumb
    Sentry.addBreadcrumb({
      category: 'info',
      message,
      data: context,
      level: 'info'
    });
  }

  warn({ message, error, context }: LogMessage) {
    console.warn(this.formatMessage('warn', { message, error, context }));
    // Send warnings to Sentry
    Sentry.addBreadcrumb({
      category: 'warning',
      message: `WARNING: ${message}`,
      data: { ...context, error: this.formatError(error) },
      level: 'warning'
    });
  }

  error({ message, error, context }: LogMessage) {
    console.error(this.formatMessage('error', { message, error, context }));
    
    // Send to Sentry
    if (error instanceof Error) {
      Sentry.captureException(error, {
        extra: { message, ...context }
      });
    } else {
      Sentry.captureMessage(message, {
        level: 'error',
        extra: { originalError: error, ...context }
      });
    }
  }
}

export const logger = new Logger(); 