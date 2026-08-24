import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

// Replace with your local server IP (e.g., http://192.168.1.5:3000) or production server URL
const DEFAULT_SERVER_URL = 'http://10.0.2.2:3000'; 

export function getSocket(customUrl?: string): Socket {
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

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
