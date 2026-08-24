import { createDeck, dealCards, shuffleDeck, sortCards } from './cards.ts';
import { getAutoPassSelection, getPassingRecipientSeat, validatePassSelection } from './passing.ts';
import { getLegalCardsToPlay, isCardPlayLegal } from './rules.ts';
import {
  calculateTrickPoints,
  checkGameLoss,
  checkZeroSerBonus,
  getTeamForSeat,
} from './scoring.ts';
import { determineTrickWinner } from './trick.ts';
import {
  Card,
  ClientGameState,
  FullGameState,
  HandScoreResult,
  PlayedCard,
  Player,
  Trick,
} from './types.ts';

export class GameEngine {
  private state: FullGameState;

  constructor(players: Player[], gameId?: string, roomId?: string) {
    if (players.length !== 4) {
      throw new Error('Begi Pakad requires exactly 4 players');
    }

    const assignedPlayers = players.map((p, index) => ({
      ...p,
      seatIndex: index,
      teamId: getTeamForSeat(index),
      score: p.score ?? 0,
      tricksWonThisHand: 0,
      cardsRemaining: 13,
      isConnected: p.isConnected ?? true,
    }));

    this.state = {
      gameId: gameId || `game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      roomId,
      phase: 'DEALING',
      handNumber: 1,
      currentTrickNumber: 1,
      players: assignedPlayers,
      playerHands: { 0: [], 1: [], 2: [], 3: [] },
      passingState: {
        selectedCards: {},
        submitted: { 0: false, 1: false, 2: false, 3: false },
        passingTargetMap: { 0: 1, 1: 2, 2: 3, 3: 0 },
        timeRemainingSeconds: 120,
      },
      currentTrick: {
        trickNumber: 1,
        leadSuit: null,
        leaderSeatIndex: 0,
        cards: [],
      },
      trickHistory: [],
      currentTurnSeatIndex: 0,
      handHistory: [],
      losingTeam: null,
      winnerTeam: null,
      lastActionMessage: 'Game started. Dealing 13 cards each.',
    };

    this.startNewHand(1, 0);
  }

  public getState(): FullGameState {
    return this.state;
  }

  public getClientView(seatIndex: number): ClientGameState {
    const pHand = this.state.playerHands[seatIndex] || [];
    const opponentCounts: Record<number, number> = {};
    for (let i = 0; i < 4; i++) {
      opponentCounts[i] = (this.state.playerHands[i] || []).length;
    }

    const recipientSeat = getPassingRecipientSeat(seatIndex);
    const recipientPlayer = this.state.players[recipientSeat];
    const recipientScore = recipientPlayer ? recipientPlayer.score : 0;
    const canReceivePaan = recipientScore < 90;

    const submittedSeats = Object.entries(this.state.passingState.submitted)
      .filter(([_, submitted]) => submitted)
      .map(([seat]) => Number(seat));

    const isMyTurn =
      this.state.phase === 'PLAYER_TURN' && this.state.currentTurnSeatIndex === seatIndex;
    const legalPlayCards = isMyTurn
      ? getLegalCardsToPlay(pHand, this.state.currentTrick)
      : [];

    return {
      gameId: this.state.gameId,
      roomId: this.state.roomId,
      phase: this.state.phase,
      handNumber: this.state.handNumber,
      currentTrickNumber: this.state.currentTrickNumber,
      players: this.state.players.map((p) => ({
        ...p,
        cardsRemaining: (this.state.playerHands[p.seatIndex] || []).length,
      })),
      mySeatIndex: seatIndex,
      myHand: pHand,
      opponentCardCounts: opponentCounts,
      passingState: {
        hasSubmitted: !!this.state.passingState.submitted[seatIndex],
        mySelectedCardIds: this.state.passingState.selectedCards[seatIndex] || [],
        submittedSeats,
        targetRecipientSeatIndex: recipientSeat,
        targetRecipientScore: recipientScore,
        targetRecipientCanReceivePaan: canReceivePaan,
        timeRemainingSeconds: this.state.passingState.timeRemainingSeconds,
      },
      lastReceivedPassedCards: this.state.lastReceivedPassedCards?.[seatIndex],
      currentTrick: this.state.currentTrick,
      trickHistory: this.state.trickHistory,
      currentTurnSeatIndex: this.state.currentTurnSeatIndex,
      handHistory: this.state.handHistory,
      losingTeam: this.state.losingTeam,
      winnerTeam: this.state.winnerTeam,
      lastActionMessage: this.state.lastActionMessage,
      legalPlayCardIds: legalPlayCards.map((c) => c.id),
      turnTimeLimitSeconds: 20,
    };
  }

  public startNewHand(handNumber: number, leaderSeatIndex: number): void {
    const deck = shuffleDeck(createDeck());
    const hands = dealCards(deck);

    this.state.handNumber = handNumber;
    this.state.currentTrickNumber = 1;
    this.state.playerHands = hands;
    this.state.phase = 'PASSING';
    this.state.passingState = {
      selectedCards: {},
      submitted: { 0: false, 1: false, 2: false, 3: false },
      passingTargetMap: { 0: 1, 1: 2, 2: 3, 3: 0 },
      timeRemainingSeconds: 120,
    };
    this.state.lastReceivedPassedCards = undefined;
    this.state.currentTrick = {
      trickNumber: 1,
      leadSuit: null,
      leaderSeatIndex,
      cards: [],
    };
    this.state.currentTurnSeatIndex = leaderSeatIndex;
    this.state.lastActionMessage = `Hand ${handNumber}: 13 cards dealt. Please select 5 cards to pass.`;

    for (const player of this.state.players) {
      player.tricksWonThisHand = 0;
      player.cardsRemaining = 13;
    }
  }

  public submitPass(seatIndex: number, cardIds: string[]): { success: boolean; error?: string } {
    if (this.state.phase !== 'PASSING') {
      return { success: false, error: 'Not currently in passing phase' };
    }
    if (this.state.passingState.submitted[seatIndex]) {
      return { success: false, error: 'Pass already submitted for this seat' };
    }

    const hand = this.state.playerHands[seatIndex] || [];
    const selectedCards = hand.filter((c) => cardIds.includes(c.id));

    const recipientSeat = getPassingRecipientSeat(seatIndex);
    const recipientScore = this.state.players[recipientSeat].score;

    const validation = validatePassSelection(selectedCards, hand, recipientScore);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    this.state.passingState.selectedCards[seatIndex] = cardIds;
    this.state.passingState.submitted[seatIndex] = true;

    // Check if all 4 players submitted
    const allSubmitted = [0, 1, 2, 3].every((s) => this.state.passingState.submitted[s]);
    if (allSubmitted) {
      this.executeSimultaneousPass();
    }

    return { success: true };
  }

  public executeSimultaneousPass(): void {
    // 1. Collect passed cards from each player
    const passedCardsBySender: Record<number, Card[]> = {};
    for (let s = 0; s < 4; s++) {
      const cardIds = this.state.passingState.selectedCards[s] || [];
      const hand = this.state.playerHands[s] || [];
      passedCardsBySender[s] = hand.filter((c) => cardIds.includes(c.id));
      // Remove from sender hand
      this.state.playerHands[s] = hand.filter((c) => !cardIds.includes(c.id));
    }

    // 2. Transfer passed cards to recipients & record for popup
    this.state.lastReceivedPassedCards = {};
    for (let s = 0; s < 4; s++) {
      const recipient = getPassingRecipientSeat(s);
      const incomingCards = passedCardsBySender[s] || [];
      this.state.playerHands[recipient] = sortCards([
        ...this.state.playerHands[recipient],
        ...incomingCards,
      ]);
      this.state.lastReceivedPassedCards[recipient] = {
        fromSeatIndex: s,
        cards: incomingCards,
        handNumber: this.state.handNumber,
      };
    }

    // 3. Complete passing phase and start first trick
    this.state.phase = 'PLAYER_TURN';
    this.state.currentTrick = {
      trickNumber: 1,
      leadSuit: null,
      leaderSeatIndex: this.state.currentTurnSeatIndex,
      cards: [],
    };
    this.state.lastActionMessage = `5 cards passed simultaneously! ${this.state.players[this.state.currentTurnSeatIndex].name}'s turn to lead.`;
  }

  public autoPassRemainingPlayers(): void {
    if (this.state.phase !== 'PASSING') return;

    for (let s = 0; s < 4; s++) {
      if (!this.state.passingState.submitted[s]) {
        const hand = this.state.playerHands[s];
        const recipientSeat = getPassingRecipientSeat(s);
        const recipientScore = this.state.players[recipientSeat].score;
        const autoCards = getAutoPassSelection(hand, recipientScore);
        this.state.passingState.selectedCards[s] = autoCards.map((c) => c.id);
        this.state.passingState.submitted[s] = true;
      }
    }

    this.executeSimultaneousPass();
  }

  public playCard(
    seatIndex: number,
    cardId: string,
  ): {
    success: boolean;
    error?: string;
    playedCard?: PlayedCard;
    completedTrick?: Trick;
    handResult?: HandScoreResult;
    isGameOver?: boolean;
    isTrickComplete?: boolean;
  } {
    if (this.state.phase !== 'PLAYER_TURN') {
      return { success: false, error: `Cannot play card during phase ${this.state.phase}` };
    }
    if (seatIndex !== this.state.currentTurnSeatIndex) {
      return {
        success: false,
        error: `Not your turn. Current turn: Player ${this.state.currentTurnSeatIndex + 1}`,
      };
    }

    const hand = this.state.playerHands[seatIndex] || [];
    const card = hand.find((c) => c.id === cardId);
    if (!card) {
      return { success: false, error: 'Card not found in hand' };
    }

    if (!isCardPlayLegal(card, hand, this.state.currentTrick)) {
      return { success: false, error: 'Illegal card play according to Begi Pakad rules' };
    }

    // Remove card from hand
    this.state.playerHands[seatIndex] = hand.filter((c) => c.id !== cardId);
    this.state.players[seatIndex].cardsRemaining = this.state.playerHands[seatIndex].length;

    // If first card in trick, set lead suit
    if (this.state.currentTrick.cards.length === 0) {
      this.state.currentTrick.leadSuit = card.suit;
    }

    const playedCard: PlayedCard = {
      playerId: this.state.players[seatIndex].id,
      seatIndex,
      card,
    };
    this.state.currentTrick.cards.push(playedCard);

    // If trick is complete (4 cards played)
    if (this.state.currentTrick.cards.length === 4) {
      const trick = this.state.currentTrick;
      const leadSuit = trick.leadSuit!;

      // 1. Determine trick winner
      const { winnerSeatIndex, winningCard } = determineTrickWinner(trick.cards, leadSuit);
      trick.winnerSeatIndex = winnerSeatIndex;

      const winnerPlayer = this.state.players[winnerSeatIndex];
      winnerPlayer.tricksWonThisHand += 1;

      // 2. Calculate scoring points (Paan + Begum Hukum with 75-point rule)
      const trickCards = trick.cards.map((p) => p.card);
      const scoreResult = calculateTrickPoints(trickCards, winnerSeatIndex, winnerPlayer.score);

      trick.pointsAwarded = {
        playerId: winnerPlayer.id,
        seatIndex: winnerSeatIndex,
        paanPoints: scoreResult.paanPoints,
        begumPoints: scoreResult.begumPoints,
        totalPoints: scoreResult.totalPointsGained,
      };

      // 3. Update winner cumulative score
      winnerPlayer.score = scoreResult.newScore;
      this.state.lastActionMessage = `${winnerPlayer.name} won Ser with ${winningCard.rank} ${winningCard.suit} (+${scoreResult.totalPointsGained} pts)!`;

      return {
        success: true,
        playedCard,
        completedTrick: trick,
        isTrickComplete: true,
      };
    } else {
      // Advance turn to next player clockwise
      this.state.currentTurnSeatIndex = (this.state.currentTurnSeatIndex + 1) % 4;
      this.state.lastActionMessage = `${this.state.players[seatIndex].name} played ${card.rank} ${card.suit}. Turn: ${this.state.players[this.state.currentTurnSeatIndex].name}`;
      return { success: true, playedCard, isTrickComplete: false };
    }
  }

  public finalizeCompletedTrick(): {
    completedTrick: Trick;
    handResult?: HandScoreResult;
    isGameOver?: boolean;
  } {
    const trick = this.state.currentTrick;
    const winnerSeatIndex = trick.winnerSeatIndex ?? 0;
    const winnerPlayer = this.state.players[winnerSeatIndex];

    this.state.trickHistory.push(trick);

    // Check if score reached >= 100 immediately
    const scoresMap: Record<number, number> = {};
    for (const p of this.state.players) {
      scoresMap[p.seatIndex] = p.score;
    }

    const lossCheck = checkGameLoss(scoresMap);
    if (lossCheck.isGameOver) {
      this.state.phase = 'GAME_COMPLETE';
      this.state.losingTeam = lossCheck.losingTeam;
      this.state.winnerTeam = lossCheck.winnerTeam;
      this.state.lastActionMessage = `Game Over! ${winnerPlayer.name} reached ${winnerPlayer.score} points. Team ${lossCheck.losingTeam} loses!`;

      return {
        completedTrick: trick,
        isGameOver: true,
      };
    }

    // Check if 13 tricks in this hand are completed
    if (this.state.currentTrickNumber === 13) {
      const handResult = this.resolveHandCompletion();
      return {
        completedTrick: trick,
        handResult,
        isGameOver: this.state.phase === 'GAME_COMPLETE',
      };
    }

    // Prepare next trick
    this.state.currentTrickNumber += 1;
    this.state.currentTurnSeatIndex = winnerSeatIndex;
    this.state.currentTrick = {
      trickNumber: this.state.currentTrickNumber,
      leadSuit: null,
      leaderSeatIndex: winnerSeatIndex,
      cards: [],
    };
    this.state.lastActionMessage = `${winnerPlayer.name} won Ser. Leads Ser ${this.state.currentTrickNumber}/13.`;

    return {
      completedTrick: trick,
      isGameOver: false,
    };
  }

  private resolveHandCompletion(): HandScoreResult {
    const startScores: Record<number, number> = {};
    const trickPointsGained: Record<number, number> = {};
    const tricksWon: Record<number, number> = {};
    const zeroBonus: Record<number, boolean> = {};
    const finalScores: Record<number, number> = {};

    // 1. Calculate Zero Ser Rule: -5 for 0 tricks won
    for (const p of this.state.players) {
      const s = p.seatIndex;
      tricksWon[s] = p.tricksWonThisHand;
      const zeroCheck = checkZeroSerBonus(p.tricksWonThisHand, p.score);
      if (zeroCheck.pointsDelta < 0) {
        zeroBonus[s] = true;
        p.score = zeroCheck.newScore;
      } else {
        zeroBonus[s] = false;
      }
      finalScores[s] = p.score;
    }

    const lossCheck = checkGameLoss(finalScores);
    const handResult: HandScoreResult = {
      handNumber: this.state.handNumber,
      startScores,
      trickPointsGained,
      tricksWon,
      zeroTrickBonusAwarded: zeroBonus,
      finalScores,
      losingTeam: lossCheck.losingTeam ?? undefined,
      losingPlayers: lossCheck.losingPlayers,
    };

    this.state.handHistory.push(handResult);

    if (lossCheck.isGameOver) {
      this.state.phase = 'GAME_COMPLETE';
      this.state.losingTeam = lossCheck.losingTeam;
      this.state.winnerTeam = lossCheck.winnerTeam;
      this.state.lastActionMessage = `Game Over after Hand ${this.state.handNumber}! Team ${lossCheck.losingTeam} reached 100+ points and loses.`;
    } else {
      this.state.phase = 'HAND_COMPLETE';
      this.state.lastActionMessage = `Hand ${this.state.handNumber} completed! Ready for Hand ${this.state.handNumber + 1}.`;
    }

    return handResult;
  }
}
