import * as Sentry from '@sentry/nextjs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMessage {
  message: string;
  error?: unknown;
  context?: Record<string, unknown>;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(level: LogLevel, { message, error, context }: LogMessage): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `\nContext: ${JSON.stringify(context, null, 2)}` : '';
    const errorStr = error ? `\nError: ${this.formatError(error)}` : '';
    
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}${errorStr}`;
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