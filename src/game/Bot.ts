import { getAutoPassSelection } from './passing';
import { getLegalCardsToPlay } from './rules';
import { getScoreZone } from './scoring';
import { Card, Trick } from './types';

export class BotAI {
  /**
   * Selects 5 cards to pass to the next player.
   */
  public static chooseCardsToPass(
    hand: Card[],
    recipientScore: number,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
    myScore: number = 0,
  ): string[] {
    const isPaanRestricted = recipientScore >= 90;
    const eligibleHand = isPaanRestricted ? hand.filter((c) => !c.isPaan) : [...hand];

    if (difficulty === 'easy') {
      const shuffled = [...eligibleHand].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 5).map((c) => c.id);
    }

    if (difficulty === 'medium') {
      // Prioritize:
      // 1. Q♠ if my score < 75 (to avoid +12 danger)
      // 2. High Paan (♥) if recipient < 90
      // 3. High cards (A, K, Q)
      const sorted = [...eligibleHand].sort((a, b) => {
        if (myScore < 75) {
          if (a.isBegumHukum) return -1;
          if (b.isBegumHukum) return 1;
        }
        if (!isPaanRestricted) {
          if (a.isPaan && !b.isPaan) return -1;
          if (!a.isPaan && b.isPaan) return 1;
        }
        return b.rankValue - a.rankValue;
      });
      return sorted.slice(0, 5).map((c) => c.id);
    }

    // Hard Bot:
    // Strategic pass evaluation:
    // - Check if low-card hand can aim for Zero-Ser (-5 bonus)
    // - If my score >= 75, Q♠ gives 0 pts (I can hold it safely as a weapon or discard)
    // - If recipient is >= 90, NO Paan allowed -> Pass high Ace/Kings of suits where I have few cards (voiding suits)
    const lowCardsCount = hand.filter((c) => c.rankValue <= 6).length;
    const aimForZeroSer = lowCardsCount >= 6;

    const scoredCards = eligibleHand.map((card) => {
      let priorityScore = 0;

      // Passing Q♠ if vulnerable (< 75 pts)
      if (card.isBegumHukum) {
        priorityScore += myScore < 75 ? 100 : 10;
      }

      // Passing Paan (if legal)
      if (card.isPaan && !isPaanRestricted) {
        priorityScore += 30 + card.rankValue;
      }

      // If aiming for 0 tricks, dump all high cards
      if (aimForZeroSer) {
        priorityScore += card.rankValue * 3;
      } else {
        // High cards without backup
        priorityScore += card.rankValue;
      }

      return { card, priorityScore };
    });

    scoredCards.sort((a, b) => b.priorityScore - a.priorityScore);
    const selected = scoredCards.slice(0, 5).map((item) => item.card.id);

    // Fallback if not 5
    if (selected.length < 5) {
      return getAutoPassSelection(hand, recipientScore).map((c) => c.id);
    }

    return selected;
  }

  /**
   * Selects a card to play on the bot's turn.
   */
  public static chooseCardToPlay(
    hand: Card[],
    currentTrick: Trick,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
    mySeatIndex: number = 0,
    myScore: number = 0,
    tricksWonThisHand: number = 0,
  ): string {
    const legalCards = getLegalCardsToPlay(hand, currentTrick);
    if (legalCards.length === 0) {
      throw new Error('No legal cards available to play');
    }
    if (legalCards.length === 1) {
      return legalCards[0].id;
    }

    if (difficulty === 'easy') {
      const randomIndex = Math.floor(Math.random() * legalCards.length);
      return legalCards[randomIndex].id;
    }

    const isLeading = currentTrick.cards.length === 0 || !currentTrick.leadSuit;
    const teammateSeat = (mySeatIndex + 2) % 4;

    // Check if aiming for Zero Ser (-5 bonus)
    const aimForZeroSer = tricksWonThisHand === 0;

    if (isLeading) {
      if (difficulty === 'hard' && aimForZeroSer) {
        // Lead lowest card to avoid taking tricks
        const sorted = [...legalCards].sort((a, b) => a.rankValue - b.rankValue);
        return sorted[0].id;
      }
      // Medium / Hard general lead: Lead low or safe non-scoring card
      const nonPaanNonBegum = legalCards.filter((c) => !c.isPaan && !c.isBegumHukum);
      if (nonPaanNonBegum.length > 0) {
        const sorted = nonPaanNonBegum.sort((a, b) => a.rankValue - b.rankValue);
        return sorted[0].id;
      }
      return legalCards.sort((a, b) => a.rankValue - b.rankValue)[0].id;
    }

    // Following or sloughing (not leading)
    const leadSuit = currentTrick.leadSuit!;
    const followingSuit = legalCards.some((c) => c.suit === leadSuit);

    if (!followingSuit) {
      // Sloughing / Discarding!
      // Priority: If Q♠ is legal to play (and not forced already), dump on opponent!
      const begum = legalCards.find((c) => c.isBegumHukum);
      if (begum) {
        return begum.id;
      }

      // Dump high Paan cards (♥) to inflict points on current trick winner if opponent
      const paanCards = legalCards.filter((c) => c.isPaan).sort((a, b) => b.rankValue - a.rankValue);
      if (paanCards.length > 0) {
        return paanCards[0].id;
      }

      // Otherwise dump highest rank card
      const sorted = [...legalCards].sort((a, b) => b.rankValue - a.rankValue);
      return sorted[0].id;
    }

    // Following suit:
    // Determine current winning card in trick
    let currentWinningCard = currentTrick.cards[0];
    for (const played of currentTrick.cards) {
      if (played.card.suit === leadSuit && played.card.rankValue > currentWinningCard.card.rankValue) {
        currentWinningCard = played;
      }
    }

    const currentWinnerIsTeammate = currentWinningCard.seatIndex === teammateSeat;
    const trickHasPoints = currentTrick.cards.some((p) => p.card.isPaan || p.card.isBegumHukum);

    // If my score >= 75, Q♠ gives 0 pts to me
    const isQSafeForMe = myScore >= 75;

    // Separate cards below current winning rank and above
    const undercards = legalCards
      .filter((c) => c.rankValue < currentWinningCard.card.rankValue)
      .sort((a, b) => b.rankValue - a.rankValue); // Highest undercard
    const overcards = legalCards
      .filter((c) => c.rankValue > currentWinningCard.card.rankValue)
      .sort((a, b) => a.rankValue - b.rankValue); // Lowest overcard

    if (aimForZeroSer || (trickHasPoints && !isQSafeForMe)) {
      // Try NOT to win the trick: play highest undercard
      if (undercards.length > 0) {
        return undercards[0].id;
      }
      // If forced to overcard, play lowest overcard
      return overcards[0].id;
    }

    if (currentWinnerIsTeammate) {
      // Teammate is winning! If safe or last player, play high undercard or low card
      if (undercards.length > 0) {
        return undercards[0].id;
      }
      return legalCards.sort((a, b) => a.rankValue - b.rankValue)[0].id;
    }

    // Default safe following
    if (undercards.length > 0) {
      return undercards[0].id;
    }
    return overcards[0]?.id || legalCards[0].id;
  }
}
