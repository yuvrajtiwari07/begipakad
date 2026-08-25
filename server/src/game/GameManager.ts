import { Server, Socket } from 'socket.io';
import { BotAI } from '../../../src/game/Bot.ts';
import { GameEngine } from '../../../src/game/GameEngine.ts';
import { ClientGameState, Player, TeamId } from '../../../src/game/types.ts';
import { Room, RoomPlayer } from '../rooms/RoomManager.ts';

export class GameManager {
  private io: Server;
  private activeGames: Map<string, { engine: GameEngine; room: Room }> = new Map();
  private playerSocketMap: Map<string, string> = new Map(); // userId -> socketId
  private socketPlayerMap: Map<string, string> = new Map(); // socketId -> userId

  constructor(io: Server) {
    this.io = io;
  }

  public registerPlayerSocket(playerId: string, socketId: string): void {
    this.playerSocketMap.set(playerId, socketId);
    this.socketPlayerMap.set(socketId, playerId);
  }

  public unregisterSocket(socketId: string): string | undefined {
    const playerId = this.socketPlayerMap.get(socketId);
    if (playerId) {
      this.socketPlayerMap.delete(socketId);
      this.playerSocketMap.delete(playerId);
    }
    return playerId;
  }

  public getPlayerId(socketId: string): string | undefined {
    return this.socketPlayerMap.get(socketId);
  }

  public startGame(room: Room): GameEngine {
    // Fill any empty seats up to 4 with bots if needed
    const takenSeats = new Set(room.players.map((p) => p.seatIndex));
    for (let s = 0; s < 4; s++) {
      if (!takenSeats.has(s)) {
        room.addBot(s, 'medium');
      }
    }

    // Sort players by seatIndex
    room.players.sort((a, b) => a.seatIndex - b.seatIndex);

    const gamePlayers: Player[] = room.players.map((rp, index) => ({
      id: rp.id,
      name: rp.name,
      avatarSeed: rp.avatarSeed,
      seatIndex: index,
      teamId: (index % 2 === 0 ? 1 : 2) as TeamId,
      isBot: rp.isBot,
      botDifficulty: rp.botDifficulty || 'medium',
      isConnected: true,
      score: 0,
      tricksWonThisHand: 0,
      cardsRemaining: 13,
    }));

    const engine = new GameEngine(gamePlayers, undefined, room.roomId);
    room.isGameStarted = true;
    room.gameEngine = engine;
    this.activeGames.set(engine.getState().gameId, { engine, room });

    // Broadcast game:started with personalized client views to all human players
    for (const p of room.players) {
      if (!p.isBot) {
        const socketId = this.playerSocketMap.get(p.id);
        if (socketId) {
          const clientView = engine.getClientView(p.seatIndex);
          this.io.to(socketId).emit('game:started', clientView);
        }
      }
    }

    // Trigger bots to select passes
    this.handleBotPassing(engine, room);

    return engine;
  }

  public broadcastGameUpdate(engine: GameEngine, room: Room): void {
    for (const p of room.players) {
      if (!p.isBot) {
        const socketId = this.playerSocketMap.get(p.id);
        if (socketId) {
          const clientView = engine.getClientView(p.seatIndex);
          this.io.to(socketId).emit('game:stateUpdate', clientView);
        }
      }
    }
  }

  public handlePlayerPass(playerId: string, cardIds: string[]): { success: boolean; error?: string } {
    const session = this.findSessionByPlayerId(playerId);
    if (!session) return { success: false, error: 'Game session not found' };

    const { engine, room } = session;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found in game' };

    const result = engine.submitPass(player.seatIndex, cardIds);
    if (!result.success) return result;

    this.broadcastGameUpdate(engine, room);

    // If all submitted, engine moves to PLAYER_TURN
    if (engine.getState().phase === 'PLAYER_TURN') {
      this.checkAndExecuteBotTurns(engine, room);
    }

    return { success: true };
  }

