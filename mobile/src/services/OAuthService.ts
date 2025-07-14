import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Ensure WebBrowser can properly handle the auth flow
WebBrowser.maybeCompleteAuthSession();

export interface OAuthProvider {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  color: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  enabled: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  tokenType: string;
  expiresIn?: number;
  scope?: string;
  expiresAt?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  provider: string;
  providerData: any;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  tokens: AuthTokens | null;
  provider: string | null;
  biometricEnabled: boolean;
}

class OAuthService {
  private readonly SECURE_STORE_KEYS = {
    TOKENS: 'oauth_tokens',
    USER: 'oauth_user',
    PROVIDER: 'oauth_provider',
    BIOMETRIC_ENABLED: 'biometric_enabled',
    REFRESH_TOKEN: 'refresh_token',
  };

  private readonly providers: OAuthProvider[] = [
    {
      id: 'google',
      name: 'google',
      displayName: 'Google',
      icon: 'logo-google',
      color: '#4285F4',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      scopes: ['openid', 'profile', 'email'],
      enabled: true,
    },
    {
      id: 'microsoft',
      name: 'microsoft',
      displayName: 'Microsoft',
      icon: 'logo-microsoft',
      color: '#0078D4',
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
      scopes: ['openid', 'profile', 'email', 'User.Read'],
      enabled: true,
    },
    {
      id: 'github',
      name: 'github',
      displayName: 'GitHub',
      icon: 'logo-github',
      color: '#333333',
      authUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      userInfoUrl: 'https://api.github.com/user',
      scopes: ['user:email', 'read:user'],
      enabled: true,
    },
    {
      id: 'gitlab',
      name: 'gitlab',
      displayName: 'GitLab',
      icon: 'git-branch',
      color: '#FC6D26',
      authUrl: 'https://gitlab.com/oauth/authorize',
      tokenUrl: 'https://gitlab.com/oauth/token',
      userInfoUrl: 'https://gitlab.com/api/v4/user',
      scopes: ['read_user', 'openid', 'profile', 'email'],
      enabled: true,
    },
  ];

  // Get the redirect URI for the current platform
  private getRedirectUri(): string {
    if (Platform.OS === 'web') {
      return `${window.location.origin}/auth/callback`;
    }
    
    // For native apps, use the custom scheme
    const scheme = Constants.expoConfig?.scheme || 'opssight';
    return `${scheme}://auth/callback`;
  }

  // Get available OAuth providers
  getAvailableProviders(): OAuthProvider[] {
    return this.providers.filter(provider => provider.enabled);
  }

  // Get provider configuration by ID
  getProvider(providerId: string): OAuthProvider | undefined {
    return this.providers.find(p => p.id === providerId);
  }

  // Create OAuth request configuration
  private createAuthRequest(provider: OAuthProvider): AuthSession.AuthRequestConfig {
    return {
      clientId: this.getClientId(provider.id),
      scopes: provider.scopes,
      responseType: AuthSession.ResponseType.Code,
      redirectUri: this.getRedirectUri(),
      additionalParameters: this.getAdditionalParameters(provider.id),
    };
  }

  // Get client ID from environment/config
  private getClientId(providerId: string): string {
    const clientIds = {
      google: Constants.expoConfig?.extra?.oauth?.google?.clientId || '',
      microsoft: Constants.expoConfig?.extra?.oauth?.microsoft?.clientId || '',
      github: Constants.expoConfig?.extra?.oauth?.github?.clientId || '',
      gitlab: Constants.expoConfig?.extra?.oauth?.gitlab?.clientId || '',
    };
    
    return clientIds[providerId as keyof typeof clientIds] || '';
  }

  // Get additional parameters for specific providers
  private getAdditionalParameters(providerId: string): Record<string, string> {
    const additionalParams: Record<string, Record<string, string>> = {
      microsoft: {
        prompt: 'select_account',
        response_mode: 'query',
      },
      google: {
        access_type: 'offline',
        prompt: 'consent',
      },
      github: {
        allow_signup: 'true',
      },
      gitlab: {
        // GitLab specific parameters
      },
    };

    return additionalParams[providerId] || {};
  }

