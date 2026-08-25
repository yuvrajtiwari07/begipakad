import React from 'react';
import { Card as CardType } from '../game/types';
import { Card } from './Card';
import { sounds } from '../services/audio';
import { haptics } from '../services/haptics';
import { Clock } from 'lucide-react';

export interface CardHandProps {
  cards: CardType[];
  selectedCardIds: string[];
  legalPlayCardIds?: string[];
  isMyTurn?: boolean;
  isPassingPhase?: boolean;
  turnSecondsRemaining?: number;
  onCardClick: (card: CardType) => void;
  maxSelectable?: number;
}

export const CardHand: React.FC<CardHandProps> = ({
  cards,
  selectedCardIds,
  legalPlayCardIds = [],
  isMyTurn = false,
  isPassingPhase = false,
  turnSecondsRemaining,
  onCardClick,
}) => {
  const selectedSet = new Set(selectedCardIds);
  const legalSet = new Set(legalPlayCardIds);

  const handleClick = (card: CardType) => {
    sounds.playCardSelect();
    haptics.triggerLight();
    onCardClick(card);
  };

  const isLowTime = turnSecondsRemaining !== undefined && turnSecondsRemaining <= 5;

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* Hand status & Turn Banner */}
      <div className="mb-1.5 xs:mb-2 flex items-center justify-center gap-2">
        {isPassingPhase ? (
          <div className="bg-indigo-600/95 text-white px-3.5 xs:px-5 py-1 xs:py-1.5 rounded-full font-bold shadow-lg border border-indigo-400 text-[11px] xs:text-xs tracking-wide uppercase flex items-center gap-1.5 xs:gap-2">
            <span>Select 5 Cards to Pass</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full font-mono text-[10px] xs:text-[11px]">
              {selectedCardIds.length} / 5
            </span>
          </div>
        ) : isMyTurn ? (
          <div
            className={`px-4 xs:px-6 py-1 xs:py-1.5 sm:py-2 rounded-full font-bold shadow-xl border text-[11px] xs:text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2 transition-all
              ${
                isLowTime
                  ? 'bg-rose-600 border-rose-400 text-white animate-pulse shadow-rose-600/40 ring-4 ring-rose-500/30'
                  : 'bg-indigo-600 border-indigo-400 text-white shadow-indigo-600/40 animate-bounce'
              }`}
          >
            <span>YOUR TURN</span>
            {turnSecondsRemaining !== undefined && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] xs:text-xs font-mono font-bold flex items-center gap-1 ${
                  isLowTime ? 'bg-rose-950 text-rose-200' : 'bg-indigo-900/80 text-indigo-200'
                }`}
              >
                <Clock className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
                {turnSecondsRemaining}s
              </span>
            )}
          </div>
        ) : (
          <div className="bg-slate-900/80 text-slate-300 px-3 xs:px-4 py-0.5 xs:py-1 rounded-full border border-slate-700 text-[10px] xs:text-xs font-semibold">
            Your Hand ({cards.length} cards)
          </div>
        )}
      </div>

      {/* Cards container with responsive touch scrolling & clear bounds */}
      <div className="w-full max-w-full sm:max-w-4xl md:max-w-5xl overflow-x-auto overflow-y-visible touch-scroll no-scrollbar pt-8 xs:pt-10 sm:pt-12 pb-2 xs:pb-3 px-2 xs:px-4 sm:px-8 flex justify-start sm:justify-center">
        <div className="min-w-fit mx-auto flex items-end -space-x-3.5 xs:-space-x-4 sm:-space-x-5 md:-space-x-6 px-4 xs:px-6 sm:px-10">
          {cards.map((card, index) => {
            const isSelected = selectedSet.has(card.id);
            const isPlayable = isMyTurn && !isPassingPhase && legalSet.has(card.id);
            const isTurnDisabled = isMyTurn && !isPassingPhase && !legalSet.has(card.id);

            return (
              <div
                key={card.id}
                className={`transition-all duration-150 shrink-0 ${
                  index === 0 ? 'ml-1 xs:ml-2' : ''
                } ${index === cards.length - 1 ? 'mr-1 xs:mr-2' : ''} hover:z-40 focus-within:z-40 animate-in fade-in slide-in-from-bottom-6`}
                style={{
                  zIndex: index + 1,
                  animationDelay: `${index * 35}ms`,
                  animationFillMode: 'both',
                }}
              >
                <Card
                  card={card}
                  selected={isSelected}
                  playable={isPlayable}
                  disabled={isTurnDisabled}
                  size="md"
                  onClick={() => handleClick(card)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
