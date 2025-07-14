import React, { useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { store } from './src/store/store';
import { AppNavigator, RootStackParamList } from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/providers/ThemeProvider';
import { AuthProvider } from './src/providers/AuthProvider';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { LoadingProvider } from './src/providers/LoadingProvider';
import { NetworkProvider } from './src/providers/NetworkProvider';
import { theme } from './src/constants/theme';
import { deepLinkingService } from './src/services/DeepLinkingService';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <PaperProvider theme={theme}>
                <AuthProvider>
                  <LoadingProvider>
                    <NetworkProvider>
                      <ErrorBoundary>
                        <NavigationContainer
                          ref={navigationRef}
                          onReady={() => {
                            deepLinkingService.setNavigationRef(navigationRef.current!);
                            deepLinkingService.setIsReady();
                            deepLinkingService.init();
                          }}
                        >
                          <AppNavigator />
                        </NavigationContainer>
                        <StatusBar style="auto" />
                      </ErrorBoundary>
                    </NetworkProvider>
                  </LoadingProvider>
                </AuthProvider>
              </PaperProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}