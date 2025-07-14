/**
 * Lighthouse CI Configuration - Desktop
 * 
 * Desktop-specific configuration for Lighthouse CI performance testing.
 * Uses desktop viewport and faster network conditions.
 */

module.exports = {
  ci: {
    collect: {
      // URLs to test
      url: [
        'http://localhost:3000',
        'http://localhost:3000/login',
        'http://localhost:3000/profile',
        'http://localhost:3000/settings',
      ],
      // Start server before testing
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'ready on',
      startServerReadyTimeout: 30000,
      // Fewer runs for desktop testing
      numberOfRuns: 2,
      // Desktop-specific settings
      settings: {
        // Chrome flags for CI environment
        chromeFlags: '--no-sandbox --disable-dev-shm-usage --headless',
        // Desktop form factor
        formFactor: 'desktop',
        // Desktop throttling (faster network, no CPU throttling)
        throttling: {
          rttMs: 40,
          throughputKbps: 10240, // 10 Mbps
          cpuSlowdownMultiplier: 1, // No CPU throttling
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
        },
        // Desktop screen emulation
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false,
        },
        // Skip mobile-specific audits
        skipAudits: [
          'uses-http2',
          'redirects-http',
          'uses-long-cache-ttl',
          'tap-targets', // Mobile-specific
          'content-width', // Mobile-specific
        ],
      },
    },
    assert: {
      // Desktop performance thresholds (generally higher expectations)
      assertions: {
        // Categories (desktop should perform better)
        'categories:performance': ['warn', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.8 }],
        
        // Core Web Vitals for desktop (stricter thresholds)
        'first-contentful-paint': ['error', { maxNumericValue: 1500 }], // 1.5s
        'largest-contentful-paint': ['error', { maxNumericValue: 2000 }], // 2.0s
        'first-meaningful-paint': ['error', { maxNumericValue: 1500 }], // 1.5s
        'speed-index': ['error', { maxNumericValue: 2500 }], // 2.5s
        'interactive': ['error', { maxNumericValue: 3000 }], // 3.0s
        'total-blocking-time': ['error', { maxNumericValue: 200 }], // 200ms
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        
        // Resource optimization (desktop can handle more)
        'unused-javascript': ['warn', { maxNumericValue: 30000 }], // 30kb
        'unused-css-rules': ['warn', { maxNumericValue: 15000 }], // 15kb
        'unminified-css': 'error',
        'unminified-javascript': 'error',
        
        // Image optimization
        'modern-image-formats': 'warn',
        'uses-optimized-images': 'warn',
        'uses-responsive-images': 'warn',
        'efficient-animated-content': 'warn',
        
        // Accessibility (same standards)
        'color-contrast': 'error',
        'image-alt': 'error',
        'label': 'error',
        'link-name': 'error',
        
        // Best practices
        'no-vulnerable-libraries': 'error',
        'csp-xss': 'warn',
      },
    },
    upload: {
      // Store results temporarily
      target: 'temporary-public-storage',
    },
  },
}; 