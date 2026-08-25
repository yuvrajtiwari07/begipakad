import React from 'react';
import { Player } from '../game/types';
import { getScoreZone } from '../game/scoring';
import { Bot, User, Clock, Crown } from 'lucide-react';

export interface PlayerSeatProps {
  player: Player;
  isCurrentTurn: boolean;
  isSelf: boolean;
  cardsCount: number;
  position: 'top' | 'left' | 'right' | 'bottom';
  className?: string;
  turnSecondsRemaining?: number;
  isTrickWinner?: boolean;
  activeToastMessage?: string | null;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  isCurrentTurn,
  isSelf,
  cardsCount,
  position,
  className = '',
  turnSecondsRemaining,
  isTrickWinner = false,
  activeToastMessage,
}) => {
  const scoreZone = getScoreZone(player.score);
  const isTeam1 = player.teamId === 1;
  const isLowTime = isCurrentTurn && turnSecondsRemaining !== undefined && turnSecondsRemaining <= 5;

  const initials = player.isBot
    ? player.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase()
    : player.name.slice(0, 2).toUpperCase();

  return (
    <div
      id={`player-seat-${player.seatIndex}`}
      className={`relative flex flex-col items-center gap-1 sm:gap-1.5 transition-all duration-300 select-none ${className}`}
    >
      {/* Quick Message Speech Bubble Toast */}
      {activeToastMessage && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 text-xs font-black px-3 py-1 rounded-xl shadow-2xl border-2 border-slate-900 animate-bounce whitespace-nowrap z-50">
          <span>{activeToastMessage}</span>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-6 border-t-amber-400" />
        </div>
      )}

      {/* Avatar Container */}
      <div className="relative">
        <div
          className={`w-10 h-10 xs:w-12 xs:h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-bold text-white shadow-xl transition-all
            ${
              isTrickWinner
                ? 'bg-amber-600 border-2 border-amber-300 ring-2 xs:ring-4 ring-amber-400/70 scale-110 xs:scale-115 animate-bounce shadow-amber-500/50'
                : isCurrentTurn
                ? isLowTime
                  ? 'bg-rose-900 border-2 border-rose-400 ring-2 xs:ring-4 ring-rose-500/50 scale-105 xs:scale-110 animate-pulse'
                  : 'bg-slate-700 border-2 border-indigo-400 ring-2 xs:ring-4 ring-indigo-500/40 scale-105'
                : 'bg-slate-700/90 border-2 border-slate-500/80 hover:border-slate-400'
            }`}
        >
          {player.isBot ? (
            <div className="flex flex-col items-center justify-center">
              <Bot className="w-4 h-4 xs:w-5 xs:h-5 text-slate-200" />
              <span className="text-[8px] xs:text-[9px] font-bold text-slate-300 font-mono tracking-tight leading-none mt-0.5">
                {initials}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <span className="text-xs xs:text-sm font-bold uppercase tracking-wider">{initials}</span>
            </div>
          )}
        </div>

        {/* Ser Winner Crown Badge */}
        {isTrickWinner && (
          <div className="absolute -top-2.5 xs:-top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 p-0.5 xs:p-1 rounded-full shadow-lg border border-amber-200 animate-pulse z-30">
            <Crown className="w-2.5 h-2.5 xs:w-3.5 xs:h-3.5" />
          </div>
        )}

        {/* Turn Countdown Badge */}
        {isCurrentTurn && !isTrickWinner && turnSecondsRemaining !== undefined && (
          <div
            className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-1 xs:px-1.5 py-0.2 rounded-full text-[9px] xs:text-[10px] font-mono font-black flex items-center gap-0.5 shadow-lg border z-20 whitespace-nowrap
              ${
                isLowTime
                  ? 'bg-rose-600 text-white border-rose-300 animate-bounce'
                  : 'bg-indigo-600 text-white border-indigo-300'
              }`}
          >
            <Clock className="w-2 h-2 xs:w-2.5 xs:h-2.5" />
            <span>{turnSecondsRemaining}s</span>
          </div>
        )}

        {/* Connection status dot */}
        <div
          title={player.isConnected ? 'Connected' : 'Disconnected'}
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 xs:w-3.5 xs:h-3.5 rounded-full border-2 border-slate-900 flex items-center justify-center
            ${player.isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}
        />

        {/* Team Tag Badge */}
        <div
          className={`absolute -top-1 -left-1 xs:-top-1.5 xs:-left-1.5 text-[8px] xs:text-[9px] font-black px-1 xs:px-1.5 py-0.2 rounded-full border shadow-sm
            ${
              isTeam1
                ? 'bg-indigo-600 border-indigo-400 text-white'
                : 'bg-amber-600 border-amber-400 text-slate-950'
            }`}
        >
          T{player.teamId}
        </div>
      </div>

      {/* Info Pill */}
      <div className="flex flex-col items-center">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 px-1.5 xs:px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] xs:text-[11px] sm:text-xs font-semibold text-slate-100 flex items-center gap-1 sm:gap-1.5 shadow-md">
          <span className="truncate max-w-[55px] xs:max-w-[75px] sm:max-w-[100px]">
            {player.name} {isSelf && '(You)'}
          </span>
          <span className="text-slate-500">•</span>
          <span className="font-bold text-amber-300">{player.score}</span>
          {cardsCount !== undefined && cardsCount < 13 && (
            <>
              <span className="text-slate-600 hidden xs:inline">•</span>
              <span className="text-[9px] text-slate-400 hidden xs:inline">{cardsCount}c</span>
            </>
          )}
        </div>

        {/* Score Zone Protection Alert Tag */}
        {scoreZone.zone !== 'normal' && (
          <span className={`text-[8px] xs:text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mt-0.5 ${scoreZone.badgeColor}`}>
            {scoreZone.label}
          </span>
        )}
      </div>
    </div>
  );
};
