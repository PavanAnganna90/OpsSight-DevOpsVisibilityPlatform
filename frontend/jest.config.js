const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Custom Jest configuration options
const customJestConfig = {
  // Test environment that will be used for testing
  testEnvironment: 'jsdom',

  // Setup files after environment
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Module name mapping for import resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/contexts/(.*)$': '<rootDir>/src/contexts/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/design-system/(.*)$': '<rootDir>/src/design-system/$1',
  },

  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],

  // Files to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/.next/',
    '/out/',
    '/cypress/',
    '/playwright/',
    '/__tests__/e2e/',
    '/__tests__/playwright/',
    '/__tests__/device-testing.spec.ts',
    '/__tests__/performance.spec.ts',
    '/__tests__/cross-browser.spec.ts',
    '/__tests__/accessibility.spec.ts',
    '/__tests__/global-setup.ts',
    // Ignore Vitest test files
    '\\.test\\.ts$',
    '\\.spec\\.ts$',
  ],

  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },

  // Transform ignore patterns
  transformIgnorePatterns: [
    '/node_modules/(?!(@?(@testing-library|react|next|@?redux|@?babel|@?mui|@?emotion|@?chakra-ui|@?date-io|@?material-ui|@?ant-design|@?rc-|@?recharts|@?d3|@?framer-motion|@?zod|@?zustand|@?radix-ui|@?shadcn|@?tailwindcss|@?jest|@?vitest|@?playwright)).*)',
  ],

  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>/'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.{test,spec}.{ts,tsx,js,jsx}',
    '!src/**/__tests__/**',
    '!src/**/*.d.ts',
    '!src/types/**',
    '!src/**/*.stories.{ts,tsx,js,jsx}',
    '!src/**/*.config.{ts,tsx,js,jsx}',
  ],

  // Coverage thresholds - targeting >80% coverage
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
    // More lenient thresholds for specific areas during development
    './src/utils/': {
      statements: 60,
      branches: 60,
      functions: 60,
      lines: 60,
    },
    './src/components/': {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
  },

  // Coverage collection options
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/coverage/',
    '/build/',
    '/dist/',
    '/public/',
    'jest.config.js',
    'jest.setup.js',
    'next.config.js',
    'tailwind.config.js',
  ],

  // Verbose output
  verbose: false,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Test timeout
  testTimeout: 10000,

  // Error handling
  errorOnDeprecated: false,

  // Max workers for parallel execution - optimized for CI
  maxWorkers: process.env.CI ? 2 : '50%',

  // Cache directory for better CI performance
  cacheDirectory: '.jest-cache',

  // Globals
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
      },
    },
    // Mock import.meta for Jest
    'import.meta': {
      env: {
        VITE_API_BASE_URL: 'http://localhost:8000/api/v1',
        VITE_GITHUB_CLIENT_ID: 'test-client-id',
        VITE_GITHUB_REDIRECT_URI: 'http://localhost:3000/auth/callback',
        MODE: 'test',
        DEV: false,
        PROD: false,
        SSR: false,
        NODE_ENV: 'test',
      },
      url: 'http://localhost:3000',
      hot: undefined,
    },
  },

  // Coverage directory
  coverageDirectory: 'coverage',

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
    'cobertura'
  ],

  // Collect coverage only when --coverage flag is used
  collectCoverage: false,
};

// Create Jest config using Next.js Jest
module.exports = createJestConfig(customJestConfig); 