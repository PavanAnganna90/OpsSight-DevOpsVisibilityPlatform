import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAppDispatch, useAppSelector } from '../hooks';
import { loginSuccess, logout, setBiometricEnabled, setLoading } from '../store/slices/authSlice';
import { oauthService, OAuthProvider, AuthState } from '../services/OAuthService';

interface AuthContextType {
  // Traditional login
  login: (email: string, password: string) => Promise<void>;
  
  // OAuth SSO login
  loginWithProvider: (providerId: string) => Promise<void>;
  getAvailableProviders: () => OAuthProvider[];
  
  // Biometric authentication
  biometricLogin: () => Promise<void>;
  checkBiometricSupport: () => Promise<boolean>;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
  getSupportedBiometricTypes: () => Promise<LocalAuthentication.AuthenticationType[]>;
  
  // Session management
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  
  // State
  isInitializing: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { biometricEnabled } = useAppSelector(state => state.auth);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      dispatch(setLoading(true));
      setIsInitializing(true);

      // Check for stored OAuth authentication first
      const storedAuthData = await oauthService.getStoredAuthData();
      
      if (storedAuthData && storedAuthData.isAuthenticated) {
        // User is authenticated with OAuth
        dispatch(loginSuccess({
          user: storedAuthData.user,
          token: storedAuthData.tokens?.accessToken || '',
          refreshToken: storedAuthData.tokens?.refreshToken || '',
          provider: storedAuthData.provider || undefined,
          biometricEnabled: storedAuthData.biometricEnabled,
        }));
        
        // Register device with backend for notifications
        await oauthService.registerDeviceWithBackend(storedAuthData);
      } else {
        // Fallback to traditional auth check
        await checkStoredAuth();
      }

      // Update biometric status
      const biometricEnabled = await oauthService.isBiometricEnabled();
      dispatch(setBiometricEnabled(biometricEnabled));
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      dispatch(setLoading(false));
      setIsInitializing(false);
    }
  };

  const checkStoredAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const user = await AsyncStorage.getItem('auth_user');
      
      if (token && user) {
        dispatch(loginSuccess({
          user: JSON.parse(user),
          token,
          refreshToken: await AsyncStorage.getItem('refresh_token') || '',
        }));
      }
    } catch (error) {
      console.error('Error checking stored auth:', error);
    }
  };

  // Traditional email/password login
  const login = async (email: string, password: string) => {
    try {
      dispatch(setLoading(true));
      
      // Traditional login API call
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (response.ok) {
        await AsyncStorage.setItem('auth_token', data.token);
        await AsyncStorage.setItem('auth_user', JSON.stringify(data.user));
        await AsyncStorage.setItem('refresh_token', data.refreshToken);
        
        dispatch(loginSuccess({
          user: data.user,
          token: data.token,
          refreshToken: data.refreshToken,
        }));
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  // OAuth SSO login
  const loginWithProvider = async (providerId: string) => {
    try {
      dispatch(setLoading(true));
      
      const authState = await oauthService.authenticateWithProvider(providerId);
      
      dispatch(loginSuccess({
        user: authState.user,
        token: authState.tokens?.accessToken || '',
        refreshToken: authState.tokens?.refreshToken || '',
        provider: authState.provider || undefined,
        biometricEnabled: authState.biometricEnabled,
      }));

      // Register device with backend
      await oauthService.registerDeviceWithBackend(authState);
    } catch (error) {
      console.error('OAuth login error:', error);
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Get available OAuth providers
  const getAvailableProviders = (): OAuthProvider[] => {
    return oauthService.getAvailableProviders();
  };

  // Biometric authentication
  const biometricLogin = async () => {
    try {
      dispatch(setLoading(true));
      
      const authState = await oauthService.authenticateWithBiometric();
      
      if (authState && authState.isAuthenticated) {
        dispatch(loginSuccess({
          user: authState.user,
          token: authState.tokens?.accessToken || '',
          refreshToken: authState.tokens?.refreshToken || '',
          provider: authState.provider || undefined,
          biometricEnabled: authState.biometricEnabled,
        }));
      } else {
        throw new Error('Biometric authentication failed');
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const checkBiometricSupport = async (): Promise<boolean> => {
    return await oauthService.isBiometricSupported();
  };

  const enableBiometric = async () => {
    try {
      await oauthService.enableBiometric();
      dispatch(setBiometricEnabled(true));
    } catch (error) {
      console.error('Enable biometric error:', error);
      throw error;
    }
  };

  const disableBiometric = async () => {
    try {
      await oauthService.disableBiometric();
      dispatch(setBiometricEnabled(false));
    } catch (error) {
      console.error('Disable biometric error:', error);
      throw error;
    }
  };

  const getSupportedBiometricTypes = async (): Promise<LocalAuthentication.AuthenticationType[]> => {
    return await oauthService.getSupportedBiometricTypes();
  };

  // Session management
  const refreshSession = async () => {
    try {
      const authData = await oauthService.getStoredAuthData();
      
      if (authData && authData.isAuthenticated) {
        dispatch(loginSuccess({
          user: authData.user,
          token: authData.tokens?.accessToken || '',
          refreshToken: authData.tokens?.refreshToken || '',
          provider: authData.provider || undefined,
          biometricEnabled: authData.biometricEnabled,
        }));
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      // If refresh fails, logout user
      await logoutUser();
    }
  };

  const logoutUser = async () => {
    try {
      dispatch(setLoading(true));
      
      // OAuth logout
      await oauthService.logout();
      
      // Traditional auth cleanup
      await AsyncStorage.multiRemove([
        'auth_token',
        'auth_user',
        'refresh_token',
        'biometric_enabled',
      ]);
      
      dispatch(logout());
    } catch (error) {
      console.error('Logout error:', error);
      // Ensure local state is cleared even if remote logout fails
      dispatch(logout());
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        // Traditional login
        login,
        
        // OAuth SSO login
        loginWithProvider,
        getAvailableProviders,
        
        // Biometric authentication
        biometricLogin,
        checkBiometricSupport,
        enableBiometric,
        disableBiometric,
        getSupportedBiometricTypes,
        
        // Session management
        refreshSession,
        logout: logoutUser,
        
        // State
        isInitializing,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};