  // Initialize OAuth authentication for a provider
  async authenticateWithProvider(providerId: string): Promise<AuthState> {
    try {
      const provider = this.getProvider(providerId);
      if (!provider) {
        throw new Error(`Provider ${providerId} not found`);
      }

      const clientId = this.getClientId(providerId);
      if (!clientId) {
        throw new Error(`Client ID not configured for ${providerId}`);
      }

      // Create auth request
      const authRequestConfig = this.createAuthRequest(provider);
      const authRequest = new AuthSession.AuthRequest(authRequestConfig);

      // Create auth request URL
      const authRequestUrl = await authRequest.makeAuthUrlAsync({
        authorizationEndpoint: provider.authUrl,
      });

      // Perform authentication
      const authResponse = await AuthSession.startAsync({
        authUrl: authRequestUrl.url,
        returnUrl: this.getRedirectUri(),
      });

      if (authResponse.type !== 'success') {
        throw new Error(`Authentication failed: ${authResponse.type}`);
      }

      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(
        provider,
        authResponse.params.code,
        authRequest.codeVerifier
      );

      // Get user profile
      const userProfile = await this.getUserProfile(provider, tokens.accessToken);

      // Create auth state
      const authState: AuthState = {
        isAuthenticated: true,
        user: userProfile,
        tokens,
        provider: providerId,
        biometricEnabled: await this.isBiometricEnabled(),
      };

      // Store authentication data securely
      await this.storeAuthData(authState);

      return authState;
    } catch (error) {
      console.error('OAuth authentication error:', error);
      throw error;
    }
  }

  // Exchange authorization code for access tokens
  private async exchangeCodeForTokens(
    provider: OAuthProvider,
    code: string,
    codeVerifier?: string
  ): Promise<AuthTokens> {
    try {
      const tokenRequestParams: Record<string, string> = {
        grant_type: 'authorization_code',
        client_id: this.getClientId(provider.id),
        code,
        redirect_uri: this.getRedirectUri(),
      };

      // Add code verifier for PKCE (if available)
      if (codeVerifier) {
        tokenRequestParams.code_verifier = codeVerifier;
      }

      // Add client secret for providers that require it
      const clientSecret = this.getClientSecret(provider.id);
      if (clientSecret) {
        tokenRequestParams.client_secret = clientSecret;
      }

      const response = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams(tokenRequestParams).toString(),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Token exchange failed: ${response.status} ${errorData}`);
      }

      const tokenData = await response.json();

      const tokens: AuthTokens = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        idToken: tokenData.id_token,
        tokenType: tokenData.token_type || 'Bearer',
        expiresIn: tokenData.expires_in,
        scope: tokenData.scope,
        expiresAt: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : undefined,
      };

      return tokens;
    } catch (error) {
      console.error('Token exchange error:', error);
      throw error;
    }
  }

  // Get client secret from environment/config
  private getClientSecret(providerId: string): string | undefined {
    const clientSecrets = {
      google: Constants.expoConfig?.extra?.oauth?.google?.clientSecret,
      microsoft: Constants.expoConfig?.extra?.oauth?.microsoft?.clientSecret,
      github: Constants.expoConfig?.extra?.oauth?.github?.clientSecret,
      gitlab: Constants.expoConfig?.extra?.oauth?.gitlab?.clientSecret,
    };
    
    return clientSecrets[providerId as keyof typeof clientSecrets];
  }

  // Get user profile from provider
  private async getUserProfile(provider: OAuthProvider, accessToken: string): Promise<UserProfile> {
    try {
      const response = await fetch(provider.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get user profile: ${response.status}`);
      }

      const userData = await response.json();
      
