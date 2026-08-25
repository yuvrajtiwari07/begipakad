import React, { useEffect, useState } from 'react';
import { SUIT_NAMES } from '../game/cards';
import { Player, Trick } from '../game/types';
import { Card } from './Card';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, Sparkles } from 'lucide-react';

export interface TrickAreaProps {
  currentTrick: Trick;
  players: Player[];
  mySeatIndex: number;
  lastActionMessage?: string;
  handNumber: number;
  currentTrickNumber: number;
}

export const TrickArea: React.FC<TrickAreaProps> = ({
  currentTrick,
  players,
  mySeatIndex,
  lastActionMessage,
  handNumber,
  currentTrickNumber,
}) => {
  const [isSweepingToWinner, setIsSweepingToWinner] = useState(false);

  const isTrickComplete = currentTrick.cards.length === 4 && currentTrick.winnerSeatIndex !== undefined;
  const winnerPlayer = isTrickComplete ? players.find((p) => p.seatIndex === currentTrick.winnerSeatIndex) : undefined;
  const leadSuitInfo = currentTrick.leadSuit ? SUIT_NAMES[currentTrick.leadSuit] : null;

  // When 4 cards are placed, wait ~800ms, then initiate smooth sweep animation towards winner seat
  useEffect(() => {
    if (isTrickComplete) {
      const sweepTimer = setTimeout(() => {
        setIsSweepingToWinner(true);
      }, 800);
      return () => clearTimeout(sweepTimer);
    } else {
      setIsSweepingToWinner(false);
    }
  }, [isTrickComplete, currentTrick.trickNumber]);

  // Helper to map seatIndex to relative table position:
  // 0 -> South (bottom), 1 -> West (left), 2 -> North (top), 3 -> East (right) relative to mySeatIndex
  const getRelativePosition = (seatIndex: number) => {
    const diff = (seatIndex - mySeatIndex + 4) % 4;
    switch (diff) {
      case 0:
        return 'bottom';
      case 1:
        return 'left';
      case 2:
        return 'top';
      case 3:
        return 'right';
      default:
        return 'bottom';
    }
  };

  const getPositionStyles = (relPos: string) => {
    switch (relPos) {
      case 'bottom':
        return 'bottom-1.5 xs:bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-30 scale-105';
      case 'top':
        return 'top-1.5 xs:top-2 sm:top-3 left-1/2 -translate-x-1/2 z-10';
      case 'left':
        return 'left-1.5 xs:left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20';
      case 'right':
        return 'right-1.5 xs:right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20';
      default:
        return '';
    }
  };

  const getCardRotation = (relPos: string) => {
    switch (relPos) {
      case 'bottom':
        return 0;
      case 'top':
        return -4;
      case 'left':
        return 7;
      case 'right':
        return -7;
      default:
        return 0;
    }
  };

  const getThrowInitialAnimation = (relPos: string) => {
    switch (relPos) {
      case 'bottom':
        return { y: 100, scale: 0.5, opacity: 0, rotate: 15 };
      case 'top':
        return { y: -100, scale: 0.5, opacity: 0, rotate: -15 };
      case 'left':
        return { x: -100, scale: 0.5, opacity: 0, rotate: 25 };
      case 'right':
        return { x: 100, scale: 0.5, opacity: 0, rotate: -25 };
      default:
        return { y: 80, scale: 0.5, opacity: 0 };
    }
  };

  const getWinnerExitCoords = (relPos: string) => {
    switch (relPos) {
      case 'bottom':
        return { x: 0, y: 120, scale: 0.15, opacity: 0 };
      case 'top':
        return { x: 0, y: -120, scale: 0.15, opacity: 0 };
      case 'left':
        return { x: -160, y: 0, scale: 0.15, opacity: 0 };
      case 'right':
        return { x: 160, y: 0, scale: 0.15, opacity: 0 };
      default:
        return { x: 0, y: 0, scale: 0.15, opacity: 0 };
    }
  };

  const winnerRelPos = currentTrick.winnerSeatIndex !== undefined ? getRelativePosition(currentTrick.winnerSeatIndex) : 'bottom';
  const winnerExitCoords = getWinnerExitCoords(winnerRelPos);

  return (
    <div className="relative w-full max-w-lg h-48 xs:h-56 sm:h-64 flex flex-col items-center justify-center select-none">
      {/* Central circular guide ring */}
      <div className="w-[220px] xs:w-[270px] sm:w-[360px] md:w-[420px] h-[160px] xs:h-[185px] sm:h-[230px] md:h-[260px] border border-white/10 rounded-full flex items-center justify-center relative backdrop-blur-[2px]">
        {/* Center Table Cloth Logo & Lead Suit Indicator */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {leadSuitInfo ? (
            <div className="flex flex-col items-center bg-slate-950/80 px-2.5 xs:px-3.5 py-1 xs:py-1.5 rounded-xl border border-slate-700 shadow-xl backdrop-blur-md">
              <span className="text-[8px] xs:text-[9px] uppercase font-bold tracking-widest text-slate-400">
                Lead Suit
              </span>
              <div className="flex items-center gap-1 xs:gap-1.5 mt-0.5">
                <span
                  className={`text-base xs:text-xl leading-none font-bold ${
                    currentTrick.leadSuit === 'PAAN' || currentTrick.leadSuit === 'EENT'
                      ? 'text-rose-500'
                      : 'text-slate-100'
                  }`}
                >
                  {leadSuitInfo.symbol}
                </span>
                <span className="text-[10px] xs:text-xs font-bold text-slate-200">
                  {leadSuitInfo.hi} ({leadSuitInfo.en})
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center opacity-25">
              <div className="text-white font-sans font-black text-base xs:text-lg sm:text-2xl tracking-widest">
                BEGI PAKAD
              </div>
              <div className="text-[9px] xs:text-[10px] text-slate-300 font-semibold tracking-widest uppercase mt-0.5">
                Ser {currentTrickNumber} / 13
              </div>
            </div>
          )}
        </div>

        {/* Ser Winner Highlight Banner Overlay */}
        <AnimatePresence>
          {isTrickComplete && winnerPlayer && !isSweepingToWinner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="absolute z-40 top-2 xs:top-3 flex items-center gap-1 xs:gap-1.5 px-2.5 xs:px-3 py-0.5 xs:py-1 bg-amber-500/90 text-slate-950 rounded-full font-bold text-[10px] xs:text-xs shadow-2xl border border-amber-300 backdrop-blur-sm animate-pulse whitespace-nowrap"
            >
              <Crown className="w-3 h-3 xs:w-3.5 xs:h-3.5" />
              <span>
                {winnerPlayer.name} wins Ser!
                {currentTrick.pointsAwarded && currentTrick.pointsAwarded.totalPoints > 0 && (
                  <span className="ml-1 opacity-90 font-mono">
                    (+{currentTrick.pointsAwarded.totalPoints} pts)
                  </span>
                )}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Played Cards with realistic throw & sweep flight motion */}
        <div className="relative w-full h-full">
          <AnimatePresence>
            {currentTrick.cards.map((played) => {
              const relPos = getRelativePosition(played.seatIndex);
              const posStyle = getPositionStyles(relPos);
              const rotation = getCardRotation(relPos);
              const initialAnim = getThrowInitialAnimation(relPos);
              const playerObj = players.find((p) => p.seatIndex === played.seatIndex);

              return (
                <motion.div
                  key={`trick_${currentTrick.trickNumber}_${played.seatIndex}_${played.card.id}`}
                  initial={initialAnim}
                  animate={
                    isSweepingToWinner
                      ? {
                          x: winnerExitCoords.x,
                          y: winnerExitCoords.y,
                          scale: winnerExitCoords.scale,
                          opacity: winnerExitCoords.opacity,
                          rotate: rotation,
                        }
                      : {
                          x: 0,
                          y: 0,
                          scale: 1,
                          opacity: 1,
                          rotate: rotation,
                        }
                  }
                  transition={
                    isSweepingToWinner
                      ? {
                          duration: 0.45,
                          ease: [0.32, 0, 0.67, 0],
                        }
                      : {
                          type: 'spring',
                          stiffness: 340,
                          damping: 24,
                          mass: 0.8,
                        }
                  }
                  className={`absolute ${posStyle} flex flex-col items-center drop-shadow-2xl`}
                >
                  <Card card={played.card} rotation={rotation} size="sm" />
                  <span className="text-[9px] font-bold text-slate-200 mt-1 bg-slate-900/90 border border-slate-700/80 px-2 py-0.5 rounded-full shadow-md">
                    {playerObj?.name || `P${played.seatIndex + 1}`}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Action commentary ticker */}
      {lastActionMessage && (
        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 max-w-[90%] bg-slate-900/95 text-slate-200 text-[11px] font-semibold px-4 py-1 rounded-full border border-slate-700 shadow-xl truncate text-center z-30">
          {lastActionMessage}
        </div>
      )}
    </div>
  );
};
