import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for cross-browser and device testing
 * Supports Chrome, Firefox, Safari, Edge, and mobile devices
 * Includes accessibility testing and performance monitoring
 */
export default defineConfig({
  // Test directory
  testDir: './src/__tests__/e2e',
  
  // Global timeout
  timeout: 30 * 1000,
  
  // Expect timeout
  expect: {
    timeout: 5000
  },
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report.json' }],
    ['junit', { outputFile: 'playwright-results.xml' }],
    ...(process.env.CI ? [['github']] : [])
  ] as any,
  
  // Global setup
  globalSetup: require.resolve('./src/__tests__/e2e/global-setup.ts'),
  
  use: {
    // Base URL for tests
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    // Global test timeout
    actionTimeout: 0,
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Record video only on failures
    video: 'retain-on-failure',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
  },

  projects: [
    // Desktop Browsers
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        // Enable accessibility testing
        contextOptions: {
          reducedMotion: 'reduce', // Test with reduced motion
        }
      },
    },
    
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // Firefox-specific configurations
        launchOptions: {
          firefoxUserPrefs: {
            'media.navigator.streams.fake': true,
            'media.navigator.permission.disabled': true,
          }
        }
      },
    },
    
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        // Safari-specific configurations
      },
    },
    
    {
      name: 'Microsoft Edge',
      use: { 
        ...devices['Desktop Edge'],
        channel: 'msedge'
      },
    },

    // Mobile Devices - iOS
    {
      name: 'Mobile Safari iPhone 12',
      use: { ...devices['iPhone 12'] },
    },
    
    {
      name: 'Mobile Safari iPhone 12 Pro',
      use: { ...devices['iPhone 12 Pro'] },
    },
    
    {
      name: 'Mobile Safari iPhone SE',
      use: { ...devices['iPhone SE'] },
    },
    
    {
      name: 'Mobile Safari iPad',
      use: { ...devices['iPad Pro'] },
    },

    // Mobile Devices - Android
    {
      name: 'Mobile Chrome Pixel 5',
      use: { ...devices['Pixel 5'] },
    },
    
    {
      name: 'Mobile Chrome Galaxy S21',
      use: { ...devices['Galaxy S21'] },
    },
    
    {
      name: 'Mobile Chrome Galaxy Tab S4',
      use: { ...devices['Galaxy Tab S4'] },
    },

    // Custom Viewport Sizes
    {
      name: 'Desktop Large',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    
    {
      name: 'Desktop Ultra Wide',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 2560, height: 1440 },
      },
    },
    
    {
      name: 'Tablet Portrait',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
        isMobile: true,
        hasTouch: true,
      },
    },
    
    {
      name: 'Mobile Small',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 360, height: 640 },
        isMobile: true,
        hasTouch: true,
      },
    },

    // Accessibility Testing Projects
    {
      name: 'accessibility-chromium',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: {
          reducedMotion: 'reduce',
          forcedColors: 'active', // Test high contrast mode
        }
      },
      testMatch: '**/*accessibility*.spec.ts'
    },
    
    {
      name: 'accessibility-firefox',
      use: {
        ...devices['Desktop Firefox'],
        contextOptions: {
          reducedMotion: 'reduce',
        }
      },
      testMatch: '**/*accessibility*.spec.ts'
    },

    // Performance Testing Projects
    {
      name: 'performance-desktop',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      },
      testMatch: '**/*performance*.spec.ts'
    },
    
    {
      name: 'performance-mobile',
      use: {
        ...devices['Pixel 5'],
        launchOptions: {
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
      },
      testMatch: '**/*performance*.spec.ts'
    },
  ],

  // Local development server
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
}); 