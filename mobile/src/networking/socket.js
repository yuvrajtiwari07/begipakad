import { io } from 'socket.io-client';

let socket = null;
let socketUrl = null;
let profile = null;

// Replace with your local server IP (e.g., http://192.168.1.5:3000) or production server URL
const DEFAULT_SERVER_URL = 'http://10.0.2.2:3000';

// Sent in the handshake of every (re)connect, so the server knows who we are before it
// handles anything queued while offline (e.g. a matchmaking tap before the first connect).
export function setSocketProfile(p) {
  profile = p;
}

export function getSocket(customUrl) {
  const targetUrl = customUrl || DEFAULT_SERVER_URL;
  if (socket && socketUrl !== targetUrl) {
    socket.disconnect();
    socket = null;
  }
  if (!socket) {
    socketUrl = targetUrl;
    socket = io(targetUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
      auth: (cb) => cb(profile ? { profile: { id: profile.id, name: profile.name, avatarSeed: 'avatar_1' } } : {}),
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketUrl = null;
  }
}
