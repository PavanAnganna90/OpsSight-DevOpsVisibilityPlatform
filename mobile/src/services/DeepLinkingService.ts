/**
 * Deep Linking Service for OpsSight Mobile App
 * 
 * Handles deep links and universal links for navigation
 */

import { Linking } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationRef = NavigationContainerRef<RootStackParamList>;

export interface DeepLinkRoute {
  name: keyof RootStackParamList;
  params?: any;
}

class DeepLinkingService {
  private navigationRef: NavigationRef | null = null;
  private initialUrl: string | null = null;
  private isReady = false;

  setNavigationRef(ref: NavigationRef) {
    this.navigationRef = ref;
  }

  setIsReady() {
    this.isReady = true;
    
    // Handle initial URL if the app was opened from a deep link
    if (this.initialUrl) {
      this.handleDeepLink(this.initialUrl);
      this.initialUrl = null;
    }
  }

  init() {
    // Handle deep links when app is already running
    Linking.addEventListener('url', this.handleUrlEvent);

    // Handle deep link when app is opened from background/closed state
    Linking.getInitialURL().then((url) => {
      if (url) {
        if (this.isReady && this.navigationRef) {
          this.handleDeepLink(url);
        } else {
          this.initialUrl = url;
        }
      }
    });
  }

  cleanup() {
    Linking.removeAllListeners('url');
  }

  private handleUrlEvent = (event: { url: string }) => {
    this.handleDeepLink(event.url);
  };

  private handleDeepLink(url: string) {
    if (!this.navigationRef || !this.isReady) {
      console.warn('Navigation not ready for deep link:', url);
      return;
    }

    const route = this.parseDeepLink(url);
    if (route) {
      console.log('Navigating to deep link route:', route);
      this.navigationRef.navigate(route.name as never, route.params as never);
    } else {
      console.warn('Could not parse deep link:', url);
    }
  }

  private parseDeepLink(url: string): DeepLinkRoute | null {
    try {
      const parsedUrl = new URL(url);
      const { pathname, searchParams } = parsedUrl;

      // Handle different URL patterns
      const segments = pathname.split('/').filter(Boolean);

      switch (segments[0]) {
        case 'dashboard':
          return { name: 'Main' };

        case 'alerts':
          if (segments[1]) {
            return {
              name: 'AlertDetail',
              params: { alertId: segments[1] }
            };
          }
          return { name: 'Main' }; // Navigate to alerts tab

        case 'teams':
          if (segments[1]) {
            return {
              name: 'TeamDetail',
              params: { teamId: segments[1] }
            };
          }
          return { name: 'Main' }; // Navigate to teams tab

        case 'profile':
          return { name: 'Profile' };

        case 'settings':
          return { name: 'Settings' };

        case 'notifications':
          return { name: 'Notifications' };

        case 'auth':
          // Handle OAuth callbacks and auth flows
          const code = searchParams.get('code');
          const state = searchParams.get('state');
          
          if (code && state) {
            // Handle OAuth callback
            return {
              name: 'Auth',
              params: { code, state }
            };
          }
          return { name: 'Auth' };

        default:
          // Default to main screen
          return { name: 'Main' };
      }
    } catch (error) {
      console.error('Error parsing deep link:', error);
      return null;
    }
  }

  // Helper methods for generating deep links

  generateDeepLink(route: DeepLinkRoute): string {
    const baseUrl = 'opssight://';
    
    switch (route.name) {
      case 'Main':
        return `${baseUrl}dashboard`;

      case 'AlertDetail':
        return `${baseUrl}alerts/${route.params?.alertId}`;

      case 'TeamDetail':
        return `${baseUrl}teams/${route.params?.teamId}`;

      case 'Profile':
        return `${baseUrl}profile`;

      case 'Settings':
        return `${baseUrl}settings`;

      case 'Notifications':
        return `${baseUrl}notifications`;

      case 'Auth':
        return `${baseUrl}auth`;

      default:
        return baseUrl;
    }
  }

  generateUniversalLink(route: DeepLinkRoute): string {
    const baseUrl = 'https://app.opssight.com';
    
    switch (route.name) {
      case 'Main':
        return `${baseUrl}/dashboard`;

      case 'AlertDetail':
        return `${baseUrl}/alerts/${route.params?.alertId}`;

      case 'TeamDetail':
        return `${baseUrl}/teams/${route.params?.teamId}`;

      case 'Profile':
        return `${baseUrl}/profile`;

      case 'Settings':
        return `${baseUrl}/settings`;

      case 'Notifications':
        return `${baseUrl}/notifications`;

      case 'Auth':
        return `${baseUrl}/auth`;

      default:
        return baseUrl;
    }
  }

  async openUrl(url: string): Promise<boolean> {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return true;
      } else {
        console.warn('URL not supported:', url);
        return false;
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      return false;
    }
  }

  // Share methods
  generateShareableLink(route: DeepLinkRoute): string {
    // For sharing, prefer universal links over custom schemes
    return this.generateUniversalLink(route);
  }

  async shareAlert(alertId: string): Promise<string> {
    return this.generateShareableLink({
      name: 'AlertDetail',
      params: { alertId }
    });
  }

  async shareTeam(teamId: string): Promise<string> {
    return this.generateShareableLink({
      name: 'TeamDetail',
      params: { teamId }
    });
  }

  async shareDashboard(): Promise<string> {
    return this.generateShareableLink({
      name: 'Main'
    });
  }
}

// Export singleton instance
export const deepLinkingService = new DeepLinkingService();
export default deepLinkingService;