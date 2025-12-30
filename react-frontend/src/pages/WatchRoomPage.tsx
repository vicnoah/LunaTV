import { useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import { useWatchRoom } from '../hooks/useWatchRoom';

const WatchRoomPage = () => {
  const { connected, connect, disconnect } = useWatchRoom();

  // Automatically try to connect when the component mounts
  useEffect(() => {
    connect();

    // Disconnect when the component unmounts
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return (
    <PageLayout>
      <div className="py-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Watch Room</h1>
        <p className="text-lg mb-6">
          Connection Status:{' '}
          <span
            className={connected ? 'text-green-500' : 'text-red-500'}
          >
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </p>
        <div className="space-x-4">
          <button
            onClick={connect}
            disabled={connected}
            className="px-6 py-2 bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Connect
          </button>
          <button
            onClick={disconnect}
            disabled={!connected}
            className="px-6 py-2 bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            Disconnect
          </button>
        </div>
      </div>
    </PageLayout>
  );
};

export default WatchRoomPage;
