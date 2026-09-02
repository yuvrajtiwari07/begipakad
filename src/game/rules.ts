import { Card, Trick } from './types';

/**
 * Validates which cards a player can legally play from their current hand.
 */
export function getLegalCardsToPlay(hand: Card[], currentTrick: Trick): Card[] {
  if (hand.length === 0) {
    return [];
  }

  const isTrick1 = currentTrick.trickNumber === 1;
  const leadSuit = currentTrick.leadSuit;
  const begumHukumInHand = hand.find((c) => c.isBegumHukum);

  // 1. If lead suit exists and player HAS lead suit cards:
  if (leadSuit && currentTrick.cards.length > 0) {
    const leadSuitCards = hand.filter((c) => c.suit === leadSuit);
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

      if (isTrick1) {
        // Q♠ exception: Queen of Spades cannot be voluntarily played in Trick 1 if other lead suit cards exist
        const nonBegumLeadCards = leadSuitCards.filter((c) => !c.isBegumHukum);
        if (nonBegumLeadCards.length > 0) {
          return nonBegumLeadCards;
        }
      }

      return leadSuitCards;
    }
  }

  // 2. TRICK 1 SPECIAL RULES (when leading OR missing lead suit):
  if (isTrick1) {
    // Rule: No player can play Spades or Hearts in the first chance if they have Club/Diamond.
    // If no Club/Diamond in hand, priority is: Club/Diamond > Spades (except Q♠) > Hearts > Q♠.

    // Priority 1: Any card other than Spade and Hearts (Clubs or Diamonds)
    const nonSpadeHearts = hand.filter((c) => c.suit === 'CHIDI' || c.suit === 'EENT');
    if (nonSpadeHearts.length > 0) {
      return nonSpadeHearts;
    }

    // Priority 2: Spades except Queen of Spades (HUKUM except Q♠)
    const spadesExceptQueen = hand.filter((c) => c.suit === 'HUKUM' && !c.isBegumHukum);
    if (spadesExceptQueen.length > 0) {
      return spadesExceptQueen;
    }

    // Priority 3: Hearts (PAAN)
    const hearts = hand.filter((c) => c.suit === 'PAAN');
    if (hearts.length > 0) {
      return hearts;
    }

    // Priority 4: Queen of Spades (or whatever is left in hand)
    return hand;
  }

  // 3. TRICK 2 ONWARDS RULES (when leading OR missing lead suit):
  // If leading (no lead suit set):
  if (!leadSuit || currentTrick.cards.length === 0) {
    return hand;
  }

  // Player does NOT have lead suit cards (Trick 2 onwards)
  // Priority 1 - If they have Q♠, they MUST play Q♠
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
