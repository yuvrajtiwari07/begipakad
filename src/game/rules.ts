import { Card, Trick } from './types';

/**
 * Validates which cards a player can legally play from their current hand.
 */
export function getLegalCardsToPlay(hand: Card[], currentTrick: Trick): Card[] {
  if (hand.length === 0) {
    return [];
  }

  // 1. Leader plays first card of the trick: Can lead ANY card EXCEPT Spades (HUKUM) or Hearts (PAAN) on Trick 1
  if (currentTrick.cards.length === 0 || !currentTrick.leadSuit) {
    if (currentTrick.trickNumber === 1) {
      // First round rule: Cannot lead Spades (HUKUM) or Hearts (PAAN)
      const allowedFirstRoundCards = hand.filter(
        (c) => c.suit === 'CHIDI' || c.suit === 'EENT',
      );
      // Fallback: If player only has Spades/Hearts in hand, allow any card
      if (allowedFirstRoundCards.length > 0) {
        return allowedFirstRoundCards;
      }
    }
    return hand;
  }

  const leadSuit = currentTrick.leadSuit;
  const leadSuitCards = hand.filter((c) => c.suit === leadSuit);
  const begumHukumInHand = hand.find((c) => c.isBegumHukum);

  // 2. Player HAS cards of the lead suit
  if (leadSuitCards.length > 0) {
    // Special Hukum Rule: When Hukum (♠) is lead suit,
    // if someone played A♠ or K♠, and player holds Q♠, player MUST play Q♠!
    if (leadSuit === 'HUKUM' && begumHukumInHand) {
      const hasAceOrKingPlayed = currentTrick.cards.some(
        (p) => p.card.suit === 'HUKUM' && (p.card.rank === 'A' || p.card.rank === 'K'),
      );
      if (hasAceOrKingPlayed) {
        return [begumHukumInHand];
      }
    }

    // Otherwise, must play any card belonging to the lead suit
    return leadSuitCards;
  }

  // 3. Player does NOT have lead suit cards
  // Priority 1: If they have Q♠, they MUST play Q♠
  if (begumHukumInHand) {
    return [begumHukumInHand];
  }

  // Priority 2: If they don't have Q♠, they can play ANY card
  return hand;
}

export function isCardPlayLegal(card: Card, hand: Card[], currentTrick: Trick): boolean {
  const legalCards = getLegalCardsToPlay(hand, currentTrick);
  return legalCards.some((c) => c.id === card.id);
}
