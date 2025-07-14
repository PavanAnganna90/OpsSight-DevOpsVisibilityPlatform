import React, { createContext, useContext, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { setOnlineStatus } from '../store/slices/offlineSlice';

interface NetworkContextType {
  isOnline: boolean;
  isConnected: boolean;
  connectionType: string | null;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

interface NetworkProviderProps {
  children: React.ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const [networkState, setNetworkState] = React.useState({
    isOnline: true,
    isConnected: true,
    connectionType: null as string | null,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isOnline = state.isConnected && state.isInternetReachable;
      const connectionType = state.type;
      
      setNetworkState({
        isOnline: isOnline ?? false,
        isConnected: state.isConnected ?? false,
        connectionType,
      });
      
      dispatch(setOnlineStatus(isOnline ?? false));
    });

    return () => unsubscribe();
  }, [dispatch]);

  return (
    <NetworkContext.Provider value={networkState}>
      {children}
    </NetworkContext.Provider>
  );
};