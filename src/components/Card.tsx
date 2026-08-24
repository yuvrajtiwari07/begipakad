import React from 'react';
import { Card as CardType } from '../game/types.ts';
import { SUIT_NAMES } from '../game/cards.ts';
import { Crown, Heart, Check } from 'lucide-react';

export interface CardProps {
  card?: CardType;
  isBack?: boolean;
  selected?: boolean;
  disabled?: boolean;
  playable?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  rotation?: number;
  className?: string;
  badge?: string;
}

export const Card: React.FC<CardProps> = ({
  card,
  isBack = false,
  selected = false,
  disabled = false,
  playable = false,
  onClick,
  size = 'md',
  rotation = 0,
  className = '',
  badge,
}) => {
  // Explicit responsive dimensions based on size archetype
  const sizeClasses = {
    sm: 'w-[42px] h-[60px] xs:w-[48px] xs:h-[68px] sm:w-[56px] sm:h-[80px] md:w-[64px] md:h-[92px] rounded-md sm:rounded-lg',
    md: 'w-[46px] h-[68px] xs:w-[54px] xs:h-[78px] sm:w-[68px] sm:h-[98px] md:w-[78px] md:h-[112px] rounded-lg sm:rounded-xl',
    lg: 'w-[64px] h-[92px] xs:w-[76px] xs:h-[108px] sm:w-[88px] sm:h-[124px] md:w-[98px] md:h-[140px] rounded-xl sm:rounded-2xl',
  }[size];

  if (isBack || !card) {
    return (
      <div
        id={card ? `card-back-${card.id}` : 'card-back'}
        className={`relative select-none shrink-0 border border-slate-700 bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#1E293B] shadow-xl flex items-center justify-center p-0.5 sm:p-1 cursor-default transition-all duration-200 ${sizeClasses} ${className}`}
        style={{ transform: rotation ? `rotate(${rotation}deg)` : undefined }}
      >
        <div className="w-full h-full border border-indigo-500/30 rounded flex items-center justify-center bg-indigo-950/30">
          <div className="text-indigo-400/80 font-bold text-[9px] xs:text-[10px] sm:text-xs tracking-widest uppercase">
            BP
          </div>
        </div>
      </div>
    );
  }

  const suitInfo = SUIT_NAMES[card.suit];
  const isRed = card.suit === 'PAAN' || card.suit === 'EENT';

  return (
    <button
      id={`card-${card.id}`}
      type="button"
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      aria-label={`${card.rank} of ${suitInfo.en} (${suitInfo.hi})`}
      style={{
        transform: `${selected ? 'translateY(-14px)' : 'translateY(0px)'} ${rotation ? `rotate(${rotation}deg)` : ''}`,
      }}
      className={`relative select-none shrink-0 transition-transform duration-200 text-left font-sans font-semibold flex flex-col justify-between p-1 sm:p-1.5 md:p-2 border
        ${
          selected
            ? 'border-indigo-400 ring-2 sm:ring-4 ring-indigo-500/30 shadow-2xl bg-white -translate-y-3 sm:-translate-y-6 z-30'
            : disabled
              ? 'bg-slate-200/60 border-slate-400 text-slate-500 opacity-60 shadow-none cursor-not-allowed'
              : playable
                ? 'border-slate-300 bg-white hover:border-indigo-400 hover:-translate-y-2 sm:hover:-translate-y-3 shadow-lg hover:shadow-xl cursor-pointer z-10'
                : 'border-slate-300 bg-white shadow-md cursor-pointer'
        }
        ${card.isBegumHukum ? 'ring-1 ring-amber-400/70' : ''}
        ${sizeClasses} ${className}`}
    >
      {/* Selected checkmark indicator */}
      {selected && (
        <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-4 h-4 sm:w-5 sm:h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[9px] sm:text-[11px] font-bold border-2 border-white shadow-md z-40">
          <Check className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 stroke-[3]" />
        </div>
      )}

      {/* Begum Hukum or Paan Badge */}
      {!selected && card.isBegumHukum && (
        <div
          title="Begum Hukum (Q♠) - 12 Points"
          className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 rounded-full p-0.5 shadow-md flex items-center justify-center z-20"
        >
          <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-950 fill-amber-300" />
        </div>
      )}

      {!selected && card.isPaan && (
        <div
          title="Paan (♥) - 1 Point"
          className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 bg-rose-600 text-white rounded-full p-0.5 shadow-sm flex items-center justify-center z-20"
        >
          <Heart className="w-2 h-2 sm:w-2.5 sm:h-2.5 fill-white text-rose-600" />
        </div>
      )}

      {/* Top Left Rank & Symbol */}
      <div className="flex flex-col items-start leading-none">
        <span
          className={`font-black tracking-tight text-[10px] xs:text-xs sm:text-sm leading-none ${
            disabled ? 'text-slate-500' : isRed ? 'text-rose-600' : 'text-slate-950'
          }`}
        >
          {card.rank}
        </span>
        <span
          className={`text-[10px] xs:text-xs sm:text-sm md:text-base leading-none mt-0.5 ${
            disabled ? 'text-slate-500' : isRed ? 'text-rose-600' : 'text-slate-950'
          }`}
        >
          {suitInfo.symbol}
        </span>
      </div>

      {/* Center Big Icon */}
      <div className="self-center flex flex-col items-center justify-center my-auto leading-none">
        <span
          className={`text-sm xs:text-base sm:text-xl md:text-2xl leading-none select-none ${
            disabled ? 'text-slate-400' : isRed ? 'text-rose-600' : 'text-slate-950'
          }`}
        >
          {suitInfo.symbol}
        </span>
        <span className="text-[6px] xs:text-[7px] sm:text-[8px] md:text-[9px] font-bold tracking-tighter text-slate-400 mt-0.5 leading-none">
          {suitInfo.hi}
        </span>
      </div>

      {/* Bottom Right Inverted */}
      <div className="flex flex-col items-end leading-none self-end rotate-180">
        <span
          className={`font-black tracking-tight text-[10px] xs:text-xs sm:text-sm leading-none ${
            disabled ? 'text-slate-500' : isRed ? 'text-rose-600' : 'text-slate-950'
          }`}
        >
          {card.rank}
        </span>
        <span
          className={`text-[10px] xs:text-xs sm:text-sm md:text-base leading-none mt-0.5 ${
            disabled ? 'text-slate-500' : isRed ? 'text-rose-600' : 'text-slate-950'
          }`}
        >
          {suitInfo.symbol}
        </span>
      </div>

      {/* Custom label badge */}
      {badge && (
        <div className="absolute bottom-1 left-0.5 right-0.5 bg-slate-900/90 text-white text-[8px] sm:text-[9px] text-center rounded py-0.5 font-medium leading-none truncate">
          {badge}
        </div>
      )}
    </button>
  );
};
