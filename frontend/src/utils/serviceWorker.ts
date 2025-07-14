/**
 * Service Worker Registration and Management
 * 
 * Handles service worker registration, updates, and communication
 */

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
);

export interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

/**
 * Register service worker
 */
export function registerServiceWorker(config: ServiceWorkerConfig = {}) {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    const publicUrl = new URL(process.env.PUBLIC_URL || '', window.location.href);
    
    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/sw.js`;

      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then(() => {
          console.log(
            'This web app is being served cache-first by a service worker.'
          );
        });
      } else {
        registerValidServiceWorker(swUrl, config);
      }
    });
  }

  // Listen for online/offline events
  window.addEventListener('online', () => {
    console.log('Back online');
    config.onOnline?.();
  });

  window.addEventListener('offline', () => {
    console.log('Gone offline');
    config.onOffline?.();
  });
}

/**
 * Register valid service worker
 */
function registerValidServiceWorker(swUrl: string, config: ServiceWorkerConfig) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('Service Worker registered successfully');
      
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('New content is available and will be used when all tabs are closed.');
              config.onUpdate?.(registration);
            } else {
              console.log('Content is cached for offline use.');
              config.onSuccess?.(registration);
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
}

/**
 * Check if service worker is valid
 */
function checkValidServiceWorker(swUrl: string, config: ServiceWorkerConfig) {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidServiceWorker(swUrl, config);
      }
    })
    .catch(() => {
      console.log('No internet connection found. App is running in offline mode.');
    });
}

/**
 * Unregister service worker
 */
export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error('Service Worker unregistration failed:', error);
      });
  }
}

/**
 * Update service worker
 */
export function updateServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.update();
      })
      .catch((error) => {
        console.error('Service Worker update failed:', error);
      });
  }
}

/**
 * Send message to service worker
 */
export function sendMessageToServiceWorker(message: any) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  }
}

/**
 * Listen for service worker messages
 */
export function listenForServiceWorkerMessages(callback: (message: any) => void) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      callback(event.data);
    });
  }
}

/**
 * Check if app is running offline
 */
export function isOffline(): boolean {
  return !navigator.onLine;
}

/**
 * Check if service worker is supported
 */
export function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator;
}

/**
 * Get service worker registration
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if ('serviceWorker' in navigator) {
    try {
      return await navigator.serviceWorker.ready;
    } catch (error) {
      console.error('Failed to get service worker registration:', error);
      return null;
    }
  }
  return null;
}

/**
 * Background sync for offline actions
 */
export async function requestBackgroundSync(tag: string = 'background-sync') {
  const registration = await getServiceWorkerRegistration();
  if (registration && 'sync' in registration) {
    try {
      await (registration as any).sync.register(tag);
      console.log('Background sync registered');
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  }
}

/**
 * Cache API response
 */
export async function cacheApiResponse(request: Request, response: Response) {
  if ('caches' in window) {
    try {
      const cache = await caches.open('api-cache');
      await cache.put(request, response.clone());
    } catch (error) {
      console.error('Failed to cache API response:', error);
    }
  }
}

/**
 * Get cached API response
 */
export async function getCachedApiResponse(request: Request): Promise<Response | null> {
  if ('caches' in window) {
    try {
      const cache = await caches.open('api-cache');
      return await cache.match(request);
    } catch (error) {
      console.error('Failed to get cached API response:', error);
      return null;
    }
  }
  return null;
}

/**
 * Clear all caches
 */
export async function clearAllCaches() {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('All caches cleared');
    } catch (error) {
      console.error('Failed to clear caches:', error);
    }
  }
}

/**
 * Performance monitoring
 */
export function reportPerformanceMetrics() {
  if ('performance' in window) {
    const metrics = {
      navigation: performance.getEntriesByType('navigation')[0],
      resources: performance.getEntriesByType('resource'),
      marks: performance.getEntriesByType('mark'),
      measures: performance.getEntriesByType('measure'),
    };

    sendMessageToServiceWorker({
      type: 'PERFORMANCE_REPORT',
      metrics,
    });
  }
}