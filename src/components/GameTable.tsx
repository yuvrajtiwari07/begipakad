import React, { useEffect, useState } from 'react';
import { Card as CardType, ClientGameState, Player, TeamId } from '../game/types.ts';
import { CardHand } from './CardHand.tsx';
import { PlayerSeat } from './PlayerSeat.tsx';
import { TrickArea } from './TrickArea.tsx';
import { PassingPanel } from './PassingPanel.tsx';
import { ScoreBoard } from './ScoreBoard.tsx';
import { PassedCardsModal } from './PassedCardsModal.tsx';
import {
  Volume2,
  VolumeX,
  BookOpen,
  LogOut,
  BarChart3,
  Sparkles,
  Award,
  MessageSquare,
} from 'lucide-react';
import { sounds } from '../services/audio.ts';
import { SUIT_NAMES } from '../game/cards.ts';
import { getSocket } from '../networking/socket.ts';

export interface GameTableProps {
  gameState: ClientGameState;
  onPlayCard: (cardId: string) => void;
  onSubmitPass: (cardIds: string[]) => void;
  onAutoPass: () => void;
  onLeaveGame: () => void;
  onReplaceWithBot?: () => void;
  onExitAndEndGame?: () => void;
  onHostEndGame?: () => void;
  onSendQuickMessage?: (text: string) => void;
  isHost?: boolean;
  onOpenRules: () => void;
  tableTheme?: string;
}

