import { Card, Rank, Suit } from './types';

export const SUITS: Suit[] = ['HUKUM', 'PAAN', 'EENT', 'CHIDI'];

export const SUIT_NAMES: Record<Suit, { en: string; hi: string; symbol: string; color: string }> = {
  HUKUM: { en: 'Spades', hi: 'Hukum', symbol: '♠', color: '#1e293b' },
  PAAN: { en: 'Hearts', hi: 'Paan', symbol: '♥', color: '#dc2626' },
  EENT: { en: 'Diamonds', hi: 'Eent', symbol: '♦', color: '#ea580c' },
  CHIDI: { en: 'Clubs', hi: 'Chidi', symbol: '♣', color: '#047857' },
};

export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const RANK_VALUES: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export function createCard(suit: Suit, rank: Rank): Card {
  const isBegumHukum = suit === 'HUKUM' && rank === 'Q';
  const isPaan = suit === 'PAAN';
  return {
    id: `${suit}_${rank}`,
    suit,
    rank,
    rankValue: RANK_VALUES[rank],
    isBegumHukum,
    isPaan,
  };
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(createCard(suit, rank));
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function dealCards(shuffledDeck: Card[]): Record<number, Card[]> {
  if (shuffledDeck.length !== 52) {
    throw new Error(`Deck must have 52 cards, got ${shuffledDeck.length}`);
  }
  const hands: Record<number, Card[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
  };

  // Deal 13 cards to each of the 4 players
  for (let i = 0; i < 52; i++) {
    const playerIndex = i % 4;
    hands[playerIndex].push(shuffledDeck[i]);
  }

  // Sort each player's hand for clear layout
  for (let p = 0; p < 4; p++) {
    hands[p] = sortCards(hands[p]);
  }

  return hands;
}

const SUIT_ORDER: Record<Suit, number> = {
  HUKUM: 0,
  PAAN: 1,
  CHIDI: 2,
  EENT: 3,
};

export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (SUIT_ORDER[a.suit] !== SUIT_ORDER[b.suit]) {
      return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    }
    return b.rankValue - a.rankValue; // High to low
  });
}
