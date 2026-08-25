import React, { useEffect, useRef, useState } from 'react';
import { BotAI } from '../game/Bot';
import { GameEngine } from '../game/GameEngine';
import { ClientGameState, Player, TeamId, HandScoreResult } from '../game/types';
import { GameOverModal } from './GameOverModal';
import { GameTable } from './GameTable';
import { HowToPlayModal } from './HowToPlayModal';
import { RoundSummaryModal } from './RoundSummaryModal';
import { sounds } from '../services/audio';
import { recordGameResult } from '../services/storage';

export interface LocalBotGameProps {
  playerName: string;
  avatarSeed: string;
  botDifficulty?: 'easy' | 'medium' | 'hard';
  onExitToMenu: () => void;
  tableTheme: string;
}

export const LocalBotGame: React.FC<LocalBotGameProps> = ({
  playerName,
  avatarSeed,
  botDifficulty = 'medium',
  onExitToMenu,
  tableTheme,
}) => {
  const diff: 'easy' | 'medium' | 'hard' =
    botDifficulty === 'easy' || botDifficulty === 'hard' ? botDifficulty : 'medium';
  const engineRef = useRef<GameEngine | null>(null);
  const [clientState, setClientState] = useState<ClientGameState | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [roundSummaryResult, setRoundSummaryResult] = useState<HandScoreResult | null>(null);
  const botTurnTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Game with Human in Seat 0 (Team 1) and 3 Bots
  const startNewMatch = () => {
    if (botTurnTimerRef.current) {
      clearTimeout(botTurnTimerRef.current);
    }
    setRoundSummaryResult(null);

    const players: Player[] = [
      {
        id: 'HUMAN_1',
        name: playerName || 'You',
        avatarSeed,
        seatIndex: 0,
        teamId: 1,
        isBot: false,
        isConnected: true,
        score: 0,
        tricksWonThisHand: 0,
        cardsRemaining: 13,
      },
      {
        id: 'BOT_1',
        name: 'Bot 1 (Aman)',
        avatarSeed: 'bot_1',
        seatIndex: 1,
        teamId: 2,
        isBot: true,
        botDifficulty: diff,
        isConnected: true,
        score: 0,
        tricksWonThisHand: 0,
        cardsRemaining: 13,
      },
      {
        id: 'BOT_2',
        name: 'Bot 2 (Partner)',
        avatarSeed: 'bot_2',
        seatIndex: 2,
        teamId: 1, // Teammate!
        isBot: true,
        botDifficulty: diff,
        isConnected: true,
        score: 0,
        tricksWonThisHand: 0,
        cardsRemaining: 13,
      },
      {
        id: 'BOT_3',
        name: 'Bot 3 (Mohit)',
        avatarSeed: 'bot_3',
        seatIndex: 3,
        teamId: 2,
        isBot: true,
        botDifficulty: diff,
        isConnected: true,
        score: 0,
        tricksWonThisHand: 0,
        cardsRemaining: 13,
      },
    ];

    const engine = new GameEngine(players);
    engineRef.current = engine;
    setIsGameOver(false);
    updateClientView();

    // Trigger bot passes for seats 1, 2, 3
    handleBotPassing();
  };

  useEffect(() => {
    startNewMatch();
    return () => {
      if (botTurnTimerRef.current) clearTimeout(botTurnTimerRef.current);
    };
  }, [playerName, botDifficulty]);

  const updateClientView = () => {
    if (!engineRef.current) return;
    const view = engineRef.current.getClientView(0);
    setClientState({ ...view });

    if (view.phase === 'GAME_COMPLETE') {
      setIsGameOver(true);
      const isWin = view.winnerTeam === 1;
      const zeroSerCount = view.handHistory.filter((h) => h.zeroTrickBonusAwarded[0]).length;
      recordGameResult(isWin, zeroSerCount);
    }
  };

  const handleBotPassing = () => {
    const engine = engineRef.current;
    if (!engine || engine.getState().phase !== 'PASSING') return;

    for (let s = 1; s <= 3; s++) {
      if (!engine.getState().passingState.submitted[s]) {
        const hand = engine.getState().playerHands[s];
        const recipientSeat = (s + 1) % 4;
        const recipientScore = engine.getState().players[recipientSeat].score;
        const passCardIds = BotAI.chooseCardsToPass(
          hand,
          recipientScore,
          diff,
          engine.getState().players[s].score,
        );
        engine.submitPass(s, passCardIds);
      }
    }
  };

  // Human player submits pass
  const handleHumanSubmitPass = (cardIds: string[]) => {
    const engine = engineRef.current;
    if (!engine) return;

    // Ensure bots have picked passes
    handleBotPassing();

    const res = engine.submitPass(0, cardIds);
    if (res.success) {
      updateClientView();
      if (engine.getState().phase === 'PLAYER_TURN') {
        checkAndTriggerBotTurn();
      }
    }
  };

  const handleHumanAutoPass = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.autoPassRemainingPlayers();
    updateClientView();
    if (engine.getState().phase === 'PLAYER_TURN') {
      checkAndTriggerBotTurn();
    }
  };

  // Human plays card
  const handleHumanPlayCard = (cardId: string) => {
    const engine = engineRef.current;
    if (!engine) return;

    sounds.playCardThrow();
    const res = engine.playCard(0, cardId);
    if (res.success) {
      updateClientView();
      if (res.isTrickComplete) {
        handleTrickCompletionSequence();
      } else {
        checkAndTriggerBotTurn();
      }
    }
  };

  const handleTrickCompletionSequence = () => {
    // 1. Play collect sound as cards start flying to winner (800ms)
    setTimeout(() => {
      sounds.playTrickCollect();
    }, 800);

    // 2. Finalize trick after sweep animation finishes (1400ms)
    botTurnTimerRef.current = setTimeout(() => {
      if (!engineRef.current) return;
      const finalRes = engineRef.current.finalizeCompletedTrick();
      updateClientView();
      if (finalRes.handResult && !finalRes.isGameOver) {
        setRoundSummaryResult(finalRes.handResult);
      } else if (!finalRes.isGameOver) {
        checkAndTriggerBotTurn();
      }
    }, 1400);
  };

  const handleNextRoundFromSummary = () => {
    setRoundSummaryResult(null);
    const engine = engineRef.current;
    if (!engine) return;
    const state = engine.getState();
    engine.startNewHand(state.handNumber + 1, state.handNumber % 4);
    updateClientView();
    handleBotPassing();
  };

  // Check if current turn is a bot and execute with natural delay
  const checkAndTriggerBotTurn = () => {
    const engine = engineRef.current;
    if (!engine) return;

    const state = engine.getState();
    if (state.phase === 'HAND_COMPLETE') {
      return;
    }

    if (state.phase !== 'PLAYER_TURN') return;

    // Do not trigger bot turn if trick is currently complete and waiting for collection sequence
    if (state.currentTrick.cards.length === 4) return;

    const currentSeat = state.currentTurnSeatIndex;
    if (currentSeat !== 0) {
      // Bot turn
      botTurnTimerRef.current = setTimeout(() => {
        if (!engineRef.current) return;
        const freshState = engineRef.current.getState();
        if (
          freshState.phase === 'PLAYER_TURN' &&
          freshState.currentTurnSeatIndex === currentSeat &&
          freshState.currentTrick.cards.length < 4
        ) {
          const hand = freshState.playerHands[currentSeat];
          const botPlayer = freshState.players[currentSeat];
          const cardId = BotAI.chooseCardToPlay(
            hand,
            freshState.currentTrick,
            diff,
            currentSeat,
            botPlayer.score,
            botPlayer.tricksWonThisHand,
          );

          sounds.playCardThrow();
          const playRes = engineRef.current.playCard(currentSeat, cardId);
          updateClientView();

          if (playRes.isTrickComplete) {
            handleTrickCompletionSequence();
          } else {
            checkAndTriggerBotTurn();
          }
        }
      }, 700 + Math.random() * 500);
    }
  };

  if (!clientState) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-400">
        Loading Begi Pakad table...
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-950 flex flex-col items-center">
      <GameTable
        gameState={clientState}
        onPlayCard={handleHumanPlayCard}
        onSubmitPass={handleHumanSubmitPass}
        onAutoPass={handleHumanAutoPass}
        onLeaveGame={onExitToMenu}
        onOpenRules={() => setShowRules(true)}
        tableTheme={tableTheme}
      />

      <HowToPlayModal isOpen={showRules} onClose={() => setShowRules(false)} />

      <RoundSummaryModal
        isOpen={Boolean(roundSummaryResult)}
        handResult={roundSummaryResult}
        players={clientState.players}
        onContinue={handleNextRoundFromSummary}
      />

      <GameOverModal
        isOpen={isGameOver}
        winnerTeam={clientState.winnerTeam}
        losingTeam={clientState.losingTeam}
        players={clientState.players}
        myTeamId={1}
        onPlayAgain={startNewMatch}
        onExitToMenu={onExitToMenu}
      />
    </div>
  );
};
