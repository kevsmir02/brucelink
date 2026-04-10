import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useConnectionStore } from '../stores/connectionStore';

/**
 * Subscribes to OS network state changes via NetInfo.
 * When WiFi drops (isConnected === false), transitions connectionStore to 'disconnected'.
 * Mount this once at the app root level.
 */
export function useNetworkListener() {
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const { status } = useConnectionStore.getState();

      // Only transition to disconnected if we were previously in a connected-family state
      if (!state.isConnected && (status === 'connected' || status === 'connecting')) {
        useConnectionStore.getState().disconnect();
      }
    });

    return unsubscribe;
  }, []);
}
