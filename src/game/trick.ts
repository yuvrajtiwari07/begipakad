import { Card, PlayedCard, Suit } from './types.ts';

export function determineTrickWinner(cards: PlayedCard[], leadSuit: Suit): { winnerSeatIndex: number; winningCard: Card } {
  if (cards.length === 0) {
    throw new Error('Cannot determine winner of an empty trick');
  }

  let highestCard: PlayedCard = cards[0];

  for (let i = 0; i < cards.length; i++) {
    const play = cards[i];
    // Only cards matching the lead suit can win!
    if (play.card.suit === leadSuit) {
      if (highestCard.card.suit !== leadSuit || play.card.rankValue > highestCard.card.rankValue) {
        highestCard = play;
      }
    }
  }

  return {
    winnerSeatIndex: highestCard.seatIndex,
    winningCard: highestCard.card,
  };
}
