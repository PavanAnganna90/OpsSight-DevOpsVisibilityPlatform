/**
 * Global Error Handling System for OpsSight
 * Comprehensive error handling, logging, and monitoring
 */

import { NextRequest, NextResponse } from 'next/server';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  DATABASE = 'database',
  EXTERNAL_API = 'external_api',
  RATE_LIMIT = 'rate_limit',
  SECURITY = 'security',
  SYSTEM = 'system',
  UNKNOWN = 'unknown',
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  requestId?: string;
  timestamp: Date;
  additionalData?: Record<string, any>;
}

export interface ApplicationError {
  id: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  statusCode: number;
  context: ErrorContext;
  stack?: string;
  cause?: Error;
  retryable: boolean;
  userMessage?: string;
}

// Error response templates
const ERROR_MESSAGES = {
  [ErrorCategory.AUTHENTICATION]: {
    user: 'Authentication required. Please log in to continue.',
    developer: 'Authentication failed',
  },
  [ErrorCategory.AUTHORIZATION]: {
    user: 'You do not have permission to access this resource.',
    developer: 'Authorization failed',
  },
  [ErrorCategory.VALIDATION]: {
    user: 'The provided data is invalid. Please check your input.',
    developer: 'Validation failed',
  },
  [ErrorCategory.DATABASE]: {
    user: 'A database error occurred. Please try again later.',
    developer: 'Database operation failed',
  },
  [ErrorCategory.EXTERNAL_API]: {
    user: 'An external service is temporarily unavailable. Please try again later.',
    developer: 'External API error',
  },
  [ErrorCategory.RATE_LIMIT]: {
    user: 'Too many requests. Please slow down and try again.',
    developer: 'Rate limit exceeded',
  },
  [ErrorCategory.SECURITY]: {
    user: 'A security violation was detected.',
    developer: 'Security violation',
  },
  [ErrorCategory.SYSTEM]: {
    user: 'A system error occurred. Our team has been notified.',
    developer: 'System error',
  },
  [ErrorCategory.UNKNOWN]: {
    user: 'An unexpected error occurred. Please try again.',
    developer: 'Unknown error',
  },
};

// Custom error classes
export class BaseApplicationError extends Error {
  public readonly id: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly userMessage?: string;
  public readonly context: Partial<ErrorContext>;

