import express from 'express';
import http from 'http';
import path from 'path';
import { Server, Socket } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { GameManager } from './server/src/game/GameManager.ts';
import { MatchmakingService } from './server/src/matchmaking/MatchmakingService.ts';
import { RoomManager, RoomPlayer } from './server/src/rooms/RoomManager.ts';
import { ClientToServerEvents, ServerToClientEvents } from './src/game/types.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = http.createServer(app);

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const roomManager = new RoomManager();
  const matchmakingService = new MatchmakingService();
  const gameManager = new GameManager(io);

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      game: 'Begi Pakad',
      time: Date.now(),
    });
  });

  // Socket.IO Connection Handler
  io.on('connection', (socket: Socket) => {
    let currentUserId: string | null = null;
    let currentUserName: string = 'Player';
    let currentUserAvatar: string = 'avatar_1';

    socket.on('user:init', (profile) => {
      currentUserId = profile.id;
      currentUserName = profile.name;
      currentUserAvatar = profile.avatarSeed;
      gameManager.registerPlayerSocket(profile.id, socket.id);

      // Check if player has an active game to reconnect to
      const reconnectView = gameManager.handleReconnect(profile.id, socket.id);
      if (reconnectView) {
        socket.emit('game:started', reconnectView);
      }
    });

    // Create Private Room
    socket.on('room:create', () => {
      if (!currentUserId) return;
      const hostPlayer: RoomPlayer = {
        id: currentUserId,
        name: currentUserName,
        avatarSeed: currentUserAvatar,
        socketId: socket.id,
        seatIndex: 0,
        isReady: true,
        isBot: false,
        isConnected: true,
      };

      const room = roomManager.createRoom(hostPlayer);
      socket.join(room.roomId);
      socket.emit('room:created', room.toInfo());
    });

    // Join Room
    socket.on('room:join', (roomId: string) => {
      if (!currentUserId) return;
      const cleanRoomId = roomId.trim().toUpperCase();
      const room = roomManager.getRoom(cleanRoomId);

      if (!room) {
        socket.emit('room:error', 'Room not found with ID: ' + cleanRoomId);
        return;
      }

      if (room.isGameStarted) {
        socket.emit('room:error', 'Game has already started in this room');
        return;
      }

      if (room.players.length >= 4) {
        socket.emit('room:error', 'Room is already full (4/4 players)');
        return;
      }

      const existingPlayer = room.players.find((p) => p.id === currentUserId);
      if (!existingPlayer) {
        const player: RoomPlayer = {
          id: currentUserId,
          name: currentUserName,
          avatarSeed: currentUserAvatar,
          socketId: socket.id,
          seatIndex: room.players.length,
          isReady: true,
          isBot: false,
          isConnected: true,
        };
        room.addPlayer(player);
      }

      socket.join(room.roomId);
      socket.emit('room:joined', room.toInfo());
      io.to(room.roomId).emit('room:updated', room.toInfo());
    });

    // Leave Room
    socket.on('room:leave', () => {
      if (!currentUserId) return;
      const room = roomManager.getRoomByPlayerId(currentUserId);
      if (room) {
        room.removePlayer(currentUserId);
        socket.leave(room.roomId);
        if (room.players.length === 0) {
          roomManager.removeRoom(room.roomId);
        } else {
          io.to(room.roomId).emit('room:updated', room.toInfo());
        }
      }
    });

    // Add Bot to Room
    socket.on('room:addBot', (seatIndex: number, difficulty: 'easy' | 'medium' | 'hard') => {
      if (!currentUserId) return;
      const room = roomManager.getRoomByPlayerId(currentUserId);
      if (room && room.hostPlayerId === currentUserId && !room.isGameStarted) {
        room.addBot(seatIndex, difficulty);
        io.to(room.roomId).emit('room:updated', room.toInfo());
      }
    });

    // Remove Bot from Room
    socket.on('room:removeBot', (seatIndex: number) => {
      if (!currentUserId) return;
      const room = roomManager.getRoomByPlayerId(currentUserId);
      if (room && room.hostPlayerId === currentUserId && !room.isGameStarted) {
        room.removeBot(seatIndex);
        io.to(room.roomId).emit('room:updated', room.toInfo());
      }
    });

    // Start Room Game
    socket.on('room:start', () => {
      if (!currentUserId) return;
      const room = roomManager.getRoomByPlayerId(currentUserId);
      if (room && room.hostPlayerId === currentUserId && !room.isGameStarted) {
        const engine = gameManager.startGame(room);
        io.to(room.roomId).emit('room:updated', room.toInfo());
      }
    });

    // Matchmaking Join
    socket.on('matchmaking:join', () => {
      if (!currentUserId) return;
      const player: RoomPlayer = {
        id: currentUserId,
        name: currentUserName,
        avatarSeed: currentUserAvatar,
        socketId: socket.id,
        seatIndex: 0,
        isReady: true,
        isBot: false,
        isConnected: true,
      };

      const status = matchmakingService.joinQueue(player);
      // Broadcast updated count to all players currently in queue
      const queuePlayers = matchmakingService.getQueuePlayers();
      for (const qp of queuePlayers) {
        if (qp.socketId) {
          io.to(qp.socketId).emit('matchmaking:status', {
            inQueue: true,
            playersCount: queuePlayers.length,
            targetCount: 4,
          });
        }
      }

      // Check if 4 matched
      const matched = matchmakingService.getMatchedPlayers();
      if (matched) {
        const host = matched[0];
        const room = roomManager.createRoom(host);
        for (let i = 1; i < matched.length; i++) {
          room.addPlayer(matched[i]);
        }
        for (const p of matched) {
          if (p.socketId) {
            const clientSocket = io.sockets.sockets.get(p.socketId);
            if (clientSocket) {
              clientSocket.join(room.roomId);
            }
          }
        }
        gameManager.startGame(room);
      }
    });

    // Matchmaking Leave
    socket.on('matchmaking:leave', () => {
      if (currentUserId) {
        matchmakingService.leaveQueue(currentUserId);
        socket.emit('matchmaking:status', { inQueue: false, playersCount: 0, targetCount: 4 });
        
        // Broadcast updated count to remaining players in queue
        const remaining = matchmakingService.getQueuePlayers();
        for (const qp of remaining) {
          if (qp.socketId) {
            io.to(qp.socketId).emit('matchmaking:status', {
              inQueue: true,
              playersCount: remaining.length,
              targetCount: 4,
            });
          }
        }
      }
    });

    // Game Actions
    socket.on('game:submitPass', (cardIds: string[]) => {
      if (!currentUserId) return;
      const res = gameManager.handlePlayerPass(currentUserId, cardIds);
      if (!res.success) {
        socket.emit('error:message', res.error || 'Failed to submit pass');
      }
    });

    socket.on('game:playCard', (cardId: string) => {
      if (!currentUserId) return;
      const res = gameManager.handlePlayerPlayCard(currentUserId, cardId);
      if (!res.success) {
        socket.emit('error:message', res.error || 'Failed to play card');
      }
    });

    socket.on('game:sendQuickMessage', (messageText: string) => {
      if (!currentUserId) return;
      gameManager.handleQuickMessage(currentUserId, messageText);
    });

    socket.on('game:replaceWithBot', () => {
      if (!currentUserId) return;
      gameManager.handleReplacePlayerWithBot(currentUserId);
    });

    socket.on('game:exitAndEnd', () => {
      if (!currentUserId) return;
      gameManager.handleExitAndEndGame(currentUserId);
    });

    socket.on('game:hostEndGame', () => {
      if (!currentUserId) return;
      gameManager.handleHostEndGame(currentUserId);
    });

    socket.on('game:nextRound', () => {
      if (!currentUserId) return;
      gameManager.handleNextRound(currentUserId);
    });

    socket.on('game:reconnect', (payload) => {
      const clientView = gameManager.handleReconnect(payload.playerId, socket.id);
      if (clientView) {
        socket.emit('game:started', clientView);
      }
    });

    // Disconnect Handler
    socket.on('disconnect', () => {
      if (currentUserId) {
        matchmakingService.leaveQueue(currentUserId);
        gameManager.unregisterSocket(socket.id);
        const session = gameManager.findSessionByPlayerId(currentUserId);
        if (session) {
          const player = session.room.players.find((p) => p.id === currentUserId);
          if (player) {
            player.isConnected = false;
            io.to(session.room.roomId).emit('game:playerDisconnected', currentUserId);
          }
        }
      }
    });
  });

  // Explicit route for mobile APK download
  app.get('/BegiPakad.apk', (req, res) => {
    const apkPath = path.join(process.cwd(), 'public', 'BegiPakad.apk');
    res.download(apkPath, 'BegiPakad.apk', (err) => {
      if (err && !res.headersSent) {
        res.status(404).send('APK file not found');
      }
    });
  });

  // Vite middleware in dev, Static in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Begi Pakad Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