  public handlePlayerPlayCard(playerId: string, cardId: string): { success: boolean; error?: string } {
    const session = this.findSessionByPlayerId(playerId);
    if (!session) return { success: false, error: 'Game session not found' };

    const { engine, room } = session;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found in game' };

    const result = engine.playCard(player.seatIndex, cardId);
    if (!result.success) return result;

    this.broadcastGameUpdate(engine, room);

    if (result.completedTrick) {
      this.io.to(room.roomId).emit('game:trickCompleted', result.completedTrick);

      // Give players 1.4s to see all 4 cards and the sweep animation to the winner
      setTimeout(() => {
        const finalRes = engine.finalizeCompletedTrick();
        this.broadcastGameUpdate(engine, room);

        if (finalRes.isGameOver) {
          this.io.to(room.roomId).emit('game:ended', {
            losingTeam: engine.getState().losingTeam!,
            winningTeam: engine.getState().winnerTeam!,
            finalScores: engine.getState().players.reduce((acc, p) => {
              acc[p.seatIndex] = p.score;
              return acc;
            }, {} as Record<number, number>),
          });
          return;
        }

        // Check if next turn is a bot
        this.checkAndExecuteBotTurns(engine, room);
      }, 1400);

      return { success: true };
    }

    // Normal turn: Check if next turn is a bot
    this.checkAndExecuteBotTurns(engine, room);

    return { success: true };
  }

  private handleBotPassing(engine: GameEngine, room: Room): void {
    const state = engine.getState();
    if (state.phase !== 'PASSING') return;

    for (const p of room.players) {
      if (p.isBot) {
        setTimeout(() => {
          if (engine.getState().phase === 'PASSING' && !engine.getState().passingState.submitted[p.seatIndex]) {
            const hand = engine.getState().playerHands[p.seatIndex];
            const recipientSeat = (p.seatIndex + 1) % 4;
            const recipientScore = engine.getState().players[recipientSeat].score;
            const myScore = engine.getState().players[p.seatIndex].score;
            const chosen = BotAI.chooseCardsToPass(hand, recipientScore, p.botDifficulty, myScore);
            engine.submitPass(p.seatIndex, chosen);
            this.broadcastGameUpdate(engine, room);

            if (engine.getState().phase === 'PLAYER_TURN') {
              this.checkAndExecuteBotTurns(engine, room);
            }
          }
        }, 600 + Math.random() * 800);
      }
    }
  }

  public checkAndExecuteBotTurns(engine: GameEngine, room: Room): void {
    const state = engine.getState();
    if (state.phase !== 'PLAYER_TURN') return;

    const currentSeat = state.currentTurnSeatIndex;
    const currentPlayer = room.players.find((p) => p.seatIndex === currentSeat);

    if (currentPlayer && currentPlayer.isBot) {
      setTimeout(() => {
        const freshState = engine.getState();
        if (freshState.phase === 'PLAYER_TURN' && freshState.currentTurnSeatIndex === currentSeat) {
          const hand = freshState.playerHands[currentSeat];
          const playerObj = freshState.players[currentSeat];
          const chosenCardId = BotAI.chooseCardToPlay(
            hand,
            freshState.currentTrick,
            currentPlayer.botDifficulty,
            currentSeat,
            playerObj.score,
            playerObj.tricksWonThisHand,
          );

          const result = engine.playCard(currentSeat, chosenCardId);
          this.broadcastGameUpdate(engine, room);

          if (result.completedTrick) {
            this.io.to(room.roomId).emit('game:trickCompleted', result.completedTrick);

            setTimeout(() => {
              const finalRes = engine.finalizeCompletedTrick();
              this.broadcastGameUpdate(engine, room);

              if (finalRes.isGameOver) {
                this.io.to(room.roomId).emit('game:ended', {
                  losingTeam: engine.getState().losingTeam!,
                  winningTeam: engine.getState().winnerTeam!,
                  finalScores: engine.getState().players.reduce((acc, p) => {
                    acc[p.seatIndex] = p.score;
                    return acc;
                  }, {} as Record<number, number>),
                });
                return;
              }

              // Continue bot chain if next is bot
              this.checkAndExecuteBotTurns(engine, room);
            }, 1400);

            return;
          }

          // If next is also a bot, continue chain
          this.checkAndExecuteBotTurns(engine, room);
        }
      }, 700 + Math.random() * 600);
    }
  }