  constructor(
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    statusCode: number,
    options: {
      retryable?: boolean;
      userMessage?: string;
      context?: Partial<ErrorContext>;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.id = generateErrorId();
    this.category = category;
    this.severity = severity;
    this.statusCode = statusCode;
    this.retryable = options.retryable ?? false;
    this.userMessage = options.userMessage;
    this.context = options.context ?? {};
    this.cause = options.cause;

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends BaseApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super(
      message,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      400,
      {
        userMessage: ERROR_MESSAGES[ErrorCategory.VALIDATION].user,
        context: { additionalData: details },
      }
    );
  }
}

export class AuthenticationError extends BaseApplicationError {
  constructor(message: string) {
    super(
      message,
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.MEDIUM,
      401,
      {
        userMessage: ERROR_MESSAGES[ErrorCategory.AUTHENTICATION].user,
      }
    );
  }
}

export class AuthorizationError extends BaseApplicationError {
  constructor(message: string) {
    super(
      message,
      ErrorCategory.AUTHORIZATION,
      ErrorSeverity.MEDIUM,
      403,
      {
        userMessage: ERROR_MESSAGES[ErrorCategory.AUTHORIZATION].user,
      }
    );
  }
}

export class DatabaseError extends BaseApplicationError {
  constructor(message: string, cause?: Error) {
    super(
      message,
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH,
      500,
      {
        retryable: true,
        userMessage: ERROR_MESSAGES[ErrorCategory.DATABASE].user,
        cause,
      }
    );
  }
}

export class ExternalAPIError extends BaseApplicationError {
  constructor(message: string, statusCode: number = 502, cause?: Error) {
    super(
      message,
      ErrorCategory.EXTERNAL_API,
      ErrorSeverity.MEDIUM,
      statusCode,
      {
        retryable: true,
        userMessage: ERROR_MESSAGES[ErrorCategory.EXTERNAL_API].user,
        cause,
      }
    );
  }
}

export class RateLimitError extends BaseApplicationError {
  constructor(message: string, retryAfter?: number) {
    super(
      message,
      ErrorCategory.RATE_LIMIT,
      ErrorSeverity.LOW,
      429,
      {
        userMessage: ERROR_MESSAGES[ErrorCategory.RATE_LIMIT].user,
        context: { additionalData: { retryAfter } },
      }
    );
  }
}

export class SecurityError extends BaseApplicationError {
  constructor(message: string) {
    super(
      message,
      ErrorCategory.SECURITY,
      ErrorSeverity.CRITICAL,
      403,
      {
        userMessage: ERROR_MESSAGES[ErrorCategory.SECURITY].user,
      }
    );
  }
}

// Error logging and monitoring
class ErrorLogger {
  private static instance: ErrorLogger;
  private errorQueue: ApplicationError[] = [];
  private isProcessing = false;

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  async logError(error: ApplicationError): Promise<void> {
    this.errorQueue.push(error);
    
    // Process queue if not already processing
    if (!this.isProcessing) {
      void this.processQueue();
    }

    // Immediate console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ERROR]', {
        id: error.id,
        message: error.message,
        category: error.category,
        severity: error.severity,
        context: error.context,
        stack: error.stack,
      });
    }
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    while (this.errorQueue.length > 0) {
      const error = this.errorQueue.shift()!;
      
      try {
        await this.sendToMonitoring(error);
      } catch (monitoringError) {
        console.error('[Error Logger] Failed to send to monitoring:', monitoringError);
      }
    }

    this.isProcessing = false;
  }

  private async sendToMonitoring(error: ApplicationError): Promise<void> {
    const payload = {
      errorId: error.id,
      message: error.message,
      category: error.category,
      severity: error.severity,
      statusCode: error.statusCode,
      context: error.context,
      stack: error.stack,
      timestamp: error.context.timestamp.toISOString(),
      environment: process.env.NODE_ENV,
      service: 'opssight-frontend',
    };

    // Send to external monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      if (process.env.ERROR_MONITORING_WEBHOOK) {
        await fetch(process.env.ERROR_MONITORING_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      // Send to Sentry if configured (disabled for now due to optional dependency)
      // TODO: Add Sentry integration when @sentry/nextjs is installed
      // if (process.env.SENTRY_DSN && typeof window !== 'undefined') {
      //   try {
      //     const { captureException } = await import('@sentry/nextjs');
      //     captureException(new Error(error.message), {
      //       tags: { category: error.category, severity: error.severity, errorId: error.id },
      //       extra: error.context,
      //     });
      //   } catch {
      //     console.warn('[Error Logger] Sentry integration not available');
      //   }
      // }
    }

    // Critical errors need immediate attention
    if (error.severity === ErrorSeverity.CRITICAL) {
      await this.sendCriticalAlert(error);
    }
  }

  private async sendCriticalAlert(error: ApplicationError): Promise<void> {
    // Send to alerting system (Slack, PagerDuty, etc.)
    if (process.env.CRITICAL_ALERT_WEBHOOK) {
      const alert = {
        level: 'critical',
        service: 'OpsSight Frontend',
        message: `Critical error: ${error.message}`,
        errorId: error.id,
        timestamp: error.context.timestamp.toISOString(),
        context: error.context,
      };

      try {
        await fetch(process.env.CRITICAL_ALERT_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert),
        });
      } catch (alertError) {
        console.error('[Critical Alert] Failed to send alert:', alertError);
      }
    }
  }
}

const errorLogger = ErrorLogger.getInstance();

// Error conversion and handling utilities
export function createApplicationError(
  error: unknown,
  context: Partial<ErrorContext> = {}
): ApplicationError {
  const fullContext: ErrorContext = {
    timestamp: new Date(),
    ...context,
  };

  if (error instanceof BaseApplicationError) {
    return {
      id: error.id,
      message: error.message,
      category: error.category,
      severity: error.severity,
      statusCode: error.statusCode,
      context: { ...fullContext, ...error.context },
      stack: error.stack,
      cause: error.cause instanceof Error ? error.cause : undefined,
      retryable: error.retryable,
      userMessage: error.userMessage,
    };
  }

  if (error instanceof Error) {
    return {
      id: generateErrorId(),
      message: error.message,
      category: categorizeError(error),
      severity: ErrorSeverity.MEDIUM,
      statusCode: 500,
      context: fullContext,
      stack: error.stack,
      retryable: false,
    };
  }

  return {
    id: generateErrorId(),
    message: String(error) || 'Unknown error occurred',
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.MEDIUM,
    statusCode: 500,
    context: fullContext,
    retryable: false,
  };
}

