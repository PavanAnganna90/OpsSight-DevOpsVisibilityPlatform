/**
 * ServiceWorkerProvider Component
 * 
 * Provides service worker registration and offline functionality
 */

'use client';

import React, { useEffect, useState } from 'react';
import { registerServiceWorker, isServiceWorkerSupported } from '@/utils/serviceWorker';

interface ServiceWorkerProviderProps {
  children: React.ReactNode;
}

export const ServiceWorkerProvider: React.FC<ServiceWorkerProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [showUpdateAvailable, setShowUpdateAvailable] = useState(false);

  useEffect(() => {
    // Initialize online status
    setIsOnline(navigator.onLine);

    // Register service worker
    if (isServiceWorkerSupported()) {
      registerServiceWorker({
        onSuccess: (registration) => {
          console.log('Service Worker registered successfully');
        },
        onUpdate: (registration) => {
          console.log('Service Worker update available');
          setShowUpdateAvailable(true);
        },
        onOffline: () => {
          setIsOnline(false);
        },
        onOnline: () => {
          setIsOnline(true);
        },
      });
    }

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleUpdateApp = () => {
    window.location.reload();
  };

  return (
    <>
      {children}
      
      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg animate-slide-down">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-sm font-medium">You're offline</span>
          </div>
        </div>
      )}

      {/* Update available notification */}
      {showUpdateAvailable && (
        <div className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm animate-slide-up">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-sm">Update Available</h4>
              <p className="text-blue-100 text-xs mt-1">
                A new version of OpsSight is available. Refresh to update.
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleUpdateApp}
                  className="bg-white text-blue-600 px-3 py-1 rounded text-xs font-medium hover:bg-blue-50 transition-colors"
                >
                  Update Now
                </button>
                <button
                  onClick={() => setShowUpdateAvailable(false)}
                  className="text-blue-200 hover:text-white px-3 py-1 rounded text-xs transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ServiceWorkerProvider;