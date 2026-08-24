import React, { useEffect, useState } from 'react';
import { Card as CardType, Player } from '../game/types.ts';
import { Card } from './Card.tsx';
import { Sparkles, X, Clock, ArrowDownLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface PassedCardsModalProps {
  isOpen: boolean;
  cards: CardType[];
  fromPlayer?: Player;
  onClose: () => void;
  autoCloseSeconds?: number;
}

export const PassedCardsModal: React.FC<PassedCardsModalProps> = ({
  isOpen,
  cards,
  fromPlayer,
  onClose,
  autoCloseSeconds = 10,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(autoCloseSeconds);

  useEffect(() => {
    if (!isOpen) {
      setSecondsRemaining(autoCloseSeconds);
      return;
    }

    setSecondsRemaining(autoCloseSeconds);
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, autoCloseSeconds, onClose]);

  if (!isOpen || !cards || cards.length === 0) return null;

  const hasBegum = cards.some((c) => c.isBegumHukum);
  const paanCount = cards.filter((c) => c.isPaan).length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md font-sans select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative w-full max-w-lg bg-[#1E293B] border-2 border-indigo-500/40 rounded-3xl shadow-2xl overflow-hidden text-slate-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-[#0F172A]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight flex items-center gap-2">
                  <span>5 Cards Received</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-bold">
                    Pass Complete
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Passed by{' '}
                  <span className="font-bold text-slate-200">
                    {fromPlayer ? `${fromPlayer.name} (T${fromPlayer.teamId})` : 'Opponent'}
                  </span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition border border-transparent hover:border-slate-700"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cards Display Section */}
          <div className="p-3.5 xs:p-5 sm:p-6 space-y-3.5 sm:space-y-5">
            {/* Special highlights banner if Begum or Paan received */}
            {(hasBegum || paanCount > 0) && (
              <div className="p-2.5 sm:p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-amber-200">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
                <div>
                  {hasBegum && (
                    <span className="font-bold text-amber-300 mr-2">
                      ⚠️ Begum Hukum (Q♠, 12 pts) Received!
                    </span>
                  )}
                  {paanCount > 0 && (
                    <span className="text-rose-300 font-semibold">
                      {paanCount} Paan (♥) Card{paanCount > 1 ? 's' : ''} Received
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 5 Cards Row */}
            <div className="flex items-center justify-center gap-1.5 xs:gap-2 sm:gap-3 py-2 px-1 overflow-x-auto touch-scroll no-scrollbar">
              {cards.map((card, idx) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 20, rotate: -5 + idx * 2.5 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  transition={{ delay: idx * 0.08, type: 'spring', stiffness: 260 }}
                  className="shrink-0"
                >
                  <Card card={card} size="md" />
                </motion.div>
              ))}
            </div>

            {/* Auto Close Timer Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-400" />
                  <span>Closing automatically in:</span>
                </div>
                <span className="font-mono font-bold text-indigo-400 text-xs sm:text-sm">
                  {secondsRemaining}s
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${(secondsRemaining / autoCloseSeconds) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="px-6 py-4 border-t border-slate-700 bg-[#0F172A] flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 border border-indigo-400 transition flex items-center justify-center gap-2"
            >
              <span>Got It, Start Playing</span>
              <span className="text-[11px] font-mono opacity-80">({secondsRemaining}s)</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
