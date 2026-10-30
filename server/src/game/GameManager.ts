import { Server, Socket } from 'socket.io';
import { BotAI } from '../../../src/game/Bot.ts';
import { GameEngine } from '../../../src/game/GameEngine.ts';
import { ClientGameState, Player, TeamId, Trick } from '../../../src/game/types.ts';
import { Room, RoomManager, RoomPlayer } from '../rooms/RoomManager.ts';

// Every socket of a user joins this channel, so emits reach them no matter which
// socket is current (refresh, reconnect, or a late disconnect of an old socket).
export const playerChannel = (playerId: string) => `player:${playerId}`;

export class GameManager {
  private io: Server;
  private roomManager: RoomManager;
  private activeGames: Map<string, { engine: GameEngine; room: Room }> = new Map();
  private finalizingTricks: Set<string> = new Set(); // gameIds with a trick waiting to be collected

  constructor(io: Server, roomManager: RoomManager) {
    this.io = io;
    this.roomManager = roomManager;
  }

  public registerPlayerSocket(playerId: string, socketId: string): void {
    this.io.sockets.sockets.get(socketId)?.join(playerChannel(playerId));
  }

  public isPlayerOnline(playerId: string): boolean {
    return (this.io.sockets.adapter.rooms.get(playerChannel(playerId))?.size ?? 0) > 0;
  }

  // The host starts each round; if the host left (bot) or is offline, the first connected
  // human does, so a round summary can never get stuck with nobody able to continue.
  private getNextRoundSeat(room: Room): number {
    const host = room.players.find((p) => p.id === room.hostPlayerId);
    if (host && !host.isBot && host.isConnected) return host.seatIndex;
    const fallback = room.players.find((p) => !p.isBot && p.isConnected) ?? host ?? room.players[0];
    return fallback.seatIndex;
  }

  private clientView(engine: GameEngine, room: Room, seatIndex: number): ClientGameState {
    return {
      ...engine.getClientView(seatIndex),
      hostPlayerId: room.hostPlayerId,
      nextRoundSeatIndex: this.getNextRoundSeat(room),
    };
  }

  private isActive(engine: GameEngine): boolean {
    return this.activeGames.get(engine.getState().gameId)?.engine === engine;
  }

  private passingTimeoutMap: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private turnTimeoutMap: Map<string, ReturnType<typeof setTimeout>> = new Map();

