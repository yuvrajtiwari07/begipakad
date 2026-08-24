import { RoomPlayer } from '../rooms/RoomManager.ts';

export class MatchmakingService {
  private queue: RoomPlayer[] = [];

  public joinQueue(player: RoomPlayer): { inQueue: boolean; playersCount: number; targetCount: number } {
    // Remove if already in queue
    this.leaveQueue(player.id);
    this.queue.push(player);
    return {
      inQueue: true,
      playersCount: this.queue.length,
      targetCount: 4,
    };
  }

  public leaveQueue(playerId: string): void {
    this.queue = this.queue.filter((p) => p.id !== playerId);
  }

  public getQueueCount(): number {
    return this.queue.length;
  }

  public getMatchedPlayers(): RoomPlayer[] | null {
    if (this.queue.length >= 4) {
      return this.queue.splice(0, 4);
    }
    return null;
  }

  public isInQueue(playerId: string): boolean {
    return this.queue.some((p) => p.id === playerId);
  }
}
