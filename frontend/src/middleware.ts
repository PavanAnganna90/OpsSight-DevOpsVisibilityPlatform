/**
 * Security Middleware for Next.js
 * Comprehensive security implementation with CSP, rate limiting, and security headers
 */

import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiting (replace with Redis in production)
class SimpleRateLimit {
  private requests = new Map<string, { count: number; windowStart: number }>();
  private limit: number;
  private windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  async checkLimit(key: string) {
    const now = Date.now();
    const existing = this.requests.get(key);

    if (!existing || now - existing.windowStart >= this.windowMs) {
      // New window
      this.requests.set(key, { count: 1, windowStart: now });
      return {
        success: true,
        limit: this.limit,
        remaining: this.limit - 1,
        reset: now + this.windowMs,
      };
    }

    if (existing.count >= this.limit) {
      return {
        success: false,
        limit: this.limit,
        remaining: 0,
        reset: existing.windowStart + this.windowMs,
      };
    }

    existing.count++;
    this.requests.set(key, existing);

    return {
      success: true,
      limit: this.limit,
      remaining: this.limit - existing.count,
      reset: existing.windowStart + this.windowMs,
    };
  }
}

// Rate limiting configuration
const ratelimit = new SimpleRateLimit(100, 60000); // 100 requests per minute
const apiRatelimit = new SimpleRateLimit(50, 60000); // 50 API requests per minute

// Content Security Policy
const CSP_HEADER = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' blob: data: https://*.vercel.app https://vercel.com;
  font-src 'self' https://fonts.gstatic.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  connect-src 'self' https://vercel.live https://api.vercel.com wss://ws-us3.pusher.com https://sockjs-us3.pusher.com;
  media-src 'self' blob:;
  worker-src 'self' blob:;
  manifest-src 'self';
`.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();

// Security headers
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: CSP_HEADER,
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'false',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
];

// Development CSP (more permissive)
const DEV_CSP_HEADER = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' blob: data: https:;
  font-src 'self' https://fonts.gstatic.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  connect-src 'self' ws: wss:;
  media-src 'self' blob:;
  worker-src 'self' blob:;
  manifest-src 'self';
`.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();

// IP geolocation and threat detection
const BLOCKED_COUNTRIES = ['CN', 'RU', 'KP']; // Example blocked countries
const BLOCKED_IPS = new Set<string>([
  // Add known malicious IPs when identified
]);

async function isBlocked(request: NextRequest): Promise<boolean> {
  const ip = getClientIP(request);
  
  // Check blocked IPs
  if (BLOCKED_IPS.has(ip)) {
    return true;
  }

  // Check country-based blocking (in production, use a geolocation service)
  try {
    if (process.env.NODE_ENV === 'production') {
      // Example geolocation check (replace with actual service)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      try {
        const geoResponse = await fetch(`https://ipapi.co/${ip}/country_code/`, {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (geoResponse.ok) {
          const countryCode = await geoResponse.text();
          if (BLOCKED_COUNTRIES.includes(countryCode.trim())) {
            return true;
          }
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    }
  } catch (error) {
    // Log but don't block on geolocation errors
    console.warn('Geolocation check failed:', error);
  }

  return false;
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

function detectSuspiciousPatterns(request: NextRequest): boolean {
  const url = request.url;
  const userAgent = request.headers.get('user-agent') || '';
  
  // SQL injection patterns
  const sqlInjectionPatterns = [
    /union.*select/i,
    /drop.*table/i,
    /insert.*into/i,
    /delete.*from/i,
    /exec.*xp_/i,
  ];

  // XSS patterns
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /expression\s*\(/i,
  ];

  // Path traversal patterns
  const pathTraversalPatterns = [
    /\.\.\//,
    /\.\.%2f/i,
    /%2e%2e%2f/i,
  ];

  // Check URL for suspicious patterns
  const allPatterns = [...sqlInjectionPatterns, ...xssPatterns, ...pathTraversalPatterns];
  for (const pattern of allPatterns) {
    if (pattern.test(url)) {
      return true;
    }
  }

  // Check for suspicious user agents
  const suspiciousUserAgents = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
  ];

  // Allow legitimate bots (Google, Bing, etc.)
  const legitimateBots = [
    /googlebot/i,
    /bingbot/i,
    /slurp/i,
    /duckduckbot/i,
  ];

  const isSuspiciousUA = suspiciousUserAgents.some(pattern => pattern.test(userAgent));
  const isLegitimateBot = legitimateBots.some(pattern => pattern.test(userAgent));

  return isSuspiciousUA && !isLegitimateBot;
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;
  
  // Security logging
  console.log(`[Security] ${request.method} ${pathname} from ${getClientIP(request)}`);

  // 1. Check for blocked IPs/countries
  if (await isBlocked(request)) {
    console.warn(`[Security] Blocked request from ${getClientIP(request)}`);
    return new NextResponse('Access Denied', { status: 403 });
  }

  // 2. Detect suspicious patterns
  if (detectSuspiciousPatterns(request)) {
    console.warn(`[Security] Suspicious pattern detected: ${request.url}`);
    return new NextResponse('Bad Request', { status: 400 });
  }

  // 3. Apply rate limiting
  try {
    let rateLimitResult;
    
    if (pathname.startsWith('/api/')) {
      // Stricter rate limiting for API routes
      rateLimitResult = await apiRatelimit.checkLimit(getClientIP(request));
    } else {
      // General page rate limiting
      rateLimitResult = await ratelimit.checkLimit(getClientIP(request));
    }

    if (!rateLimitResult.success) {
      console.warn(`[Security] Rate limit exceeded for ${getClientIP(request)}`);
      return new NextResponse('Too Many Requests', { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
        }
      });
    }

    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.reset).toISOString());
  } catch (error) {
    // Log rate limiting errors but don't block requests
    console.error('[Security] Rate limiting error:', error);
  }

  // 4. Apply security headers
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  securityHeaders.forEach(({ key, value }) => {
    if (key === 'Content-Security-Policy') {
      // Use more permissive CSP in development
      response.headers.set(key, isDevelopment ? DEV_CSP_HEADER : value);
    } else if (key === 'Strict-Transport-Security' && isDevelopment) {
      // Skip HSTS in development
      return;
    } else {
      response.headers.set(key, value);
    }
  });

  // 5. Additional security measures for API routes
  if (pathname.startsWith('/api/')) {
    // Add API-specific security headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
    
    // Validate content type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentType = request.headers.get('content-type');
      if (contentType && !contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
        console.warn(`[Security] Invalid content type: ${contentType}`);
        return new NextResponse('Unsupported Media Type', { status: 415 });
      }
    }
  }

  // 6. Security headers for static assets
  if (pathname.startsWith('/_next/static/') || pathname.includes('.')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

// Additional security utilities
export class SecurityLogger {
  static logSecurityEvent(event: {
    type: 'blocked' | 'suspicious' | 'rate_limit' | 'authentication' | 'authorization';
    ip: string;
    userAgent?: string;
    url?: string;
    details?: any;
  }) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'security',
      ...event,
    };

    console.warn('[SECURITY EVENT]', JSON.stringify(logEntry));
    
    // In production, send to security monitoring service
    if (process.env.NODE_ENV === 'production' && process.env.SECURITY_WEBHOOK_URL) {
      fetch(process.env.SECURITY_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry),
      }).catch(error => {
        console.error('Failed to send security log:', error);
      });
    }
  }
}

export { getClientIP, detectSuspiciousPatterns }; 