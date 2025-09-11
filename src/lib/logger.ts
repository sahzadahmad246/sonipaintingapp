// import { env } from "./env";

export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private isProduction = process.env.NODE_ENV === "production";

  private formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): string {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      level,
      message,
      timestamp,
      context,
    };

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return JSON.stringify(logEntry);
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;
    
    // In production, only log warnings and errors
    return level === LogLevel.WARN || level === LogLevel.ERROR;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, context, error);

    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
    }

    // In production, you might want to send logs to an external service
    if (this.isProduction && (level === LogLevel.ERROR || level === LogLevel.WARN)) {
      this.sendToExternalService();
    }
  }

  private async sendToExternalService(): Promise<void> {
    try {
      // Example: Send to external logging service
      // await fetch('https://your-logging-service.com/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     level,
      //     message,
      //     context,
      //     error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined,
      //     timestamp: new Date().toISOString(),
      //     environment: process.env.NODE_ENV,
      //   }),
      // });
    } catch (err) {
      // Fallback to console if external service fails
      console.error("Failed to send log to external service:", err);
    }
  }

  error(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  // Security-specific logging
  security(message: string, context?: Record<string, unknown>): void {
    this.warn(`[SECURITY] ${message}`, context);
  }

  // API-specific logging
  api(message: string, context?: Record<string, unknown>): void {
    this.info(`[API] ${message}`, context);
  }

  // Database-specific logging
  database(message: string, context?: Record<string, unknown>): void {
    this.info(`[DATABASE] ${message}`, context);
  }

  // Authentication-specific logging
  auth(message: string, context?: Record<string, unknown>): void {
    this.info(`[AUTH] ${message}`, context);
  }
}

// Create singleton instance
export const logger = new Logger();

// Helper functions for common logging scenarios
export const logError = (error: Error, context?: Record<string, unknown>) => {
  logger.error(error.message, context, error);
};

export const logSecurity = (message: string, context?: Record<string, unknown>) => {
  logger.security(message, context);
};

export const logApi = (message: string, context?: Record<string, unknown>) => {
  logger.api(message, context);
};

export const logDatabase = (message: string, context?: Record<string, unknown>) => {
  logger.database(message, context);
};

export const logAuth = (message: string, context?: Record<string, unknown>) => {
  logger.auth(message, context);
};
