/**
 * Sentry configuration for server-side error tracking in OpsSight frontend.
 * 
 * This configuration sets up Sentry for:
 * - Server-side error tracking
 * - API route error monitoring
 * - Build-time error reporting
 */

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.ENVIRONMENT || "development";
const VERSION = process.env.VERSION || "0.1.0";

Sentry.init({
  dsn: SENTRY_DSN,
  environment: ENVIRONMENT,
  release: `opssight-frontend-server@${VERSION}`,
  
  // Performance monitoring (lower rate for server-side)
  tracesSampleRate: getTracesSampleRate(),
  
  // Custom tags
  initialScope: {
    tags: {
      component: "frontend-server",
      framework: "nextjs-ssr",
    },
  },
  
  // Error filtering
  beforeSend(event, hint) {
    // Filter out development errors
    if (ENVIRONMENT === "development") {
      console.log("Sentry Server Event:", event);
    }
    
    return event;
  },
});

/**
 * Get the appropriate traces sample rate based on environment.
 */
function getTracesSampleRate(): number {
  switch (ENVIRONMENT) {
    case "production":
      return 0.05; // 5% sampling in production for server-side
    case "staging":
      return 0.2; // 20% sampling in staging
    default:
      return 0.5; // 50% sampling in development
  }
} 