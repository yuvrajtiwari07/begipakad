import React from 'react';
import { Loader2, Users, X } from 'lucide-react';

export interface MatchmakingModalProps {
  isOpen: boolean;
  playersCount: number;
  targetCount: number;
  onCancel: () => void;
}

export const MatchmakingModal: React.FC<MatchmakingModalProps> = ({
  isOpen,
  playersCount,
  targetCount,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in font-sans">
      <div className="relative w-full max-w-sm bg-[#1E293B] border border-slate-700 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col items-center text-center gap-5 text-slate-100">
        {/* Pulsing Matchmaking Radar Icon */}
        <div className="relative my-2">
          <div className="w-20 h-20 rounded-full bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center animate-pulse">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-indigo-400/20 animate-ping" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">Finding Players...</h3>
          <p className="text-xs text-slate-400 mt-1">Random matchmaking queue</p>
        </div>

        {/* 1/4 2/4 3/4 4/4 status */}
        <div className="w-full bg-[#0F172A] p-3.5 rounded-2xl border border-slate-700 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Players in Lobby:</span>
          </div>
          <span className="text-base font-bold text-indigo-400 font-mono">
            {playersCount} / {targetCount}
          </span>
        </div>

        {/* Cancel Button */}
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 transition flex items-center justify-center gap-1.5"
        >
          <X className="w-4 h-4" />
          Cancel Queue
        </button>
      </div>
    </div>
  );
};
