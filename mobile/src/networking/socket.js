import { io } from 'socket.io-client';

let socket = null;

// Replace with your local server IP (e.g., http://192.168.1.5:3000) or production server URL
const DEFAULT_SERVER_URL = 'http://10.0.2.2:3000'; 

export function getSocket(customUrl) {
  if (!socket) {
    const targetUrl = customUrl || DEFAULT_SERVER_URL;
    socket = io(targetUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
