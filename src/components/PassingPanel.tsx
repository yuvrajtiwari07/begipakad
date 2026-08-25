import React, { useEffect, useState } from 'react';
import { Card as CardType, Player } from '../game/types';
import { getScoreZone } from '../game/scoring';
import { Clock, Send, Sparkles, AlertTriangle } from 'lucide-react';
import { sounds } from '../services/audio';

export interface PassingPanelProps {
  selectedCardIds: string[];
  targetRecipient: Player;
  hasSubmitted: boolean;
  timeRemainingSeconds?: number;
  onPassSubmit: () => void;
  onAutoSelect: () => void;
  canReceivePaan: boolean;
  selectedCardsContainPaan: boolean;
}

export const PassingPanel: React.FC<PassingPanelProps> = ({
  selectedCardIds,
  targetRecipient,
  hasSubmitted,
  timeRemainingSeconds = 120,
  onPassSubmit,
  onAutoSelect,
  canReceivePaan,
  selectedCardsContainPaan,
}) => {
  const [timeLeft, setTimeLeft] = useState(timeRemainingSeconds);

  useEffect(() => {
    setTimeLeft(timeRemainingSeconds);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeRemainingSeconds]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isCountValid = selectedCardIds.length === 5;
  const isPaanRestrictedAndViolated = !canReceivePaan && selectedCardsContainPaan;
  const isSubmitEnabled = isCountValid && !isPaanRestrictedAndViolated && !hasSubmitted;

  return (
    <div className="w-full max-w-xl bg-slate-900/95 border border-slate-700 rounded-xl sm:rounded-2xl p-2.5 xs:p-3.5 sm:p-4 shadow-2xl backdrop-blur-md flex flex-col gap-2.5 sm:gap-3 my-1 sm:my-2">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 sm:pb-2.5">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-base font-bold text-white leading-none">
              Card Passing Phase
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1">
              Passing to: <span className="font-semibold text-indigo-300">{targetRecipient.name}</span> (T{targetRecipient.teamId}, {targetRecipient.score} pts)
            </p>
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-800/90 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-slate-700">
          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-400" />
          <span className={`text-[11px] sm:text-xs font-mono font-bold ${timeLeft < 20 ? 'text-rose-400 animate-pulse' : 'text-slate-200'}`}>
            {formattedTime}
          </span>
        </div>
      </div>

      {/* 90+ Paan Warning Banner */}
      {!canReceivePaan && (
        <div className="flex items-center gap-2 bg-rose-950/60 border border-rose-600/60 text-rose-200 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs">
          <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 shrink-0" />
          <span>
            <strong>90+ Point Rule:</strong> {targetRecipient.name} has {targetRecipient.score} pts. You <strong>cannot</strong> pass Paan (♥) cards!
          </span>
        </div>
      )}

      {/* Selection counter and action buttons */}
      <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-[11px] sm:text-xs font-medium text-slate-300">Selected:</span>
          <span
            className={`text-[11px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 rounded-md ${
              isCountValid
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono'
                : 'bg-slate-800 text-indigo-400 border border-slate-700 font-mono'
            }`}
          >
            {selectedCardIds.length} / 5
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
          {!hasSubmitted && (
            <button
              type="button"
              onClick={onAutoSelect}
              className="text-[10px] sm:text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-medium transition whitespace-nowrap"
            >
              Auto-Select
            </button>
          )}

          <button
            type="button"
            disabled={!isSubmitEnabled}
            onClick={() => {
              sounds.playCardThrow();
              onPassSubmit();
            }}
            className={`text-[11px] sm:text-sm font-bold px-3 sm:px-5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl flex items-center gap-1.5 transition-all shadow-lg whitespace-nowrap
              ${
                hasSubmitted
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : isSubmitEnabled
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 cursor-pointer active:scale-95'
                    : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
              }`}
          >
            <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            {hasSubmitted ? 'Waiting...' : 'PASS CARDS'}
          </button>
        </div>
      </div>
    </div>
  );
};
