import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInfo {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  canInstall: boolean;
  platform: string;
  isOnline: boolean;
  updateAvailable: boolean;
}

export function usePWA() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [pwaInfo, setPwaInfo] = useState<PWAInfo>({
    isInstallable: false,
    isInstalled: false,
    isStandalone: false,
    canInstall: false,
    platform: 'unknown',
    isOnline: navigator.onLine,
    updateAvailable: false
  });
  const { addToast } = useToast();

  useEffect(() => {
    // Check if app is running in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone ||
                        document.referrer.includes('android-app://');

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    let platform = 'unknown';
    if (userAgent.includes('android')) platform = 'android';
    else if (userAgent.includes('iphone') || userAgent.includes('ipad')) platform = 'ios';
    else if (userAgent.includes('windows')) platform = 'windows';
    else if (userAgent.includes('mac')) platform = 'macos';
    else if (userAgent.includes('linux')) platform = 'linux';

    // Check if PWA is installable
    const isInstallable = 'serviceWorker' in navigator && 'PushManager' in window;

    setPwaInfo(prev => ({
      ...prev,
      isStandalone,
      isInstalled: isStandalone,
      isInstallable,
      platform,
      canInstall: isInstallable && !isStandalone
    }));

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setPwaInfo(prev => ({ ...prev, canInstall: true }));
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setPwaInfo(prev => ({
        ...prev,
        isInstalled: true,
        canInstall: false
      }));
      
      addToast({
        type: 'success',
        title: 'App Installed!',
        description: 'OpsSight has been installed successfully',
        duration: 5000
      });
    };

    // Listen for online/offline events
    const handleOnline = () => {
      setPwaInfo(prev => ({ ...prev, isOnline: true }));
      addToast({
        type: 'success',
        title: 'Back Online',
        description: 'Connection restored',
        duration: 3000
      });
    };

    const handleOffline = () => {
      setPwaInfo(prev => ({ ...prev, isOnline: false }));
      addToast({
        type: 'warning',
        title: 'Offline Mode',
        description: 'Working with cached data',
        duration: 5000
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addToast]);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setPwaInfo(prev => ({ ...prev, updateAvailable: true }));
                  
                  addToast({
                    type: 'info',
                    title: 'Update Available',
                    description: 'A new version of OpsSight is ready',
                    duration: 8000,
                    action: {
                      label: 'Refresh',
                      onClick: () => {
                        newWorker.postMessage({ type: 'SKIP_WAITING' });
                        window.location.reload();
                      }
                    }
                  });
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
        });

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'BACKGROUND_SYNC_COMPLETE') {
          addToast({
            type: 'success',
            title: 'Sync Complete',
            description: 'Data synchronized successfully',
            duration: 3000
          });
        }
      });
    }
  }, [addToast]);

  // Install PWA
  const installPWA = async (): Promise<boolean> => {
    if (!installPrompt) {
      // iOS Safari specific handling
      if (pwaInfo.platform === 'ios') {
        addToast({
          type: 'info',
          title: 'Install OpsSight',
          description: 'Tap the Share button, then "Add to Home Screen"',
          duration: 8000
        });
        return false;
      }
      return false;
    }

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setInstallPrompt(null);
        setPwaInfo(prev => ({ ...prev, canInstall: false }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error installing PWA:', error);
      return false;
    }
  };

  // Update PWA
  const updatePWA = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registration.update();
          addToast({
            type: 'info',
            title: 'Checking for Updates',
            description: 'Looking for new version...',
            duration: 3000
          });
        }
      });
    }
  };

  // Clear cache
  const clearCache = async () => {
    if ('serviceWorker' in navigator && 'caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        
        addToast({
          type: 'success',
          title: 'Cache Cleared',
          description: 'All cached data has been removed',
          duration: 3000
        });
        
        // Optionally reload the page
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        console.error('Error clearing cache:', error);
        addToast({
          type: 'error',
          title: 'Cache Clear Failed',
          description: 'Failed to clear cached data',
          duration: 5000
        });
      }
    }
  };

  // Share content (Web Share API)
  const share = async (data: { title?: string; text?: string; url?: string }) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: data.title || 'OpsSight Dashboard',
          text: data.text || 'Check out my DevOps metrics on OpsSight',
          url: data.url || window.location.href
        });
        return true;
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
        return false;
      }
    }
    
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(data.url || window.location.href);
      addToast({
        type: 'success',
        title: 'Link Copied',
        description: 'Dashboard link copied to clipboard',
        duration: 3000
      });
      return true;
    } catch (error) {
      return false;
    }
  };

  // Request persistent storage
  const requestPersistentStorage = async () => {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const persistent = await navigator.storage.persist();
        if (persistent) {
          addToast({
            type: 'success',
            title: 'Storage Persistent',
            description: 'Data will be saved permanently',
            duration: 3000
          });
        }
        return persistent;
      } catch (error) {
        console.error('Error requesting persistent storage:', error);
        return false;
      }
    }
    return false;
  };

  // Get storage estimate
  const getStorageEstimate = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
          usageInMB: ((estimate.usage || 0) / 1024 / 1024).toFixed(2),
          quotaInMB: ((estimate.quota || 0) / 1024 / 1024).toFixed(2),
          percentageUsed: estimate.quota ? ((estimate.usage || 0) / estimate.quota * 100).toFixed(1) : '0'
        };
      } catch (error) {
        console.error('Error getting storage estimate:', error);
        return null;
      }
    }
    return null;
  };

  return {
    pwaInfo,
    installPWA,
    updatePWA,
    clearCache,
    share,
    requestPersistentStorage,
    getStorageEstimate
  };
}