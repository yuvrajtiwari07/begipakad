import { Card, TeamId } from './types';

export interface ScoreZoneInfo {
  zone: 'normal' | 'hukum_protected' | 'paan_passing_protected' | 'lost';
  label: string;
  badgeColor: string;
  begumHukumPoints: number; // 12 or 0
  canReceivePaanInPassing: boolean;
  description: string;
}

export function getScoreZone(score: number): ScoreZoneInfo {
  if (score >= 100) {
    return {
      zone: 'lost',
      label: '❌ Team Lost',
      badgeColor: 'bg-red-600 text-white',
      begumHukumPoints: 0,
      canReceivePaanInPassing: false,
      description: 'Score reached 100+. Team lost the match.',
    };
  }
  if (score >= 90) {
    return {
      zone: 'paan_passing_protected',
      label: '🔴 Paan Protected',
      badgeColor: 'bg-rose-500 text-white',
      begumHukumPoints: 0,
      canReceivePaanInPassing: false,
      description: 'Q♠ gives +0 pts. Cannot receive Paan (♥) during passing.',
    };
  }
  if (score >= 75) {
    return {
      zone: 'hukum_protected',
      label: '⚠️ Hukum Protected',
      badgeColor: 'bg-amber-500 text-white',
      begumHukumPoints: 0,
      canReceivePaanInPassing: true,
      description: 'Q♠ gives +0 pts. Paan (♥) gives +1 pt and can be passed.',
    };
  }
  return {
    zone: 'normal',
    label: 'Normal',
    badgeColor: 'bg-emerald-600 text-white',
    begumHukumPoints: 12,
    canReceivePaanInPassing: true,
    description: 'Q♠ gives +12 pts. Paan (♥) gives +1 pt.',
  };
}

export interface TrickScoreResult {
  winnerSeatIndex: number;
  winnerCurrentScore: number;
  paanCount: number;
  hasBegumHukum: boolean;
  paanPoints: number;
  begumPoints: number;
  totalPointsGained: number;
  newScore: number;
  isGameOver: boolean;
}

export function calculateTrickPoints(
  cardsInTrick: Card[],
  winnerSeatIndex: number,
  winnerCurrentScore: number,
): TrickScoreResult {
  let paanCount = 0;
  let hasBegumHukum = false;

  for (const card of cardsInTrick) {
    if (card.isPaan) {
      paanCount += 1;
    }
    if (card.isBegumHukum) {
      hasBegumHukum = true;
    }
  }

  const paanPoints = paanCount * 1;

  // 75 Point Rule: If winner's score BEFORE this trick is >= 75, Q♠ gives 0 points
  const begumPoints = hasBegumHukum
    ? winnerCurrentScore >= 75
      ? 0
      : 12
    : 0;

  const totalPointsGained = paanPoints + begumPoints;
  const newScore = winnerCurrentScore + totalPointsGained;

  return {
    winnerSeatIndex,
    winnerCurrentScore,
    paanCount,
    hasBegumHukum,
    paanPoints,
    begumPoints,
    totalPointsGained,
    newScore,
    isGameOver: newScore >= 100,
  };
}

export function checkZeroSerBonus(tricksWon: number, currentScore: number): { pointsDelta: number; newScore: number } {
  // If player won 0 Ser in all 13 Ser, apply -5 points bonus
  if (tricksWon === 0) {
    return {
      pointsDelta: -5,
      newScore: currentScore - 5,
    };
  }
  return {
    pointsDelta: 0,
    newScore: currentScore,
  };
}

export function getTeamForSeat(seatIndex: number): TeamId {
  // Seat 0 and 2 -> Team 1
  // Seat 1 and 3 -> Team 2
  return seatIndex % 2 === 0 ? 1 : 2;
}

export function checkGameLoss(scores: Record<number, number>): {
  isGameOver: boolean;
  losingTeam: TeamId | null;
  winnerTeam: TeamId | null;
  losingPlayers: number[];
} {
  const losingPlayers: number[] = [];
  let losingTeam: TeamId | null = null;

  for (const seatStr of Object.keys(scores)) {
    const seat = Number(seatStr);
    if (scores[seat] >= 100) {
      losingPlayers.push(seat);
      losingTeam = getTeamForSeat(seat);
    }
  }

  if (losingTeam !== null) {
    const winnerTeam: TeamId = losingTeam === 1 ? 2 : 1;
    return {
      isGameOver: true,
      losingTeam,
      winnerTeam,
      losingPlayers,
    };
  }

  return {
    isGameOver: false,
    losingTeam: null,
    winnerTeam: null,
    losingPlayers: [],
  };
}
