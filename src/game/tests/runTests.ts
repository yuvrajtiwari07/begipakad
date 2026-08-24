import { createCard, createDeck, dealCards, shuffleDeck } from '../cards.ts';
import { GameEngine } from '../GameEngine.ts';
import { validatePassSelection } from '../passing.ts';
import { getLegalCardsToPlay } from '../rules.ts';
import { calculateTrickPoints, checkGameLoss, checkZeroSerBonus } from '../scoring.ts';
import { determineTrickWinner } from '../trick.ts';
import { Card, PlayedCard, Player, Trick } from '../types.ts';

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

  console.log('🎉 ALL BEGI PAKAD UNIT TESTS PASSED SUCCESSFULLY! 🎉');
}

runAllTests();
