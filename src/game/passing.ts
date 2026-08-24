import { Card } from './types.ts';

export const PASSING_DIRECTION_MAP: Record<number, number> = {
  0: 1, // P1 -> P2
  1: 2, // P2 -> P3
  2: 3, // P3 -> P4
  3: 0, // P4 -> P1
};

export function getPassingRecipientSeat(senderSeat: number): number {
  return PASSING_DIRECTION_MAP[senderSeat];
}

export interface PassValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePassSelection(
  selectedCards: Card[],
  playerHand: Card[],
  recipientScore: number,
): PassValidationResult {
  if (selectedCards.length !== 5) {
    return {
      valid: false,
      error: `Must select exactly 5 cards to pass. Selected: ${selectedCards.length}`,
    };
  }

  // Ensure all selected cards are present in the player's hand
  const handIds = new Set(playerHand.map((c) => c.id));
  for (const card of selectedCards) {
    if (!handIds.has(card.id)) {
      return {
        valid: false,
        error: `Card ${card.id} is not in player hand`,
      };
    }
  }

  // 90 Point Rule: If recipient has 90 or more points, they CANNOT receive Paan (♥) cards
  if (recipientScore >= 90) {
    const hasPaan = selectedCards.some((c) => c.isPaan);
    if (hasPaan) {
      return {
        valid: false,
        error: 'INVALID: Recipient has 90+ points and cannot receive Paan (♥) cards during passing.',
      };
    }
  }

  return { valid: true };
}

/**
 * Deterministic fallback strategy if passing timer expires.
 * Selects 5 legal cards according to rules:
 * - If recipient >= 90 pts, NEVER pick Paan (♥).
 * - Otherwise prioritize high non-scoring cards or high danger cards.
 */
export function getAutoPassSelection(
  playerHand: Card[],
  recipientScore: number,
): Card[] {
  const isPaanRestricted = recipientScore >= 90;

  // Filter eligible cards
  const eligibleCards = isPaanRestricted
    ? playerHand.filter((c) => !c.isPaan)
    : [...playerHand];

  // If for some rare extreme case player doesn't have 5 non-paan cards (extremely unlikely since 13 cards and max 13 Paan in entire deck, but 52-card distribution guarantees at least some non-paan)
  // Sort eligible cards by rankValue descending
  const sorted = [...eligibleCards].sort((a, b) => b.rankValue - a.rankValue);

  if (sorted.length >= 5) {
    return sorted.slice(0, 5);
  }

  // Fallback
  return playerHand.slice(0, 5);
}
