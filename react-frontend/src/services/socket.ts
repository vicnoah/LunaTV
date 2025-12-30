import { io, Socket } from 'socket.io-client';

// The URL of the Go backend. In development, this will be proxied by Vite.
// In production, the frontend and backend will be served from the same origin.
const SOCKET_URL = '/';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      // The Go library we used only supports WebSocket transport, so we force it here.
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Socket.IO connected successfully!');
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected.');
    });

    // We can add more global event listeners here if needed.
  }
  return socket;
};

// Function to disconnect the socket, e.g., when a user logs out.
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
