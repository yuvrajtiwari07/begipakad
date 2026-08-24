/**
 * Begi Pakad - Shared Types & Interfaces
 */

export type Suit = 'HUKUM' | 'PAAN' | 'EENT' | 'CHIDI';
// Hukum = Spades (♠), Paan = Hearts (♥), Eent = Diamonds (♦), Chidi = Clubs (♣)

export type Rank =
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'A';

export interface Card {
  id: string; // e.g. "HUKUM_Q", "PAAN_7"
  suit: Suit;
  rank: Rank;
  rankValue: number; // 2=2 ... A=14
  isBegumHukum: boolean; // Q♠
  isPaan: boolean; // Any ♥
}

export type TeamId = 1 | 2;

export interface Player {
  id: string; // Unique user ID (e.g. USR_A82F91)
  name: string;
  avatarSeed: string;
  seatIndex: number; // 0, 1, 2, 3
  teamId: TeamId; // 0 & 2 -> Team 1; 1 & 3 -> Team 2
  isBot: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard';
  isConnected: boolean;
  score: number; // Cumulative game score (e.g. 72)
  tricksWonThisHand: number; // Count of Ser won in current hand (0-13)
  cardsRemaining: number;
}

export interface PlayedCard {
  playerId: string;
  seatIndex: number;
  card: Card;
}

export interface Trick {
  trickNumber: number; // 1 to 13
  leadSuit: Suit | null;
  leaderSeatIndex: number;
  cards: PlayedCard[];
  winnerSeatIndex?: number;
  pointsAwarded?: {
    playerId: string;
    seatIndex: number;
    paanPoints: number;
    begumPoints: number;
    totalPoints: number;
  };
}

export type GamePhase =
  | 'LOBBY'
  | 'DEALING'
  | 'PASSING'
  | 'PASSING_COMPLETE'
  | 'TRICK_START'
  | 'PLAYER_TURN'
  | 'TRICK_COMPLETE'
  | 'NEXT_TRICK'
  | 'HAND_COMPLETE'
  | 'ZERO_TRICK_CALCULATION'
  | 'SCORE_UPDATE'
  | 'GAME_END_CHECK'
  | 'NEXT_HAND'
  | 'GAME_COMPLETE';

export interface PassingState {
  // Map of seatIndex to list of 5 card IDs selected to pass
  selectedCards: Record<number, string[]>;
  submitted: Record<number, boolean>;
  passingTargetMap: Record<number, number>; // 0->1, 1->2, 2->3, 3->0
  timeRemainingSeconds: number;
  receivedCardsBySeat?: Record<number, { fromSeatIndex: number; cards: Card[]; handNumber: number }>;
}

export interface HandScoreResult {
  handNumber: number;
  startScores: Record<number, number>;
  trickPointsGained: Record<number, number>;
  tricksWon: Record<number, number>;
  zeroTrickBonusAwarded: Record<number, boolean>; // -5 applied
  finalScores: Record<number, number>;
  losingTeam?: TeamId;
  losingPlayers?: number[];
}

export interface FullGameState {
  gameId: string;
  roomId?: string;
  phase: GamePhase;
  handNumber: number;
  currentTrickNumber: number; // 1 to 13
  players: Player[];
  playerHands: Record<number, Card[]>; // Hidden to unauthorized clients!
  passingState: PassingState;
  currentTrick: Trick;
  trickHistory: Trick[];
  currentTurnSeatIndex: number;
  handHistory: HandScoreResult[];
  losingTeam: TeamId | null;
  winnerTeam: TeamId | null;
  lastActionMessage?: string;
  turnDeadlineTimestamp?: number;
  lastReceivedPassedCards?: Record<number, { fromSeatIndex: number; cards: Card[]; handNumber: number }>;
}

// Client-safe state view (Masks opponents' hidden cards)
export interface ClientGameState {
  gameId: string;
  roomId?: string;
  phase: GamePhase;
  handNumber: number;
  currentTrickNumber: number;
  players: Player[];
  mySeatIndex: number;
  myHand: Card[]; // Only the recipient's cards!
  opponentCardCounts: Record<number, number>;
  passingState: {
    hasSubmitted: boolean;
    mySelectedCardIds: string[];
    submittedSeats: number[];
    targetRecipientSeatIndex: number;
    targetRecipientScore: number;
    targetRecipientCanReceivePaan: boolean; // false if score >= 90
    timeRemainingSeconds: number;
  };
  lastReceivedPassedCards?: {
    fromSeatIndex: number;
    cards: Card[];
    handNumber: number;
  };
  currentTrick: Trick;
  trickHistory: Trick[];
  currentTurnSeatIndex: number;
  handHistory: HandScoreResult[];
  losingTeam: TeamId | null;
  winnerTeam: TeamId | null;
  lastActionMessage?: string;
  legalPlayCardIds: string[]; // Valid cards current player can play
  turnTimeLimitSeconds?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  avatarSeed: string;
  gamesPlayed: number;
  gamesWon: number;
  zeroSerAchievements: number;
  createdAt: number;
}

export interface RoomInfo {
  roomId: string;
  hostPlayerId: string;
  createdAt: number;
  players: {
    id: string;
    name: string;
    seatIndex: number;
    isReady: boolean;
    isBot: boolean;
    isConnected: boolean;
  }[];
  isGameStarted: boolean;
  gameId?: string;
}

// Socket Events
export interface ClientToServerEvents {
  'user:init': (profile: { id: string; name: string; avatarSeed: string }) => void;
  'room:create': () => void;
  'room:join': (roomId: string) => void;
  'room:leave': () => void;
  'room:addBot': (seatIndex: number, difficulty: 'easy' | 'medium' | 'hard') => void;
  'room:removeBot': (seatIndex: number) => void;
  'room:start': () => void;
  'matchmaking:join': () => void;
  'matchmaking:leave': () => void;
  'game:submitPass': (cardIds: string[]) => void;
  'game:playCard': (cardId: string) => void;
  'game:replaceWithBot': () => void;
  'game:exitAndEnd': () => void;
  'game:hostEndGame': () => void;
  'game:sendQuickMessage': (messageText: string) => void;
  'game:reconnect': (payload: { gameId: string; playerId: string }) => void;
}

export interface ServerToClientEvents {
  'room:created': (room: RoomInfo) => void;
  'room:joined': (room: RoomInfo) => void;
  'room:updated': (room: RoomInfo) => void;
  'room:closed': (message: string) => void;
  'room:error': (message: string) => void;
  'matchmaking:status': (status: { inQueue: boolean; playersCount: number; targetCount: number }) => void;
  'game:started': (gameState: ClientGameState) => void;
  'game:stateUpdate': (gameState: ClientGameState) => void;
  'game:cardPlayed': (played: PlayedCard) => void;
  'game:trickCompleted': (trick: Trick) => void;
  'game:handCompleted': (handResult: HandScoreResult) => void;
  'game:ended': (payload: { losingTeam: TeamId; winningTeam: TeamId; finalScores: Record<number, number> }) => void;
  'game:abandoned': (payload: { message: string; leftPlayerName: string }) => void;
  'game:quickMessageReceived': (payload: { senderSeatIndex: number; senderName: string; text: string }) => void;
  'game:playerReconnected': (playerId: string) => void;
  'game:playerDisconnected': (playerId: string) => void;
  'error:message': (message: string) => void;
}
