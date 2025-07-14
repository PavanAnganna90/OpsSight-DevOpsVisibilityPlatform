/**
 * Lighthouse CI Configuration
 * 
 * Configures Lighthouse CI for automated performance monitoring
 * of the DevOps application frontend.
 */

module.exports = {
  ci: {
    collect: {
      // URLs to test - adjust based on your deployment
      url: [
        'http://localhost:3000',
        'http://localhost:3000/login',
        'http://localhost:3000/profile',
        'http://localhost:3000/settings',
      ],
      // Start server before testing (for CI environments)
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'ready on',
      startServerReadyTimeout: 30000,
      // Number of runs per URL for more stable results
      numberOfRuns: 3,
      // Browser settings
      settings: {
        // Run in headless mode for CI
        chromeFlags: '--no-sandbox --disable-dev-shm-usage --headless',
        // Disable certain audits that may not be relevant
        skipAudits: [
          'uses-http2',
          'redirects-http',
          'uses-long-cache-ttl',
        ],
      },
    },
    assert: {
      // Performance thresholds - adjust based on your requirements
      assertions: {
        // Categories (0-1 scale, where 1 is perfect)
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.8 }],
        
        // Core Web Vitals thresholds
        'categories:pwa': 'off', // Disable PWA checks for now
        
        // Specific metric thresholds (in milliseconds)
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'first-meaningful-paint': ['error', { maxNumericValue: 2000 }],
        'speed-index': ['error', { maxNumericValue: 3000 }],
        'interactive': ['error', { maxNumericValue: 4000 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        
        // Resource optimization
        'unused-javascript': ['warn', { maxNumericValue: 20000 }], // 20kb unused JS
        'unused-css-rules': ['warn', { maxNumericValue: 10000 }], // 10kb unused CSS
        'render-blocking-resources': 'off', // May conflict with Next.js optimizations
        'unminified-css': 'error',
        'unminified-javascript': 'error',
        
        // Image optimization
        'modern-image-formats': 'warn',
        'uses-optimized-images': 'warn',
        'uses-responsive-images': 'warn',
        'efficient-animated-content': 'warn',
        
        // Accessibility
        'color-contrast': 'error',
        'image-alt': 'error',
        'label': 'error',
        'link-name': 'error',
        
        // Best practices
        'is-on-https': 'off', // May not be available in local testing
        'uses-https': 'off',
        'no-vulnerable-libraries': 'error',
        'csp-xss': 'warn',
      },
    },
    upload: {
      // Configure where to store/upload results
      target: 'temporary-public-storage', // For demo purposes
      // For production, consider:
      // target: 'lhci',
      // serverBaseUrl: 'https://your-lhci-server.com',
      // token: 'your-build-token',
    },
    server: {
      // LHCI server configuration (if using a dedicated server)
      // port: 9001,
      // storage: {
      //   storageMethod: 'sql',
      //   sqlDialect: 'sqlite',
      //   sqlDatabasePath: './lhci.db',
      // },
    },
  },
}; 