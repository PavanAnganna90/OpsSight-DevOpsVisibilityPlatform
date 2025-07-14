// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock fetch globally with comprehensive implementation
const createFetchMock = () => {
  const mockFetch = jest.fn();
  
  // Default successful response
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    json: jest.fn().mockResolvedValue({}),
    text: jest.fn().mockResolvedValue(''),
    blob: jest.fn().mockResolvedValue(new Blob()),
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
    clone: jest.fn(() => ({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({}),
      text: jest.fn().mockResolvedValue(''),
    })),
  });
  
  return mockFetch;
};

global.fetch = createFetchMock();

// Also ensure fetch is available on window
if (typeof window !== 'undefined') {
  window.fetch = global.fetch;
}

// Mock import.meta.env for Vite environment variables
const mockImportMeta = {
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
};

// Mock for ES modules
Object.defineProperty(global, 'import', {
  value: {
    meta: mockImportMeta,
  },
  writable: true,
  configurable: true,
});

// Mock for direct import.meta usage
if (typeof global.import === 'undefined') {
  global.import = { meta: mockImportMeta };
}

// Ensure import.meta is available in all contexts
global.importMeta = mockImportMeta;

// Mock Next.js router (legacy)
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '',
      query: {},
      asPath: '',
      push: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    };
  },
}));

// Mock Next.js App Router navigation hooks
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  useParams() {
    return {};
  },
  redirect: jest.fn(),
  permanentRedirect: jest.fn(),
  notFound: jest.fn(),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Enhanced DOM setup for proper test environment
beforeEach(() => {
  // Reset DOM state before each test (if document.body exists)
  if (document && document.body) {
    document.body.innerHTML = '';
    document.body.className = '';
  }
  
  // Clear all localStorage data (check if clear method exists)
  if (localStorage && typeof localStorage.clear === 'function') {
    localStorage.clear();
  }
  
  // Reset all mocks
  jest.clearAllMocks();

  // Mock document.activeElement if needed (only if not already defined)
  if (document && typeof document.activeElement === 'undefined') {
    try {
      Object.defineProperty(document, 'activeElement', {
        value: null,
        writable: true,
        configurable: true,
      });
    } catch (e) {
      // Ignore if already defined
    }
  }


});

// Mock localStorage with proper implementation
const createLocalStorageMock = () => {
  let store = new Map();
  
  return {
    getItem: jest.fn((key) => store.get(key) || null),
    setItem: jest.fn((key, value) => {
      store.set(key, String(value));
    }),
    removeItem: jest.fn((key) => {
      store.delete(key);
    }),
    clear: jest.fn(() => {
      store.clear();
    }),
    get length() {
      return store.size;
    },
    key: jest.fn((index) => {
      const keys = Array.from(store.keys());
      return keys[index] || null;
    }),
  };
};

Object.defineProperty(window, 'localStorage', {
  value: createLocalStorageMock(),
  writable: true,
});

// Mock sessionStorage as well
Object.defineProperty(window, 'sessionStorage', {
  value: createLocalStorageMock(),
  writable: true,
});

// Mock matchMedia for theme context tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
  value: (element) => ({
    getPropertyValue: jest.fn((prop) => {
      if (prop === 'color') return 'rgb(0, 0, 0)';
      if (prop === 'background-color') return 'rgb(255, 255, 255)';
      return '';
    }),
    backgroundColor: 'rgb(255, 255, 255)',
    color: 'rgb(0, 0, 0)',
  }),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock Web Animations API
global.Animation = class Animation {
  constructor() {
    this.playState = 'idle';
    this.ready = Promise.resolve();
    this.finished = Promise.resolve();
  }
  play() {
    this.playState = 'running';
    return this;
  }
  pause() {
    this.playState = 'paused';
    return this;
  }
  cancel() {
    this.playState = 'idle';
    return this;
  }
  finish() {
    this.playState = 'finished';
    return this;
  }
};

// Mock Element.animate
if (!Element.prototype.animate) {
  Element.prototype.animate = jest.fn(() => new Animation());
}

