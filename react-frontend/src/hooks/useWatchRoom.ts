import { useCallback, useState } from 'react';
import { getSocket, disconnectSocket } from '../services/socket';

// This is a simplified version for the initial migration.
// We will add more state and functions as we build out the feature.
export interface UseWatchRoomReturn {
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
}

export function useWatchRoom(): UseWatchRoomReturn {
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    const socket = getSocket();

    const onConnect = () => {
      console.log('[WatchRoom] Connected!');
      setConnected(true);
    };

    const onDisconnect = () => {
      console.log('[WatchRoom] Disconnected.');
      setConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Clean up listeners on hook unmount or re-render
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const disconnect = useCallback(() => {
    disconnectSocket();
    setConnected(false);
  }, []);

  return {
    connected,
    connect,
    disconnect,
  };
}