      // Normalize user data based on provider
      return this.normalizeUserProfile(provider, userData);
    } catch (error) {
      console.error('Get user profile error:', error);
      throw error;
    }
  }

  // Normalize user profile data from different providers
  private normalizeUserProfile(provider: OAuthProvider, userData: any): UserProfile {
    switch (provider.id) {
      case 'google':
        return {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          firstName: userData.given_name,
          lastName: userData.family_name,
          avatar: userData.picture,
          provider: provider.id,
          providerData: userData,
        };

      case 'microsoft':
        return {
          id: userData.id,
          email: userData.mail || userData.userPrincipalName,
          name: userData.displayName,
          firstName: userData.givenName,
          lastName: userData.surname,
          avatar: undefined, // Microsoft Graph doesn't provide avatar in basic profile
          provider: provider.id,
          providerData: userData,
        };

      case 'github':
        return {
          id: userData.id.toString(),
          email: userData.email,
          name: userData.name || userData.login,
          firstName: userData.name?.split(' ')[0],
          lastName: userData.name?.split(' ').slice(1).join(' '),
          avatar: userData.avatar_url,
          provider: provider.id,
          providerData: userData,
        };

      case 'gitlab':
        return {
          id: userData.id.toString(),
          email: userData.email,
          name: userData.name,
          firstName: userData.name?.split(' ')[0],
          lastName: userData.name?.split(' ').slice(1).join(' '),
          avatar: userData.avatar_url,
          provider: provider.id,
          providerData: userData,
        };

      default:
        return {
          id: userData.id || userData.sub,
          email: userData.email,
          name: userData.name || userData.display_name,
          avatar: userData.picture || userData.avatar_url,
          provider: provider.id,
          providerData: userData,
        };
    }
  }

  // Store authentication data securely
  private async storeAuthData(authState: AuthState): Promise<void> {
    try {
      await Promise.all([
        SecureStore.setItemAsync(this.SECURE_STORE_KEYS.TOKENS, JSON.stringify(authState.tokens)),
        SecureStore.setItemAsync(this.SECURE_STORE_KEYS.USER, JSON.stringify(authState.user)),
        SecureStore.setItemAsync(this.SECURE_STORE_KEYS.PROVIDER, authState.provider || ''),
      ]);

      // Store refresh token separately for additional security
      if (authState.tokens?.refreshToken) {
        await SecureStore.setItemAsync(
          this.SECURE_STORE_KEYS.REFRESH_TOKEN,
          authState.tokens.refreshToken
        );
      }
    } catch (error) {
      console.error('Error storing auth data:', error);
      throw error;
    }
  }

  // Retrieve stored authentication data
  async getStoredAuthData(): Promise<AuthState | null> {
    try {
      const [tokensJson, userJson, provider] = await Promise.all([
        SecureStore.getItemAsync(this.SECURE_STORE_KEYS.TOKENS),
        SecureStore.getItemAsync(this.SECURE_STORE_KEYS.USER),
        SecureStore.getItemAsync(this.SECURE_STORE_KEYS.PROVIDER),
      ]);

      if (!tokensJson || !userJson || !provider) {
        return null;
      }

      const tokens: AuthTokens = JSON.parse(tokensJson);
      const user: UserProfile = JSON.parse(userJson);

      // Check if tokens are expired
      if (this.isTokenExpired(tokens)) {
        // Try to refresh tokens
        const refreshedTokens = await this.refreshTokens(provider, tokens.refreshToken);
        if (refreshedTokens) {
          tokens.accessToken = refreshedTokens.accessToken;
          tokens.expiresAt = refreshedTokens.expiresAt;
          if (refreshedTokens.refreshToken) {
            tokens.refreshToken = refreshedTokens.refreshToken;
          }
          
          // Update stored tokens
          await SecureStore.setItemAsync(this.SECURE_STORE_KEYS.TOKENS, JSON.stringify(tokens));
        } else {
          // Refresh failed, clear stored data
          await this.clearStoredAuthData();
          return null;
        }
      }

      return {
        isAuthenticated: true,
        user,
        tokens,
        provider,
        biometricEnabled: await this.isBiometricEnabled(),
      };
    } catch (error) {
      console.error('Error retrieving stored auth data:', error);
      return null;
    }
  }

  // Check if token is expired
  private isTokenExpired(tokens: AuthTokens): boolean {
    if (!tokens.expiresAt) {
      return false; // If no expiry info, assume valid
    }
    
    // Add 5 minute buffer before actual expiry
    return Date.now() >= (tokens.expiresAt - 5 * 60 * 1000);
  }

  // Refresh access tokens
  async refreshTokens(providerId: string, refreshToken?: string): Promise<AuthTokens | null> {
    try {
      const provider = this.getProvider(providerId);
      if (!provider || !refreshToken) {
        return null;
      }

      const tokenRequestParams = {
        grant_type: 'refresh_token',
        client_id: this.getClientId(provider.id),
        refresh_token: refreshToken,
      };

      const clientSecret = this.getClientSecret(provider.id);
      if (clientSecret) {
        Object.assign(tokenRequestParams, { client_secret: clientSecret });
      }

      const response = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams(tokenRequestParams).toString(),
      });

      if (!response.ok) {
        console.error('Token refresh failed:', response.status);
        return null;
      }

      const tokenData = await response.json();

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken, // Keep old refresh token if new one not provided
        tokenType: tokenData.token_type || 'Bearer',
        expiresIn: tokenData.expires_in,
        expiresAt: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : undefined,
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  // Clear stored authentication data
  async clearStoredAuthData(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(this.SECURE_STORE_KEYS.TOKENS),
        SecureStore.deleteItemAsync(this.SECURE_STORE_KEYS.USER),
        SecureStore.deleteItemAsync(this.SECURE_STORE_KEYS.PROVIDER),
        SecureStore.deleteItemAsync(this.SECURE_STORE_KEYS.REFRESH_TOKEN),
      ]);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  // Biometric authentication methods
  async isBiometricSupported(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      return hasHardware && isEnrolled && supportedTypes.length > 0;
    } catch (error) {
      console.error('Error checking biometric support:', error);
      return false;
    }
  }

  async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await SecureStore.getItemAsync(this.SECURE_STORE_KEYS.BIOMETRIC_ENABLED);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking biometric enabled status:', error);
      return false;
    }
  }

  async enableBiometric(): Promise<void> {
    try {
      const isSupported = await this.isBiometricSupported();
      if (!isSupported) {
        throw new Error('Biometric authentication not supported');
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometric authentication for OpsSight',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        await SecureStore.setItemAsync(this.SECURE_STORE_KEYS.BIOMETRIC_ENABLED, 'true');
      } else {
        throw new Error('Biometric authentication failed');
      }
    } catch (error) {
      console.error('Error enabling biometric:', error);
      throw error;
    }
  }

  async disableBiometric(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.SECURE_STORE_KEYS.BIOMETRIC_ENABLED);
    } catch (error) {
      console.error('Error disabling biometric:', error);
      throw error;
    }
  }

  async authenticateWithBiometric(): Promise<AuthState | null> {
    try {
      const isEnabled = await this.isBiometricEnabled();
      if (!isEnabled) {
        throw new Error('Biometric authentication not enabled');
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access OpsSight',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        return await this.getStoredAuthData();
      } else {
        throw new Error('Biometric authentication failed');
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      throw error;
    }
  }

  // Logout and revoke tokens
  async logout(provider?: string): Promise<void> {
    try {
      // Get current tokens for revocation
      const authData = await this.getStoredAuthData();
      
      if (authData && authData.tokens?.accessToken) {
        // Attempt to revoke tokens on the provider side
        await this.revokeTokens(authData.provider!, authData.tokens.accessToken);
      }

      // Clear local storage
      await this.clearStoredAuthData();
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local storage even if revocation fails
      await this.clearStoredAuthData();
    }
  }

  // Revoke tokens on provider side
  private async revokeTokens(providerId: string, accessToken: string): Promise<void> {
    try {
      const revokeUrls: Record<string, string> = {
        google: 'https://oauth2.googleapis.com/revoke',
        microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/logout',
        github: 'https://github.com/settings/applications', // GitHub doesn't have a revoke endpoint
        gitlab: 'https://gitlab.com/oauth/revoke',
      };

      const revokeUrl = revokeUrls[providerId];
      if (!revokeUrl || providerId === 'github') {
        // Some providers don't support token revocation
        return;
      }

      await fetch(revokeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: accessToken,
        }).toString(),
      });
    } catch (error) {
      console.error('Token revocation error:', error);
      // Don't throw error, as local logout should still succeed
    }
  }

  // Get supported biometric types
  async getSupportedBiometricTypes(): Promise<LocalAuthentication.AuthenticationType[]> {
    try {
      return await LocalAuthentication.supportedAuthenticationTypesAsync();
    } catch (error) {
      console.error('Error getting supported biometric types:', error);
      return [];
    }
  }

  // Register device with backend for push notifications
  async registerDeviceWithBackend(authState: AuthState): Promise<void> {
    try {
      if (!authState.tokens?.accessToken) {
        throw new Error('No access token available');
      }

      // This would call your backend API to register the device
      const response = await fetch('/api/v1/auth/register-device', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authState.tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: authState.provider,
          user_id: authState.user?.id,
          device_info: {
            platform: Platform.OS,
            app_version: Constants.expoConfig?.version,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register device with backend');
      }
    } catch (error) {
      console.error('Device registration error:', error);
      // Don't throw error, as authentication should still succeed
    }
  }
}

export const oauthService = new OAuthService();