  public findSessionByPlayerId(playerId: string): { engine: GameEngine; room: Room } | undefined {
    for (const session of this.activeGames.values()) {
      if (session.room.players.some((p) => p.id === playerId)) {
        return session;
      }
    }
    return undefined;
  }

  public handleReconnect(playerId: string, socketId: string): ClientGameState | null {
    this.registerPlayerSocket(playerId, socketId);
    const session = this.findSessionByPlayerId(playerId);
    if (!session) return null;

    const { engine, room } = session;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return null;

    player.isConnected = true;
    this.io.to(room.roomId).emit('game:playerReconnected', playerId);
    return engine.getClientView(player.seatIndex);
  }

  public handleReplacePlayerWithBot(playerId: string): void {
    const session = this.findSessionByPlayerId(playerId);
    if (!session) return;

    const { engine, room } = session;
    const roomPlayer = room.players.find((p) => p.id === playerId);
    if (!roomPlayer) return;

    roomPlayer.isBot = true;
    roomPlayer.name = `${roomPlayer.name} (Bot)`;
    
    const engineState = engine.getState();
    const enginePlayer = engineState.players.find((p) => p.id === playerId);
    if (enginePlayer) {
      enginePlayer.isBot = true;
      enginePlayer.name = `${enginePlayer.name} (Bot)`;
    }

    this.broadcastGameUpdate(engine, room);

    // If it's currently this player's turn or passing phase, let bot take over
    if (engineState.phase === 'PASSING') {
      this.handleBotPassing(engine, room);
    } else if (engineState.phase === 'PLAYER_TURN') {
      this.checkAndExecuteBotTurns(engine, room);
    }
  }

  public handleNextRound(playerId: string): void {
    const session = this.findSessionByPlayerId(playerId);
    if (!session) return;

    const { engine, room } = session;
    const isHost = room.hostPlayerId === playerId || room.players.find((p) => p.id === playerId)?.seatIndex === 0;
    if (!isHost) return;

    const state = engine.getState();
    if (state.phase === 'HAND_COMPLETE') {
      engine.startNewHand(state.handNumber + 1, state.handNumber % 4);
      this.broadcastGameUpdate(engine, room);
      this.handleBotPassing(engine, room);
    }
  }

  public handleExitAndEndGame(playerId: string): void {
    const session = this.findSessionByPlayerId(playerId);
    if (!session) return;

    const { engine, room } = session;
    const roomPlayer = room.players.find((p) => p.id === playerId);
    const leavingName = roomPlayer ? roomPlayer.name : 'A player';

    this.activeGames.delete(engine.getState().gameId);

    this.io.to(room.roomId).emit('game:abandoned', {
      message: `${leavingName} left the game. The game has ended.`,
      leftPlayerName: leavingName,
    });
  }

  public handleHostEndGame(playerId: string): void {
    const session = this.findSessionByPlayerId(playerId);
    if (!session) return;

    const { engine, room } = session;
    if (room.hostPlayerId !== playerId) return;

    this.activeGames.delete(engine.getState().gameId);

    this.io.to(room.roomId).emit('game:abandoned', {
      message: `The host ended the game.`,
      leftPlayerName: room.players.find((p) => p.id === playerId)?.name || 'Host',
    });
  }

  public handleQuickMessage(playerId: string, messageText: string): void {
    const session = this.findSessionByPlayerId(playerId);
    if (!session) return;

    const { room } = session;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;

    this.io.to(room.roomId).emit('game:quickMessageReceived', {
      senderSeatIndex: player.seatIndex,
      senderName: player.name,
      text: messageText,
    });
  }

  public clearCompletedSessionsForPlayer(playerId: string): void {
    for (const [gameId, session] of this.activeGames.entries()) {
      if (
        session.engine.getState().phase === 'GAME_COMPLETE' &&
        session.room.players.some((p) => p.id === playerId)
      ) {
        this.activeGames.delete(gameId);
      }
    }
  }
}