// Ensure DOM elements have required methods
if (typeof Element !== 'undefined') {
  // Mock getAttribute if not present
  if (!Element.prototype.getAttribute) {
    Element.prototype.getAttribute = jest.fn(function(name) {
      return this.attributes && this.attributes[name] ? this.attributes[name].value : null;
    });
  }
  
  // Mock setAttribute if not present
  if (!Element.prototype.setAttribute) {
    Element.prototype.setAttribute = jest.fn(function(name, value) {
      if (!this.attributes) this.attributes = {};
      this.attributes[name] = { value: String(value) };
    });
  }
  
  // Mock removeAttribute if not present
  if (!Element.prototype.removeAttribute) {
    Element.prototype.removeAttribute = jest.fn(function(name) {
      if (this.attributes && this.attributes[name]) {
        delete this.attributes[name];
      }
    });
  }
  
  // Mock focus if not present
  if (!Element.prototype.focus) {
    Element.prototype.focus = jest.fn();
  }
  
  // Mock blur if not present
  if (!Element.prototype.blur) {
    Element.prototype.blur = jest.fn();
  }
  
  // Mock click if not present
  if (!Element.prototype.click) {
    Element.prototype.click = jest.fn();
  }
}

// Mock Performance API for theme transition tests
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    navigation: {
      type: 0
    },
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000
    }
  },
  writable: true,
});

// Suppress console warnings during tests unless VERBOSE_TESTS is set
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  if (!process.env.VERBOSE_TESTS) {
    console.warn = jest.fn();
    console.error = jest.fn();
  }
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

// Mock import.meta for Vite environment variables
if (!global.import) {
  Object.defineProperty(global, 'import', {
    value: {
      meta: {
        env: {
          VITE_GITHUB_CLIENT_ID: 'test-client-id',
          VITE_GITHUB_REDIRECT_URI: 'http://localhost:3000/auth/callback',
          VITE_API_BASE_URL: 'http://localhost:8080/api',
          NODE_ENV: 'test',
          MODE: 'test'
        }
      }
    },
    writable: true,
    configurable: true,
  });
} else {
  // If import already exists, just update import.meta
  if (!global.import.meta) {
    global.import.meta = {
      env: {
        VITE_GITHUB_CLIENT_ID: 'test-client-id',
        VITE_GITHUB_REDIRECT_URI: 'http://localhost:3000/auth/callback',
        VITE_API_BASE_URL: 'http://localhost:8080/api',
        NODE_ENV: 'test',
        MODE: 'test'
      }
    };
  }
}

// Mock TextEncoder and TextDecoder for Node.js environment
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock DOM elements that may not exist in jsdom
if (typeof window !== 'undefined') {
  // Mock localStorage
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn()
  };
  
  if (!global.localStorage) {
    global.localStorage = localStorageMock;
  }
  
  // Mock sessionStorage
  if (!global.sessionStorage) {
    global.sessionStorage = localStorageMock;
  }
  
  // Mock IntersectionObserver
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
  
  // Mock ResizeObserver
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
  
  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Mock document methods more safely
if (typeof document !== 'undefined') {
  // Mock document.body methods safely
  if (document.body) {
    if (!document.body.classList) {
      document.body.classList = {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn(() => false),
        toggle: jest.fn(),
      };
    }
  }
}

// Mock environment variables for tests
process.env.VITE_GITHUB_CLIENT_ID = 'test-client-id';
process.env.VITE_API_BASE_URL = 'http://localhost:8000/api/v1';

// Mock monitoring system
jest.mock('@/utils/monitoring', () => ({
  initializeMonitoring: jest.fn(),
  trackEvent: jest.fn(),
  trackError: jest.fn(),
  setUser: jest.fn(),
  clearUser: jest.fn(),
}));

// Mock monitoring hooks
jest.mock('@/hooks/useMonitoring', () => ({
  useMonitoring: jest.fn(() => ({
    isInitialized: true,
    trackEvent: jest.fn(),
    trackError: jest.fn(),
    setUser: jest.fn(),
    clearUser: jest.fn(),
  })),
}));

// Mock notification service
jest.mock('@/services/notificationService', () => ({
  showNotification: jest.fn(),
  showError: jest.fn(),
  showSuccess: jest.fn(),
  showWarning: jest.fn(),
}));

// Mock websocket service with comprehensive implementation
jest.mock('@/services/websocket', () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  send: jest.fn(),
  isConnected: jest.fn(() => true),
  getWebSocketService: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    send: jest.fn(),
    isConnected: jest.fn(() => true),
    isConnectedStatus: jest.fn(() => true),
    getConnectionStatus: jest.fn(() => 'connected'),
    onConnectionChange: jest.fn(),
    removeConnectionListener: jest.fn(),
  })),
  createWebSocketService: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    send: jest.fn(),
    isConnected: jest.fn(() => true),
    isConnectedStatus: jest.fn(() => true),
  })),
}));

// Remove problematic mocks for now

// Mock analytics utils
jest.mock('@/utils/analytics', () => ({
  trackEvent: jest.fn(),
  trackError: jest.fn(),
  trackPageView: jest.fn(),
})); 