export const GameTable: React.FC<GameTableProps> = ({
  gameState,
  onPlayCard,
  onSubmitPass,
  onAutoPass,
  onLeaveGame,
  onReplaceWithBot,
  onExitAndEndGame,
  onHostEndGame,
  onSendQuickMessage,
  isHost = false,
  onOpenRules,
  tableTheme = 'emerald',
}) => {
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [selectedPassCardIds, setSelectedPassCardIds] = useState<string[]>([]);
  const [showScoreDrawer, setShowScoreDrawer] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(sounds.isEnabled());
  const [dismissedPassHand, setDismissedPassHand] = useState<number | null>(null);
  const [turnSecondsRemaining, setTurnSecondsRemaining] = useState<number>(20);
  const [showQuickMsgMenu, setShowQuickMsgMenu] = useState(false);
  const [activeToasts, setActiveToasts] = useState<Record<number, string | null>>({});

  const quickMessages = ['Randi', 'Lawda', 'Madarchod', 'Mauga', 'chutiya'];

  const mySeat = gameState.mySeatIndex;
  const isPassingPhase = gameState.phase === 'PASSING';
  const isTrickCollecting = gameState.currentTrick.cards.length === 4;
  const isMyTurn =
    gameState.phase === 'PLAYER_TURN' &&
    gameState.currentTurnSeatIndex === mySeat &&
    !isTrickCollecting;

  // Reset selected passed cards whenever hand changes or passing phase starts
  useEffect(() => {
    setSelectedPassCardIds([]);
  }, [gameState.handNumber, gameState.phase]);

  // 20-second turn countdown timer for each player
  useEffect(() => {
    if (gameState.phase !== 'PLAYER_TURN' || isTrickCollecting) {
      return;
    }

    setTurnSecondsRemaining(20);

    const interval = setInterval(() => {
      setTurnSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // If it's my turn and timer reaches 0, automatically play a legal card
          if (gameState.currentTurnSeatIndex === mySeat && gameState.legalPlayCardIds.length > 0 && !isTrickCollecting) {
            const autoCard = gameState.legalPlayCardIds[0];
            sounds.playCardThrow();
            onPlayCard(autoCard);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [
    gameState.phase,
    gameState.currentTurnSeatIndex,
    gameState.currentTrick.cards.length,
    gameState.currentTrickNumber,
    gameState.handNumber,
    mySeat,
    gameState.legalPlayCardIds,
    onPlayCard,
    isTrickCollecting,
  ]);

  // Relative seat mapping:
  // South (0 offset) -> You
  // West (1 offset) -> Player to your left
  // North (2 offset) -> Player across (Teammate)
  // East (3 offset) -> Player to your right
  const getPlayerAtOffset = (offset: number): Player | undefined => {
    const targetSeat = (mySeat + offset) % 4;
    return gameState.players.find((p) => p.seatIndex === targetSeat);
  };

  const southPlayer = getPlayerAtOffset(0);
  const westPlayer = getPlayerAtOffset(1);
  const northPlayer = getPlayerAtOffset(2);
  const eastPlayer = getPlayerAtOffset(3);

  const recipientPlayer = gameState.players.find(
    (p) => p.seatIndex === gameState.passingState.targetRecipientSeatIndex,
  )!;

  // Team player groups for scoreboard HUD
  const team1Players = gameState.players.filter((p) => p.teamId === 1);
  const team2Players = gameState.players.filter((p) => p.teamId === 2);
  const team1TotalScore = team1Players.reduce((acc, p) => acc + p.score, 0);
  const team2TotalScore = team2Players.reduce((acc, p) => acc + p.score, 0);

  const leadSuitInfo = gameState.currentTrick.leadSuit
    ? SUIT_NAMES[gameState.currentTrick.leadSuit]
    : null;

  // Safe selection containing only cards currently in hand
  const validSelectedPassIds = selectedPassCardIds.filter((id) =>
    gameState.myHand.some((c) => c.id === id),
  );

  // Handle card click in hand
  const handleHandCardClick = (card: CardType) => {
    if (isPassingPhase) {
      if (gameState.passingState.hasSubmitted) return;

      if (validSelectedPassIds.includes(card.id)) {
        setSelectedPassCardIds((prev) => prev.filter((id) => id !== card.id));
      } else {
        if (validSelectedPassIds.length < 5) {
          setSelectedPassCardIds((prev) => [...prev.filter((id) => gameState.myHand.some(c => c.id === id)), card.id]);
        }
      }
    } else if (isMyTurn) {
      if (gameState.legalPlayCardIds.includes(card.id)) {
        sounds.playCardThrow();
        onPlayCard(card.id);
      }
    }
  };

  const handlePassSubmit = () => {
    if (validSelectedPassIds.length === 5) {
      onSubmitPass(validSelectedPassIds);
    }
  };

  const handleAutoPass = () => {
    onAutoPass();
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.setEnabled(next);
  };

  const selectedCardsContainPaan = gameState.myHand
    .filter((c) => validSelectedPassIds.includes(c.id))
    .some((c) => c.isPaan);

  // Passed cards received modal check
  const showPassedModal =
    gameState.lastReceivedPassedCards &&
    gameState.lastReceivedPassedCards.handNumber !== dismissedPassHand;

  const passedFromPlayer = gameState.lastReceivedPassedCards
    ? gameState.players.find((p) => p.seatIndex === gameState.lastReceivedPassedCards?.fromSeatIndex)
    : undefined;

  // Quick message click handler
  const handleQuickMsgClick = (msg: string) => {
    setShowQuickMsgMenu(false);
    sounds.playCardSelect();
    if (onSendQuickMessage) {
      onSendQuickMessage(msg);
    } else {
      triggerToastForSeat(mySeat, msg);
    }
  };

  const triggerToastForSeat = (seatIndex: number, text: string) => {
    setActiveToasts((prev) => ({ ...prev, [seatIndex]: text }));
    setTimeout(() => {
      setActiveToasts((prev) => ({ ...prev, [seatIndex]: null }));
    }, 2000);
  };

  useEffect(() => {
    const socket = getSocket();
    const handleMsg = (payload: { senderSeatIndex: number; senderName: string; text: string }) => {
      triggerToastForSeat(payload.senderSeatIndex, payload.text);
    };

    socket.on('game:quickMessageReceived', handleMsg);
    return () => {
      socket.off('game:quickMessageReceived', handleMsg);
    };
  }, []);

  // Table felt background theme style
  const themeFeltStyles =
    {
      emerald: 'bg-[#064E3B] border-[#043427]',
      midnight: 'bg-[#0F172A] border-[#1E293B]',
      crimson: 'bg-[#4C0519] border-[#2A020D]',
      charcoal: 'bg-[#18181B] border-[#09090B]',
    }[tableTheme] || 'bg-[#064E3B] border-[#043427]';

  return (
    <div className="w-full min-h-screen bg-[#0F172A] flex flex-col justify-between font-sans text-slate-100 select-none overflow-x-hidden">
      {/* Top Header Bar */}
      <header className="h-13 xs:h-14 sm:h-16 bg-[#1E293B] border-b border-slate-700 flex items-center justify-between px-2 xs:px-3 sm:px-8 shrink-0 shadow-lg z-30">
        <div className="flex items-center gap-2 xs:gap-3 sm:gap-4">
          <div className="w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm xs:text-base sm:text-xl shadow-inner text-white">
            BP
          </div>
          <div>
            <h1 className="text-sm xs:text-base sm:text-xl font-bold tracking-tight text-white leading-tight">
              Begi Pakad
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-400">
              {gameState.roomId ? 'Multiplayer' : 'Single Player'}
            </p>
          </div>
        </div>

        {/* Center Match Stats */}
        <div className="flex items-center gap-2.5 xs:gap-4 sm:gap-8 text-sm font-medium">
          {gameState.roomId && (
            <div className="hidden xs:flex flex-col items-center">
              <span className="text-slate-500 uppercase text-[8px] sm:text-[10px] tracking-widest font-semibold">
                Room
              </span>
              <span className="text-indigo-400 font-mono text-[11px] sm:text-xs font-bold">
                {gameState.roomId}
              </span>
            </div>
          )}
          <div className="flex flex-col items-center">
            <span className="text-slate-500 uppercase text-[8px] sm:text-[10px] tracking-widest font-semibold">
              Hand
            </span>
            <span className="text-slate-200 text-[11px] sm:text-xs font-bold">
              {String(gameState.handNumber).padStart(2, '0')}/13
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-slate-500 uppercase text-[8px] sm:text-[10px] tracking-widest font-semibold">
              Ser
            </span>
            <span className="text-emerald-400 text-[11px] sm:text-xs font-bold">
              {String(gameState.currentTrickNumber).padStart(2, '0')}/13
            </span>
          </div>
        </div>

        {/* Right Controls & Live Badge */}
        <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3">
          {/* Quick Message Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowQuickMsgMenu((prev) => !prev)}
              className="p-1.5 xs:p-2 rounded-lg sm:rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition flex items-center gap-1 text-xs font-semibold"
              title="Send Quick Chat"
            >
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span className="hidden md:inline">Taunt</span>
            </button>

            {/* Quick Messages Popup Menu */}
            {showQuickMsgMenu && (
              <div className="absolute right-0 top-11 z-50 w-44 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl space-y-1 animate-in fade-in zoom-in-95">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 border-b border-slate-800">
                  Send Quick Taunt
                </div>
                {quickMessages.map((msg) => (
                  <button
                    key={msg}
                    type="button"
                    onClick={() => handleQuickMsgClick(msg)}
                    className="w-full text-left px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 rounded-xl transition flex items-center justify-between"
                  >
                    <span>{msg}</span>
                    <span className="text-[10px] text-slate-500">💬</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="hidden sm:flex bg-slate-800 px-3 py-1.5 rounded-full border border-slate-600 items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[11px] uppercase tracking-tighter font-bold text-slate-200">
              Live Match
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowScoreDrawer(!showScoreDrawer)}
            className="p-1.5 xs:p-2 rounded-lg sm:rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center gap-1 text-xs font-semibold"
            title="Scoreboard"
          >
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            <span className="hidden md:inline">Scores</span>
          </button>

          <button
            type="button"
            onClick={onOpenRules}
            className="p-1.5 xs:p-2 rounded-lg sm:rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center gap-1 text-xs font-semibold"
            title="How To Play"
          >
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
            <span className="hidden md:inline">Rules</span>
          </button>

          <button
            type="button"
            onClick={toggleSound}
            className="p-1.5 xs:p-2 rounded-lg sm:rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title={soundEnabled ? 'Mute' : 'Unmute'}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (onReplaceWithBot || onExitAndEndGame) {
                setShowExitConfirmModal(true);
              } else {
                onLeaveGame();
              }
            }}
            className="p-1.5 xs:p-2 rounded-lg sm:rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-700 transition"
            title="Exit Game"
          >
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </header>

      {/* Main Table Felt Stage */}
      <main
        className={`flex-1 relative m-1 xs:m-2 sm:m-4 rounded-2xl sm:rounded-3xl border-2 xs:border-4 sm:border-8 ${themeFeltStyles} shadow-2xl flex flex-col justify-between p-1.5 xs:p-2 sm:p-4 overflow-hidden`}
      >
        {/* Floating Desktop Live Scoreboard HUD */}
        <div className="hidden xl:block absolute top-4 left-4 w-56 bg-slate-900/85 rounded-xl p-3.5 border border-slate-700 shadow-xl backdrop-blur-md z-20">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 flex items-center justify-between">
            <span>Live Scoreboard</span>
            <span className="text-amber-400 font-mono">Ser {gameState.currentTrickNumber}/13</span>
          </h3>

          <div className="space-y-2.5">
            {/* Team 1 */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-200 mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                  <span>Team 1 (P1, P3)</span>
                </div>
                <span className="font-mono text-indigo-300">{team1TotalScore}</span>
              </div>
              <div className="pl-3.5 space-y-0.5">
                {team1Players.map((p) => (
                  <div key={p.id} className="flex justify-between text-[11px] text-slate-300">
                    <span className={p.seatIndex === mySeat ? 'font-bold text-white' : ''}>
                      {p.name} {p.seatIndex === mySeat && '(You)'}
                    </span>
                    <span className="font-bold text-amber-300">{p.score}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-700 my-1.5" />

            {/* Team 2 */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-200 mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  <span>Team 2 (P2, P4)</span>
                </div>
                <span className="font-mono text-amber-300">{team2TotalScore}</span>
              </div>
              <div className="pl-3.5 space-y-0.5">
                {team2Players.map((p) => (
                  <div key={p.id} className="flex justify-between text-[11px] text-slate-300">
                    <span>{p.name}</span>
                    <span className="font-bold text-amber-300">{p.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Floating Top-Right Lead Suit & Target Info */}
        <div className="hidden sm:flex flex-col gap-1.5 absolute top-4 right-4 text-right z-20">
          <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider text-slate-300 border border-white/10 flex items-center justify-end gap-1.5">
            <span>Lead Suit:</span>
            {leadSuitInfo ? (
              <span className={`text-xs font-bold ${leadSuitInfo.isRed ? 'text-rose-500' : 'text-white'}`}>
                {leadSuitInfo.symbol} {leadSuitInfo.hi}
              </span>
            ) : (
              <span className="text-slate-400 font-bold">Waiting</span>
            )}
          </div>
          <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider text-slate-300 border border-white/10 flex items-center justify-end gap-1.5">
            <span>Target:</span>
            <span className="text-white text-xs font-black">Avoid 100</span>
          </div>
        </div>

        {/* NORTH SEAT (Player across / Teammate) */}
        <div className="w-full flex justify-center z-20">
          {northPlayer && (
            <PlayerSeat
              player={northPlayer}
              isCurrentTurn={!isTrickCollecting && gameState.currentTurnSeatIndex === northPlayer.seatIndex}
              isSelf={northPlayer.seatIndex === mySeat}
              cardsCount={gameState.opponentCardCounts[northPlayer.seatIndex] ?? 13}
              position="top"
              turnSecondsRemaining={gameState.currentTurnSeatIndex === northPlayer.seatIndex ? turnSecondsRemaining : undefined}
              isTrickWinner={isTrickCollecting && gameState.currentTrick.winnerSeatIndex === northPlayer.seatIndex}
              activeToastMessage={activeToasts[northPlayer.seatIndex]}
            />
          )}
        </div>

        {/* MIDDLE ROW (West Player - Center Trick Arena - East Player) */}
        <div className="w-full flex items-center justify-between gap-2 px-1 sm:px-6 z-10">
          {/* WEST SEAT */}
          <div className="flex flex-col justify-center">
            {westPlayer && (
              <PlayerSeat
                player={westPlayer}
                isCurrentTurn={!isTrickCollecting && gameState.currentTurnSeatIndex === westPlayer.seatIndex}
                isSelf={westPlayer.seatIndex === mySeat}
                cardsCount={gameState.opponentCardCounts[westPlayer.seatIndex] ?? 13}
                position="left"
                turnSecondsRemaining={gameState.currentTurnSeatIndex === westPlayer.seatIndex ? turnSecondsRemaining : undefined}
                isTrickWinner={isTrickCollecting && gameState.currentTrick.winnerSeatIndex === westPlayer.seatIndex}
                activeToastMessage={activeToasts[westPlayer.seatIndex]}
              />
            )}
          </div>

          {/* CENTER TRICK ARENA / PASSING PANEL */}
          <div className="flex-1 flex flex-col items-center justify-center mx-2">
            {isPassingPhase ? (
              <PassingPanel
                selectedCardIds={validSelectedPassIds}
                targetRecipient={recipientPlayer}
                hasSubmitted={gameState.passingState.hasSubmitted}
                timeRemainingSeconds={gameState.passingState.timeRemainingSeconds}
                onPassSubmit={handlePassSubmit}
                onAutoSelect={handleAutoPass}
                canReceivePaan={gameState.passingState.targetRecipientCanReceivePaan}
                selectedCardsContainPaan={selectedCardsContainPaan}
              />
            ) : (
              <TrickArea
                currentTrick={gameState.currentTrick}
                players={gameState.players}
                mySeatIndex={mySeat}
                lastActionMessage={gameState.lastActionMessage}
                handNumber={gameState.handNumber}
                currentTrickNumber={gameState.currentTrickNumber}
              />
            )}
          </div>

          {/* EAST SEAT */}
          <div className="flex flex-col justify-center">
            {eastPlayer && (
              <PlayerSeat
                player={eastPlayer}
                isCurrentTurn={!isTrickCollecting && gameState.currentTurnSeatIndex === eastPlayer.seatIndex}
                isSelf={eastPlayer.seatIndex === mySeat}
                cardsCount={gameState.opponentCardCounts[eastPlayer.seatIndex] ?? 13}
                position="right"
                turnSecondsRemaining={gameState.currentTurnSeatIndex === eastPlayer.seatIndex ? turnSecondsRemaining : undefined}
                isTrickWinner={isTrickCollecting && gameState.currentTrick.winnerSeatIndex === eastPlayer.seatIndex}
                activeToastMessage={activeToasts[eastPlayer.seatIndex]}
              />
            )}
          </div>
        </div>

        {/* SOUTH SEAT (You) + Player Hand */}
        <div className="w-full flex flex-col items-center z-20 gap-1">
          {southPlayer && (
            <PlayerSeat
              player={southPlayer}
              isCurrentTurn={!isTrickCollecting && gameState.currentTurnSeatIndex === southPlayer.seatIndex}
              isSelf={true}
              cardsCount={gameState.myHand.length}
              position="bottom"
              className="mb-1"
              turnSecondsRemaining={gameState.currentTurnSeatIndex === southPlayer.seatIndex ? turnSecondsRemaining : undefined}
              isTrickWinner={isTrickCollecting && gameState.currentTrick.winnerSeatIndex === southPlayer.seatIndex}
              activeToastMessage={activeToasts[southPlayer.seatIndex]}
            />
          )}

          {/* Player Hand */}
          <CardHand
            cards={gameState.myHand}
            selectedCardIds={validSelectedPassIds}
            legalPlayCardIds={gameState.legalPlayCardIds}
            isMyTurn={isMyTurn}
            isPassingPhase={isPassingPhase}
            turnSecondsRemaining={isMyTurn ? turnSecondsRemaining : undefined}
            onCardClick={handleHandCardClick}
          />
        </div>
      </main>

      {/* Footer Bar */}
      <footer className="h-10 sm:h-12 border-t border-slate-800 flex items-center justify-between px-4 sm:px-8 text-[10px] uppercase tracking-widest text-slate-400 shrink-0 bg-[#0F172A]">
        <div>© 2026 Begi Pakad</div>
        <div className="flex gap-4 sm:gap-6 font-semibold">
          <button
            type="button"
            onClick={onOpenRules}
            className="hover:text-slate-200 transition"
          >
            How to Play
          </button>
          <button
            type="button"
            onClick={() => setShowScoreDrawer(true)}
            className="hover:text-slate-200 transition"
          >
            Scoreboard
          </button>
        </div>
      </footer>

      {/* Passed Cards Modal (5 Cards Received with 10s auto-close) */}
      {showPassedModal && gameState.lastReceivedPassedCards && (
        <PassedCardsModal
          isOpen={true}
          cards={gameState.lastReceivedPassedCards.cards}
          fromPlayer={passedFromPlayer}
          onClose={() => setDismissedPassHand(gameState.lastReceivedPassedCards!.handNumber)}
          autoCloseSeconds={10}
        />
      )}

      {/* Full Scoreboard Modal Drawer */}
      {showScoreDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-xl">
            <ScoreBoard
              players={gameState.players}
              currentHand={gameState.handNumber}
              currentTrickNumber={gameState.currentTrickNumber}
            />
            <button
              type="button"
              onClick={() => setShowScoreDrawer(false)}
              className="mt-3 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition"
            >
              Back to Table
            </button>
          </div>
        </div>
      )}

      {/* Exit Game Confirmation Modal */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-[#1E293B] border border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Leave Match?</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Choose how you want to exit the current online match.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {onReplaceWithBot && (
                <button
                  type="button"
                  onClick={() => {
                    setShowExitConfirmModal(false);
                    onReplaceWithBot();
                    onLeaveGame();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex flex-col items-start transition shadow-md"
                >
                  <span>Replace Myself with AI Bot</span>
                  <span className="text-[10px] text-indigo-200 font-normal">Game continues for remaining players</span>
                </button>
              )}

              {onExitAndEndGame && (
                <button
                  type="button"
                  onClick={() => {
                    setShowExitConfirmModal(false);
                    onExitAndEndGame();
                    onLeaveGame();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex flex-col items-start transition shadow-md"
                >
                  <span>Exit & End Game for Everyone</span>
                  <span className="text-[10px] text-rose-200 font-normal">Terminates the match immediately</span>
                </button>
              )}

              {isHost && onHostEndGame && (
                <button
                  type="button"
                  onClick={() => {
                    setShowExitConfirmModal(false);
                    onHostEndGame();
                    onLeaveGame();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex flex-col items-start transition shadow-md"
                >
                  <span>[Host] Close Room & End Game</span>
                  <span className="text-[10px] text-amber-200 font-normal">Disbands room and returns all players to menu</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition mt-2"
              >
                Cancel / Stay in Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