function categorizeError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();
  
  if (message.includes('auth') || message.includes('token')) {
    return ErrorCategory.AUTHENTICATION;
  }
  
  if (message.includes('permission') || message.includes('access')) {
    return ErrorCategory.AUTHORIZATION;
  }
  
  if (message.includes('validation') || message.includes('invalid')) {
    return ErrorCategory.VALIDATION;
  }
  
  if (message.includes('database') || message.includes('sql')) {
    return ErrorCategory.DATABASE;
  }
  
  if (message.includes('network') || message.includes('fetch')) {
    return ErrorCategory.EXTERNAL_API;
  }
  
  if (message.includes('rate') || message.includes('limit')) {
    return ErrorCategory.RATE_LIMIT;
  }

  return ErrorCategory.SYSTEM;
}

function generateErrorId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  return `err_${timestamp}_${random}`;
}

// API error response utilities
export function createErrorResponse(
  error: ApplicationError,
  isDevelopment = false
): NextResponse {
  const responseData: any = {
    error: {
      id: error.id,
      message: error.userMessage || ERROR_MESSAGES[error.category].user,
      category: error.category,
      retryable: error.retryable,
    },
  };

  // Include technical details in development
  if (isDevelopment) {
    responseData.error.technical = {
      message: error.message,
      stack: error.stack,
      context: error.context,
    };
  }

  // Add retry information for retryable errors
  if (error.retryable) {
    responseData.error.retryAfter = error.context.additionalData?.retryAfter || 60;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Error-ID': error.id,
  };

  // Add retry headers for rate limiting
  if (error.category === ErrorCategory.RATE_LIMIT) {
    headers['Retry-After'] = String(error.context.additionalData?.retryAfter || 60);
  }

  return new NextResponse(JSON.stringify(responseData), {
    status: error.statusCode,
    headers,
  });
}

// Request context extraction
export function extractRequestContext(request: NextRequest): Partial<ErrorContext> {
  return {
    ip: getClientIP(request),
    userAgent: request.headers.get('user-agent') || undefined,
    path: request.nextUrl.pathname,
    method: request.method,
    requestId: request.headers.get('x-request-id') || generateRequestId(),
  };
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfIP = request.headers.get('cf-connecting-ip');
  
  if (cfIP) return cfIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  return 'unknown';
}

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2)}`;
}

// Main error handling function for middleware
export async function handleError(
  error: unknown,
  request: NextRequest,
  additionalContext: Partial<ErrorContext> = {}
): Promise<NextResponse> {
  const context = {
    ...extractRequestContext(request),
    ...additionalContext,
  };

  const appError = createApplicationError(error, context);
  
  // Log error
  await errorLogger.logError(appError);
  
  // Create appropriate response
  const isDevelopment = process.env.NODE_ENV === 'development';
  return createErrorResponse(appError, isDevelopment);
}

// Error boundary utilities for React components
export function formatErrorForDisplay(error: ApplicationError): {
  title: string;
  message: string;
  canRetry: boolean;
  severity: ErrorSeverity;
} {
  return {
    title: ERROR_MESSAGES[error.category].user.split('.')[0],
    message: error.userMessage || ERROR_MESSAGES[error.category].user,
    canRetry: error.retryable,
    severity: error.severity,
  };
}

// Health check endpoint helper
export function createHealthCheckResponse(errors: ApplicationError[] = []): NextResponse {
  const hasErrors = errors.length > 0;
  const hasCriticalErrors = errors.some(e => e.severity === ErrorSeverity.CRITICAL);
  
  const status = hasCriticalErrors ? 503 : hasErrors ? 200 : 200;
  
  return NextResponse.json({
    status: hasCriticalErrors ? 'unhealthy' : hasErrors ? 'degraded' : 'healthy',
    timestamp: new Date().toISOString(),
    errors: errors.map(error => ({
      id: error.id,
      category: error.category,
      severity: error.severity,
      message: error.message,
    })),
  }, { status });
}

export {
  errorLogger,
}; 