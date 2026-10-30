import { createCard, createDeck, dealCards, shuffleDeck } from '../cards';
import { GameEngine } from '../GameEngine';
import { validatePassSelection } from '../passing';
import { getLegalCardsToPlay } from '../rules';
import { calculateTrickPoints, checkGameLoss, checkZeroSerBonus } from '../scoring';
import { determineTrickWinner } from '../trick';
import { Card, PlayedCard, Player, Trick } from '../types';

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${testName}`);
    throw new Error(`Test failed: ${testName}`);
  }
  console.log(`✅ PASSED: ${testName}`);
}

function runAllTests() {
  console.log('--- RUNNING BEGI PAKAD GAME ENGINE TEST SUITE ---');

  // Test 1: Deck creation (52 cards, 4 suits, 13 per suit, no duplicates)
  const deck = createDeck();
  assert(deck.length === 52, 'Deck has exactly 52 cards');
  const uniqueIds = new Set(deck.map((c) => c.id));
  assert(uniqueIds.size === 52, 'All 52 cards in deck are unique');
  const hukumCards = deck.filter((c) => c.suit === 'HUKUM');
  const paanCards = deck.filter((c) => c.suit === 'PAAN');
  const eentCards = deck.filter((c) => c.suit === 'EENT');
  const chidiCards = deck.filter((c) => c.suit === 'CHIDI');
  assert(hukumCards.length === 13, '13 Hukum ♠ cards');
  assert(paanCards.length === 13, '13 Paan ♥ cards');
  assert(eentCards.length === 13, '13 Eent ♦ cards');
  assert(chidiCards.length === 13, '13 Chidi ♣ cards');

  // Test 2: Deal 13 cards to 4 players
  const shuffled = shuffleDeck(deck);
  const hands = dealCards(shuffled);
  assert(hands[0].length === 13, 'Player 1 receives 13 cards');
  assert(hands[1].length === 13, 'Player 2 receives 13 cards');
  assert(hands[2].length === 13, 'Player 3 receives 13 cards');
  assert(hands[3].length === 13, 'Player 4 receives 13 cards');

  // Test 3: Mandatory Test 1 (Section 53)
  // Player score = 94, wins 3♥, 7♥, Q♠, A♦
  // Expected: 3♥ = +1, 7♥ = +1, Q♠ = +0 (since 94 >= 75), A♦ = +0. Total = +2. Final = 96.
  const trickCards1: Card[] = [
    createCard('PAAN', '3'),
    createCard('PAAN', '7'),
    createCard('HUKUM', 'Q'), // Begum Hukum
    createCard('EENT', 'A'),
  ];
  const scoreResult1 = calculateTrickPoints(trickCards1, 0, 94);
  assert(scoreResult1.paanPoints === 2, 'Paan points is +2');
  assert(scoreResult1.begumPoints === 0, 'Begum Hukum points is +0 for score >= 75');
  assert(scoreResult1.totalPointsGained === 2, 'Total points gained is +2');
  assert(scoreResult1.newScore === 96, 'Final score is 96 (94 + 2)');

  // Test 4: Score below 75 receives full 12 points for Begum Hukum
  const scoreResultBelow75 = calculateTrickPoints(trickCards1, 0, 60);
  assert(scoreResultBelow75.begumPoints === 12, 'Begum Hukum gives +12 for score < 75');
  assert(scoreResultBelow75.totalPointsGained === 14, 'Total points is 14 (+2 Paan + 12 Begum)');
  assert(scoreResultBelow75.newScore === 74, 'New score is 74 (60 + 14)');

  // Test 5: Mandatory Test 2 (Section 54)
  // Player score = 94, wins 0 Ser. Expected: 94 - 5 = 89.
  const zeroBonus = checkZeroSerBonus(0, 94);
  assert(zeroBonus.pointsDelta === -5, 'Zero-Ser bonus gives -5 points');
  assert(zeroBonus.newScore === 89, 'Final score after 0-Ser bonus is 89 (94 - 5)');

  // Test 6: 1+ Ser wins does NOT get -5
  const nonZeroBonus = checkZeroSerBonus(1, 94);
  assert(nonZeroBonus.pointsDelta === 0, '1 Ser win does not get bonus');
  assert(nonZeroBonus.newScore === 94, 'Score unchanged at 94');

  // Test 7: Mandatory Test 3 (Section 55)
  // Player score = 90. During passing, opponent attempts to pass 7♥. Expected: INVALID.
  const sampleHand: Card[] = [
    createCard('PAAN', '7'),
    createCard('EENT', '2'),
    createCard('EENT', '3'),
    createCard('EENT', '4'),
    createCard('EENT', '5'),
    createCard('CHIDI', '9'),
  ];
  const passAttemptWithPaan = [
    createCard('PAAN', '7'),
    createCard('EENT', '2'),
    createCard('EENT', '3'),
    createCard('EENT', '4'),
    createCard('EENT', '5'),
  ];
  const passValidationReject = validatePassSelection(passAttemptWithPaan, sampleHand, 90);
  assert(!passValidationReject.valid, 'Pass containing Paan is rejected for 90+ recipient');

  const passAttemptValidNonPaan = [
    createCard('CHIDI', '9'),
    createCard('EENT', '2'),
    createCard('EENT', '3'),
    createCard('EENT', '4'),
    createCard('EENT', '5'),
  ];
  const passValidationAccept = validatePassSelection(passAttemptValidNonPaan, sampleHand, 90);
  assert(passValidationAccept.valid, 'Pass with 5 non-Paan cards is valid for 90+ recipient');

  // Test 8: Special Hukum Rule (Hukum lead with A♠/K♠, holding Q♠ forces Q♠)
  const trickSpecialHukum: Trick = {
    trickNumber: 1,
    leadSuit: 'HUKUM',
    leaderSeatIndex: 0,
    cards: [
      { playerId: 'p1', seatIndex: 0, card: createCard('HUKUM', 'A') },
      { playerId: 'p2', seatIndex: 1, card: createCard('HUKUM', '4') },
    ],
  };
  const handHoldingQandOtherHukum: Card[] = [
    createCard('HUKUM', 'Q'), // Begum Hukum
    createCard('HUKUM', '7'),
    createCard('PAAN', 'K'),
  ];
  const legalPlays1 = getLegalCardsToPlay(handHoldingQandOtherHukum, trickSpecialHukum);
  assert(legalPlays1.length === 1 && legalPlays1[0].isBegumHukum, 'Special Hukum rule forces playing Q♠');

  // Test 9: No Lead Suit Rule (Lead is Eent ♦, no Eent in hand, holding Q♠ forces Q♠)
  const trickLeadEent: Trick = {
    trickNumber: 2,
    leadSuit: 'EENT',
    leaderSeatIndex: 0,
    cards: [{ playerId: 'p1', seatIndex: 0, card: createCard('EENT', '10') }],
  };
  const handNoEentWithQ: Card[] = [
    createCard('HUKUM', 'Q'), // Begum Hukum
    createCard('CHIDI', '7'),
    createCard('PAAN', '9'),
  ];
  const legalPlays2 = getLegalCardsToPlay(handNoEentWithQ, trickLeadEent);
  assert(legalPlays2.length === 1 && legalPlays2[0].isBegumHukum, 'No lead suit forces Q♠ (Priority 1)');

  // Test 10: Trick Winner - No Trump, only lead suit wins
  const playedTrick: PlayedCard[] = [
    { playerId: 'p1', seatIndex: 0, card: createCard('EENT', '8') },
    { playerId: 'p2', seatIndex: 1, card: createCard('PAAN', 'A') }, // High Paan (not lead suit)
    { playerId: 'p3', seatIndex: 2, card: createCard('HUKUM', 'A') }, // High Hukum (not lead suit)
    { playerId: 'p4', seatIndex: 3, card: createCard('EENT', 'K') }, // Highest Eent (lead suit)
  ];
  const trickWinnerResult = determineTrickWinner(playedTrick, 'EENT');
  assert(trickWinnerResult.winnerSeatIndex === 3, 'Winner is Player 4 (highest rank in lead suit EENT K)');

  // Test 12: First Round Lead Rule (Trick 1 cannot start with Hukum ♠ or Paan ♥)
  const trickFirstRoundLead: Trick = {
    trickNumber: 1,
    leadSuit: null,
    leaderSeatIndex: 0,
    cards: [],
  };
  const handMixedSuits: Card[] = [
    createCard('HUKUM', 'A'),
    createCard('PAAN', 'K'),
    createCard('CHIDI', '5'),
    createCard('EENT', '10'),
  ];
  const legalFirstRoundLeads = getLegalCardsToPlay(handMixedSuits, trickFirstRoundLead);
  assert(
    legalFirstRoundLeads.length === 2 &&
      legalFirstRoundLeads.every((c) => c.suit === 'CHIDI' || c.suit === 'EENT'),
    'First round lead cannot be Hukum ♠ or Paan ♥ (only Club/Diamond allowed)',
  );

  // Test 13: Trick 1 Off-Suit Rule: Cannot throw Spade or Heart if Club/Diamond is held
  const trick1LeadEent: Trick = {
    trickNumber: 1,
    leadSuit: 'EENT',
    leaderSeatIndex: 0,
    cards: [{ playerId: 'p1', seatIndex: 0, card: createCard('EENT', '10') }],
  };
  const handTrick1NoEentWithQ: Card[] = [
    createCard('HUKUM', 'Q'), // Begum Hukum
    createCard('CHIDI', '7'),
    createCard('PAAN', '9'),
  ];
  const legalPlaysTrick1 = getLegalCardsToPlay(handTrick1NoEentWithQ, trick1LeadEent);
  assert(
    legalPlaysTrick1.length === 1 && legalPlaysTrick1[0].suit === 'CHIDI',
    'Trick 1 off-suit: Must play Club/Diamond if held (cannot throw Spade/Heart)',
  );

  // Test 14: Trick 1 Priority fallback when NO Club/Diamond held (Spade except Q > Hearts > Q♠)
  const handNoClubDiamond: Card[] = [
    createCard('HUKUM', '5'),
    createCard('PAAN', '8'),
    createCard('HUKUM', 'Q'),
  ];
  const legalFallbackSpade = getLegalCardsToPlay(handNoClubDiamond, trick1LeadEent);
  assert(
    legalFallbackSpade.length === 1 && legalFallbackSpade[0].suit === 'HUKUM' && legalFallbackSpade[0].rank === '5',
    'Trick 1 fallback: Spades (except Q♠) takes priority over Hearts',
  );

  const handOnlyHeartsAndBegum: Card[] = [
    createCard('PAAN', '8'),
    createCard('HUKUM', 'Q'),
  ];
  const legalFallbackHearts = getLegalCardsToPlay(handOnlyHeartsAndBegum, trick1LeadEent);
  assert(
    legalFallbackHearts.length === 1 && legalFallbackHearts[0].suit === 'PAAN',
    'Trick 1 fallback: Hearts takes priority over Q♠ when no other Spade exists',
  );

  // Test 15: A completed trick (4 cards) cannot accept a 5th card while it is being collected
  const enginePlayers: Player[] = [0, 1, 2, 3].map((s) => ({
    id: `p${s}`,
    name: `P${s}`,
    avatarSeed: `a${s}`,
    seatIndex: s,
    teamId: s % 2 === 0 ? 1 : 2,
    isBot: false,
    isConnected: true,
    score: 0,
    tricksWonThisHand: 0,
    cardsRemaining: 13,
  }));
  const engine = new GameEngine(enginePlayers);
  engine.autoPassRemainingPlayers();
  let lastSeat = -1;
  for (let i = 0; i < 4; i++) {
    const st = engine.getState();
    lastSeat = st.currentTurnSeatIndex;
    const legal = getLegalCardsToPlay(st.playerHands[lastSeat], st.currentTrick);
    assert(engine.playCard(lastSeat, legal[0].id).success, `Trick card ${i + 1} accepted`);
  }
  const collecting = engine.getState();
  const extraCard = getLegalCardsToPlay(collecting.playerHands[lastSeat], collecting.currentTrick)[0]
    ?? collecting.playerHands[lastSeat][0];
  const doubleTap = engine.playCard(lastSeat, extraCard.id);
  assert(!doubleTap.success, 'Double tap on the 4th card of a trick is rejected');
  assert(engine.getState().currentTrick.cards.length === 4, 'Completed trick still has exactly 4 cards');
  assert(engine.getState().playerHands[lastSeat].length === 12, 'Double-tapping player keeps the rest of their hand');

  engine.finalizeCompletedTrick();
  const trickNumberAfterFinalize = engine.getState().currentTrickNumber;
  engine.finalizeCompletedTrick();
  assert(
    engine.getState().currentTrickNumber === trickNumberAfterFinalize && engine.getState().trickHistory.length === 1,
    'Finalizing the same trick twice is a no-op',
  );

  // Puts an engine at the end of a trick (4 cards on the table, seat 0 winning it)
  const engineAtTrickEnd = (startScores: number[], trickNumber: number, tricksWon: number[]) => {
    const e = new GameEngine(enginePlayers.map((p) => ({ ...p, score: startScores[p.seatIndex] })));
    e.autoPassRemainingPlayers();
    const st = e.getState();
    st.currentTrickNumber = trickNumber;
    st.currentTrick = {
      trickNumber,
      leadSuit: 'CHIDI',
      leaderSeatIndex: 0,
      winnerSeatIndex: 0,
      cards: [0, 1, 2, 3].map((s) => ({ playerId: `p${s}`, seatIndex: s, card: createCard('CHIDI', '2') })),
    };
    st.players.forEach((p) => { p.tricksWonThisHand = tricksWon[p.seatIndex]; });
    return e;
  };

  // Test 16: Game ending on the 13th Ser still applies the Zero-Ser -5 and records the round
  const lastSerEngine = engineAtTrickEnd([88, 20, 40, 60], 13, [5, 0, 4, 4]);
  lastSerEngine.getState().players[0].score = 101; // seat 0 crosses 100 on the final Ser
  const lastSerResult = lastSerEngine.finalizeCompletedTrick();
  const lastSerState = lastSerEngine.getState();
  assert(lastSerResult.isGameOver === true && lastSerState.phase === 'GAME_COMPLETE', 'Game ends when 100 is reached on the 13th Ser');
  assert(lastSerState.players[1].score === 15, 'Zero-Ser player gets -5 even when the game ends on the 13th Ser');
  assert(
    lastSerState.handHistory.length === 1 && lastSerState.handHistory[0].zeroTrickBonusAwarded[1] === true,
    'Final round is recorded with its Zero-Ser bonus',
  );

  // Test 17: Zero-Ser bonus can take a score below 0
  const negativeEngine = engineAtTrickEnd([0, 3, 30, 30], 13, [6, 0, 4, 3]);
  negativeEngine.finalizeCompletedTrick();
  const negativeHand = negativeEngine.getState().handHistory[0];
  assert(negativeEngine.getState().players[1].score === -2, 'Zero-Ser takes a score of 3 to -2');
  assert(
    negativeHand.finalScores[1] - negativeHand.startScores[1] === -5,
    'Round change for a Zero-Ser player is -5, not 0',
  );

  // Test 18: Game ending mid-round records the partial round so the scorecard adds up
  const midRoundEngine = engineAtTrickEnd([95, 10, 20, 30], 7, [3, 0, 2, 1]);
  midRoundEngine.getState().players[0].score = 100;
  midRoundEngine.finalizeCompletedTrick();
  const midState = midRoundEngine.getState();
  const partialHand = midState.handHistory[0];
  assert(midState.phase === 'GAME_COMPLETE' && midState.handHistory.length === 1, 'Mid-round game end records the round');
  assert(
    partialHand.isPartial === true && partialHand.zeroTrickBonusAwarded[1] === false && midState.players[1].score === 10,
    'No Zero-Ser bonus for an unfinished round',
  );
  assert(
    [0, 1, 2, 3].every((s) => partialHand.finalScores[s] === midState.players[s].score),
    'Recorded round totals match final scores',
  );

  // Test 19: 75-point rule uses the score at the START of the round, not the score mid-round
  const qTrick: Card[] = [createCard('HUKUM', 'K'), createCard('HUKUM', 'Q'), createCard('HUKUM', '2'), createCard('HUKUM', '3')];
  assert(
    calculateTrickPoints(qTrick, 0, 80, 70).begumPoints === 12,
    'Q♠ gives +12 when the player crossed 75 during the round (started it at 70)',
  );
  assert(
    calculateTrickPoints(qTrick, 0, 76, 76).begumPoints === 0,
    'Q♠ gives +0 when the player had 75+ at the start of the round',
  );

  // Same rule through the engine: seat 0 starts the round at 70, is on 80 mid-round, then takes Q♠
  const qEngine = new GameEngine(enginePlayers.map((p) => ({ ...p, score: p.seatIndex === 0 ? 70 : 0 })));
  qEngine.autoPassRemainingPlayers();
  const qState = qEngine.getState();
  qState.players[0].score = 80;
  qState.currentTrickNumber = 2;
  qState.currentTrick = { trickNumber: 2, leadSuit: null, leaderSeatIndex: 0, cards: [] };
  qState.currentTurnSeatIndex = 0;
  qState.playerHands = { 0: [createCard('HUKUM', 'K')], 1: [createCard('HUKUM', 'Q')], 2: [createCard('HUKUM', '2')], 3: [createCard('HUKUM', '3')] };
  for (const [seat, cardId] of [[0, 'HUKUM_K'], [1, 'HUKUM_Q'], [2, 'HUKUM_2'], [3, 'HUKUM_3']] as const) {
    qEngine.playCard(seat, cardId);
  }
  assert(qState.players[0].score === 92, 'Engine: Q♠ adds 12 for a player who reached 75 mid-round (80 -> 92)');

  console.log('🎉 ALL BEGI PAKAD UNIT TESTS PASSED SUCCESSFULLY! 🎉');
}

runAllTests();