  private clearTurnTimeout(gameId: string): void {
    const timer = this.turnTimeoutMap.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.turnTimeoutMap.delete(gameId);
    }
  }

  private endSession(engine: GameEngine, room: Room): void {
    const gameId = engine.getState().gameId;
    this.activeGames.delete(gameId);
    this.finalizingTricks.delete(gameId);
    const timer = this.passingTimeoutMap.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.passingTimeoutMap.delete(gameId);
    }
    this.clearTurnTimeout(gameId);
    this.roomManager.removeRoom(room.roomId);
    this.io.socketsLeave(room.roomId);
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
        this.io.in(playerChannel(p.id)).socketsJoin(room.roomId);
        this.io.to(playerChannel(p.id)).emit('game:started', this.clientView(engine, room, p.seatIndex));
      }
    }

    // Trigger bots to select passes
    this.handleBotPassing(engine, room);

    return engine;
  }

  public broadcastGameUpdate(engine: GameEngine, room: Room): void {
    // Late bot/trick timers of an ended game must not pull players back into it
    if (!this.isActive(engine)) return;
    for (const p of room.players) {
      if (!p.isBot) {
        this.io.to(playerChannel(p.id)).emit('game:stateUpdate', this.clientView(engine, room, p.seatIndex));
      }
    }
  }

  // Show the full trick, then collect it after 1.4s. Runs at most once per trick.
  private scheduleTrickFinalize(engine: GameEngine, room: Room, completedTrick: Trick): void {
    const gameId = engine.getState().gameId;
    if (this.finalizingTricks.has(gameId)) return;
    this.finalizingTricks.add(gameId);

    this.io.to(room.roomId).emit('game:trickCompleted', completedTrick);

    setTimeout(() => {
      this.finalizingTricks.delete(gameId);
      if (!this.isActive(engine)) return;

      const finalRes = engine.finalizeCompletedTrick();
      this.broadcastGameUpdate(engine, room);

      if (finalRes.isGameOver) {
        this.clearTurnTimeout(gameId);
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

      // Check next turn if game continues
      if (engine.getState().phase === 'PLAYER_TURN') {
        this.checkAndExecuteTurn(engine, room);
      }
    }, 1400);
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
      const timer = this.passingTimeoutMap.get(engine.getState().gameId);
      if (timer) {
        clearTimeout(timer);
        this.passingTimeoutMap.delete(engine.getState().gameId);
      }
      this.checkAndExecuteTurn(engine, room);
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

    this.clearTurnTimeout(engine.getState().gameId);
    this.broadcastGameUpdate(engine, room);

    if (result.completedTrick) {
      this.scheduleTrickFinalize(engine, room, result.completedTrick);
      return { success: true };
    }

    // Normal turn: Check next turn (bot or human with turn timeout)
    this.checkAndExecuteTurn(engine, room);

    return { success: true };
  }

  private handleBotPassing(engine: GameEngine, room: Room): void {
    const state = engine.getState();
    if (state.phase !== 'PASSING') return;

    // Set 2-minute (120s) server fallback timer for remaining players to auto-pass
    const gameId = state.gameId;
    if (!this.passingTimeoutMap.has(gameId)) {
      const timer = setTimeout(() => {
        this.passingTimeoutMap.delete(gameId);
        if (this.isActive(engine) && engine.getState().phase === 'PASSING') {
          engine.autoPassRemainingPlayers();
          this.broadcastGameUpdate(engine, room);
          if (engine.getState().phase === 'PLAYER_TURN') {
            this.checkAndExecuteTurn(engine, room);
          }
        }
      }, 120000);
      this.passingTimeoutMap.set(gameId, timer);
    }

    for (const p of room.players) {
      if (p.isBot) {
        setTimeout(() => {
          if (
            this.isActive(engine) &&
            engine.getState().phase === 'PASSING' &&
            !engine.getState().passingState.submitted[p.seatIndex]
          ) {
            const hand = engine.getState().playerHands[p.seatIndex];
            const recipientSeat = (p.seatIndex + 1) % 4;
            const recipientScore = engine.getState().players[recipientSeat].score;
            const myScore = engine.getState().players[p.seatIndex].score;
            const chosen = BotAI.chooseCardsToPass(hand, recipientScore, p.botDifficulty, myScore);
            engine.submitPass(p.seatIndex, chosen);
            this.broadcastGameUpdate(engine, room);

            if (engine.getState().phase === 'PLAYER_TURN') {
              const timer = this.passingTimeoutMap.get(gameId);
              if (timer) {
                clearTimeout(timer);
                this.passingTimeoutMap.delete(gameId);
              }
              this.checkAndExecuteTurn(engine, room);
            }
          }
        }, 600 + Math.random() * 800);
      }
    }
  }

  public checkAndExecuteBotTurns(engine: GameEngine, room: Room): void {
    this.checkAndExecuteTurn(engine, room);
  }

  public checkAndExecuteTurn(engine: GameEngine, room: Room): void {
    if (!this.isActive(engine)) return;
    const state = engine.getState();
    if (state.phase !== 'PLAYER_TURN') return;

    const gameId = state.gameId;
    this.clearTurnTimeout(gameId);

    const currentSeat = state.currentTurnSeatIndex;
    const currentPlayer = room.players.find((p) => p.seatIndex === currentSeat);
    if (!currentPlayer) return;

    if (currentPlayer.isBot) {
      setTimeout(() => {
        const freshState = engine.getState();
        if (
          this.isActive(engine) &&
          freshState.phase === 'PLAYER_TURN' &&
          freshState.currentTurnSeatIndex === currentSeat &&
          freshState.currentTrick.cards.length < 4
        ) {
          const hand = freshState.playerHands[currentSeat];
          const playerObj = freshState.players[currentSeat];
          const chosenCardId = BotAI.chooseCardToPlay(
            hand,
            freshState.currentTrick,
            currentPlayer.botDifficulty,
            currentSeat,
            playerObj.roundStartScore ?? playerObj.score,
            playerObj.tricksWonThisHand,
          );

          const result = engine.playCard(currentSeat, chosenCardId);
          if (!result.success) return;
          this.broadcastGameUpdate(engine, room);

          if (result.completedTrick) {
            this.scheduleTrickFinalize(engine, room, result.completedTrick);
            return;
          }

          // If next is also a bot or human, continue turn progression
          this.checkAndExecuteTurn(engine, room);
        }
      }, 700 + Math.random() * 600);
    } else {
      // Authoritative server-side turn timeout for human players.
      // If the player disconnects, closes the tab, or the client auto-play fails,
      // the server ensures the game advances rather than remaining stuck indefinitely.
      const isOnline = currentPlayer.isConnected && this.isPlayerOnline(currentPlayer.id);
      const isTrick1Lead = state.currentTrickNumber === 1 && state.currentTrick.cards.length === 0;

      // When online: 20s turn + 2s latency buffer (plus 10s modal time on trick 1 lead).
      // When offline/disconnected: 8s reconnection grace period so other players aren't held up.
      const timeoutMs = isOnline ? (isTrick1Lead ? 32000 : 22000) : 8000;

      const timer = setTimeout(() => {
        this.turnTimeoutMap.delete(gameId);
        const freshState = engine.getState();
        if (
          !this.isActive(engine) ||
          freshState.phase !== 'PLAYER_TURN' ||
          freshState.currentTurnSeatIndex !== currentSeat ||
          freshState.currentTrick.cards.length >= 4
        ) {
          return;
        }

        const hand = freshState.playerHands[currentSeat];
        const playerObj = freshState.players[currentSeat];
        if (!hand || hand.length === 0) return;

        const chosenCardId = BotAI.chooseCardToPlay(
          hand,
          freshState.currentTrick,
          currentPlayer.botDifficulty || 'medium',
          currentSeat,
          playerObj.roundStartScore ?? playerObj.score,
          playerObj.tricksWonThisHand,
        );

        const result = engine.playCard(currentSeat, chosenCardId);
        if (!result.success) return;
        this.broadcastGameUpdate(engine, room);

        if (result.completedTrick) {
          this.scheduleTrickFinalize(engine, room, result.completedTrick);
          return;
        }

        this.checkAndExecuteTurn(engine, room);
      }, timeoutMs);

      this.turnTimeoutMap.set(gameId, timer);
    }
  }

  public handlePlayerDisconnected(engine: GameEngine, room: Room, seatIndex: number): void {
    if (!this.isActive(engine)) return;
    const state = engine.getState();
    // If it's this disconnected player's turn, accelerate the turn timer to 8s
    if (state.phase === 'PLAYER_TURN' && state.currentTurnSeatIndex === seatIndex && state.currentTrick.cards.length < 4) {
      this.clearTurnTimeout(state.gameId);
      const gameId = state.gameId;
      const currentPlayer = room.players.find((p) => p.seatIndex === seatIndex);
      if (!currentPlayer || currentPlayer.isBot) return;

      const timer = setTimeout(() => {
        this.turnTimeoutMap.delete(gameId);
        const freshState = engine.getState();
        if (
          !this.isActive(engine) ||
          freshState.phase !== 'PLAYER_TURN' ||
          freshState.currentTurnSeatIndex !== seatIndex ||
          freshState.currentTrick.cards.length >= 4
        ) {
          return;
        }

        const hand = freshState.playerHands[seatIndex];
        const playerObj = freshState.players[seatIndex];
        if (!hand || hand.length === 0) return;

        const chosenCardId = BotAI.chooseCardToPlay(
          hand,
          freshState.currentTrick,
          currentPlayer.botDifficulty || 'medium',
          seatIndex,
          playerObj.roundStartScore ?? playerObj.score,
          playerObj.tricksWonThisHand,
        );

        const result = engine.playCard(seatIndex, chosenCardId);
        if (!result.success) return;
        this.broadcastGameUpdate(engine, room);

        if (result.completedTrick) {
          this.scheduleTrickFinalize(engine, room, result.completedTrick);
          return;
        }

        this.checkAndExecuteTurn(engine, room);
      }, 8000);

      this.turnTimeoutMap.set(gameId, timer);
    }
  }

  public findSessionByPlayerId(playerId: string): { engine: GameEngine; room: Room } | undefined {
    for (const session of this.activeGames.values()) {
      // Skip games where this user was replaced by a bot; they've moved on
      if (session.room.players.some((p) => p.id === playerId && !p.isBot)) {
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
    player.socketId = socketId;

    const clientSocket = this.io.sockets.sockets.get(socketId);
    if (clientSocket) {
      clientSocket.join(room.roomId);
    }

    this.io.to(room.roomId).emit('game:playerReconnected', playerId);
    // Others need the refreshed view too (e.g. who may start the next round)
    this.broadcastGameUpdate(engine, room);
    return this.clientView(engine, room, player.seatIndex);
  }

  public handleReplacePlayerWithBot(playerId: string): void {
    const session = this.findSessionByPlayerId(playerId);
    if (!session) return;

    const { engine, room } = session;
    const roomPlayer = room.players.find((p) => p.id === playerId);
    if (!roomPlayer) return;

    roomPlayer.isBot = true;
    roomPlayer.name = `${roomPlayer.name} (Bot)`;
    // Stop this user's sockets from getting events (e.g. game:abandoned) for a game they left
    this.io.in(playerChannel(playerId)).socketsLeave(room.roomId);
    
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
      this.clearTurnTimeout(engine.getState().gameId);
      this.checkAndExecuteTurn(engine, room);
    }
  }

  public handleNextRound(playerId: string): void {
    const session = this.findSessionByPlayerId(playerId);
    if (!session) return;

    const { engine, room } = session;
    const requester = room.players.find((p) => p.id === playerId);
    if (!requester || requester.seatIndex !== this.getNextRoundSeat(room)) return;

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

    this.io.to(room.roomId).emit('game:abandoned', {
      message: `${leavingName} left the game. The game has ended.`,
      leftPlayerName: leavingName,
    });
    this.endSession(engine, room);
  }

  public handleHostEndGame(playerId: string): void {
    const session = this.findSessionByPlayerId(playerId);
    if (!session) return;

    const { engine, room } = session;
    if (room.hostPlayerId !== playerId) return;

    this.io.to(room.roomId).emit('game:abandoned', {
      message: `The host ended the game.`,
      leftPlayerName: room.players.find((p) => p.id === playerId)?.name || 'Host',
    });
    this.endSession(engine, room);
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
    for (const session of [...this.activeGames.values()]) {
      if (
        session.engine.getState().phase === 'GAME_COMPLETE' &&
        session.room.players.some((p) => p.id === playerId)
      ) {
        this.endSession(session.engine, session.room);
      }
    }
  }
}
