import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '../game/types';
import { getUserProfile } from '../services/storage';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || undefined;
    socket = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // Re-evaluated on every (re)connect, so the server knows who we are and can
      // restore the game before handling anything else this socket sends.
      auth: (cb) => {
        const { id, name, avatarSeed } = getUserProfile();
        cb({ profile: { id, name, avatarSeed } });
      },
    });
  }
  return socket;
}
