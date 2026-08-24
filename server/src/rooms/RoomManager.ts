import { GameEngine } from '../../../src/game/GameEngine.ts';
import { Player, RoomInfo } from '../../../src/game/types.ts';

export interface RoomPlayer {
  id: string;
  name: string;
  avatarSeed: string;
  socketId?: string;
  seatIndex: number;
  isReady: boolean;
  isBot: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard';
  isConnected: boolean;
}

export class Room {
  public roomId: string;
  public hostPlayerId: string;
  public createdAt: number;
  public players: RoomPlayer[] = [];
  public isGameStarted: boolean = false;
  public gameEngine?: GameEngine;

  constructor(roomId: string, hostPlayer: RoomPlayer) {
    this.roomId = roomId;
    this.hostPlayerId = hostPlayer.id;
    this.createdAt = Date.now();
    this.players.push(hostPlayer);
  }

  public toInfo(): RoomInfo {
    return {
      roomId: this.roomId,
      hostPlayerId: this.hostPlayerId,
      createdAt: this.createdAt,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        seatIndex: p.seatIndex,
        isReady: p.isReady,
        isBot: p.isBot,
        isConnected: p.isConnected,
      })),
      isGameStarted: this.isGameStarted,
      gameId: this.gameEngine?.getState().gameId,
    };
  }

  public addPlayer(player: RoomPlayer): boolean {
    if (this.players.length >= 4 || this.isGameStarted) {
      return false;
    }
    // Find next available seat index (0, 1, 2, 3)
    const takenSeats = new Set(this.players.map((p) => p.seatIndex));
    let nextSeat = 0;
    for (let s = 0; s < 4; s++) {
      if (!takenSeats.has(s)) {
        nextSeat = s;
        break;
      }
    }
    player.seatIndex = nextSeat;
    this.players.push(player);
    return true;
  }

  public removePlayer(playerId: string): boolean {
    const idx = this.players.findIndex((p) => p.id === playerId);
    if (idx !== -1) {
      this.players.splice(idx, 1);
      // Reassign host if host left
      if (this.hostPlayerId === playerId && this.players.length > 0) {
        this.hostPlayerId = this.players[0].id;
      }
      return true;
    }
    return false;
  }

  public addBot(seatIndex: number, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): boolean {
    if (this.players.length >= 4 || this.isGameStarted) return false;
    const existing = this.players.find((p) => p.seatIndex === seatIndex);
    if (existing) return false;

    const botNumber = this.players.filter((p) => p.isBot).length + 1;
    const botPlayer: RoomPlayer = {
      id: `BOT_${Math.random().toString(36).substring(2, 7)}`,
      name: `Bot ${botNumber} (${difficulty})`,
      avatarSeed: `bot_${botNumber}`,
      seatIndex,
      isReady: true,
      isBot: true,
      botDifficulty: difficulty,
      isConnected: true,
    };
    this.players.push(botPlayer);
    this.players.sort((a, b) => a.seatIndex - b.seatIndex);
    return true;
  }

  public removeBot(seatIndex: number): boolean {
    const idx = this.players.findIndex((p) => p.seatIndex === seatIndex && p.isBot);
    if (idx !== -1) {
      this.players.splice(idx, 1);
      return true;
    }
    return false;
  }
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  public generateRoomId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'BGP';
    for (let i = 0; i < 3; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (this.rooms.has(code)) {
      return this.generateRoomId();
    }
    return code;
  }

  public createRoom(hostPlayer: RoomPlayer): Room {
    const roomId = this.generateRoomId();
    const room = new Room(roomId, hostPlayer);
    this.rooms.set(roomId, room);
    return room;
  }

  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId.toUpperCase());
  }

  public removeRoom(roomId: string): void {
    this.rooms.delete(roomId.toUpperCase());
  }

  public getRoomByPlayerId(playerId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.some((p) => p.id === playerId)) {
        return room;
      }
    }
    return undefined;
  }
}
