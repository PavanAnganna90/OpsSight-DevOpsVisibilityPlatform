/**
 * Sentry configuration for client-side error tracking in OpsSight frontend.
 * 
 * This configuration sets up Sentry for:
 * - Error tracking and reporting
 * - Performance monitoring
 * - User session tracking
 * - Custom error boundaries
 */

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || "development";
const VERSION = process.env.NEXT_PUBLIC_VERSION || "0.1.0";

Sentry.init({
  dsn: SENTRY_DSN,
  environment: ENVIRONMENT,
  release: `opssight-frontend@${VERSION}`,
  
  // Performance monitoring
  tracesSampleRate: getTracesSampleRate(),
  
  // Session tracking
  autoSessionTracking: true,
  
  // Error filtering
  beforeSend(event, hint) {
    // Filter out development errors
    if (ENVIRONMENT === "development") {
      console.log("Sentry Event:", event);
    }
    
    // Filter out common non-critical errors
    if (event.exception) {
      const error = hint.originalException;
      
      // Filter out network errors that are expected
      if (error instanceof TypeError && error.message.includes("fetch")) {
        return null;
      }
      
      // Filter out ResizeObserver errors (common browser quirk)
      if (error instanceof Error && error.message.includes("ResizeObserver")) {
        return null;
      }
    }
    
    return event;
  },
  
  // Custom tags
  initialScope: {
    tags: {
      component: "frontend",
      framework: "nextjs",
    },
  },
});

/**
 * Get the appropriate traces sample rate based on environment.
 */
function getTracesSampleRate(): number {
  switch (ENVIRONMENT) {
    case "production":
      return 0.1; // 10% sampling in production
    case "staging":
      return 0.5; // 50% sampling in staging
    default:
      return 1.0; // 100% sampling in development
  }
}

/**
 * Capture an exception with additional context.
 */
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureException(error);
  });
}

/**
 * Capture a message with additional context.
 */
export function captureMessage(message: string, level = "info", context?: Record<string, any>) {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    scope.setLevel(level as any);
    Sentry.captureMessage(message);
  });
}

/**
 * Set user context for error tracking.
 */
export function setUserContext(user: { id?: string; email?: string; [key: string]: any }) {
  Sentry.setUser(user);
}

/**
 * Add breadcrumb for debugging.
 */
export function addBreadcrumb(message: string, category = "custom", level = "info") {
  Sentry.addBreadcrumb({
    message,
    category,
    level: level as any,
    timestamp: Date.now() / 1000,
  });
} 