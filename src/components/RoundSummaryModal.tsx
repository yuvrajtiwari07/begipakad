import React, { useEffect, useState } from 'react';
import { Player, HandScoreResult } from '../game/types.ts';
import { Award, Flame, ShieldAlert, ArrowRight, Trophy } from 'lucide-react';
import { sounds } from '../services/audio.ts';

export interface RoundSummaryModalProps {
  isOpen: boolean;
  handResult: HandScoreResult | null;
  players: Player[];
  onContinue: () => void;
  isHost?: boolean;
  hostName?: string;
}

export const RoundSummaryModal: React.FC<RoundSummaryModalProps> = ({
  isOpen,
  handResult,
  players,
  onContinue,
  isHost = true,
  hostName = 'Host',
}) => {
  const [activeTab, setActiveTab] = useState<'round' | 'total' | 'ser'>('round');

  useEffect(() => {
    if (isOpen) {
      sounds.playCardSelect();
    }
  }, [isOpen]);

  if (!isOpen || !handResult) return null;

  const team1Players = players.filter((p) => p.teamId === 1);
  const team2Players = players.filter((p) => p.teamId === 2);

  const team1TotalScore = team1Players.reduce((acc, p) => acc + (handResult.finalScores[p.seatIndex] ?? p.score), 0);
  const team2TotalScore = team2Players.reduce((acc, p) => acc + (handResult.finalScores[p.seatIndex] ?? p.score), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in zoom-in-95 font-sans select-none">
      <div className="relative w-full max-w-lg bg-[#1E293B] border border-slate-700 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                ROUND {handResult.handNumber} SCORE RECAP
              </h2>
              <p className="text-[11px] text-slate-400">
                13 Ser completed • Hand Score Breakdown
              </p>
            </div>
          </div>

          <div className="bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 text-xs font-mono font-bold px-3 py-1 rounded-full">
            Hand #{handResult.handNumber}
          </div>
        </div>

        {/* 3 Section Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0F172A] rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('round')}
            className={`py-2 rounded-xl transition flex items-center justify-center gap-1 ${
              activeTab === 'round'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Round Pts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('total')}
            className={`py-2 rounded-xl transition flex items-center justify-center gap-1 ${
              activeTab === 'total'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Total Score</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ser')}
            className={`py-2 rounded-xl transition flex items-center justify-center gap-1 ${
              activeTab === 'ser'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Ser / 0-Ser</span>
          </button>
        </div>

        {/* SECTION CONTENT */}
        <div className="space-y-3 min-h-[210px] flex flex-col justify-between">
          {/* TAB 1: ROUND POINTS SECTION */}
          {activeTab === 'round' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="text-xs text-slate-400 font-medium">
                Points taken in Round {handResult.handNumber} (Begum Q♠ + Paan ♥):
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Team 1 */}
                <div className="p-3 bg-[#0F172A] rounded-2xl border border-indigo-500/40 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-400 border-b border-slate-800 pb-1">
                    <span>TEAM 1</span>
                    <span className="font-mono text-indigo-300">
                      +{team1Players.reduce((acc, p) => acc + (handResult.trickPointsGained[p.seatIndex] ?? 0), 0)} pts
                    </span>
                  </div>
                  {team1Players.map((p) => {
                    const gained = handResult.trickPointsGained[p.seatIndex] ?? 0;
                    return (
                      <div key={p.id} className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-medium">{p.name}</span>
                        <span className={`font-mono font-bold ${gained > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          +{gained}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Team 2 */}
                <div className="p-3 bg-[#0F172A] rounded-2xl border border-amber-500/40 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400 border-b border-slate-800 pb-1">
                    <span>TEAM 2</span>
                    <span className="font-mono text-amber-300">
                      +{team2Players.reduce((acc, p) => acc + (handResult.trickPointsGained[p.seatIndex] ?? 0), 0)} pts
                    </span>
                  </div>
                  {team2Players.map((p) => {
                    const gained = handResult.trickPointsGained[p.seatIndex] ?? 0;
                    return (
                      <div key={p.id} className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-medium">{p.name}</span>
                        <span className={`font-mono font-bold ${gained > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          +{gained}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TOTAL MATCH SCORES SECTION */}
          {activeTab === 'total' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="text-xs text-slate-400 font-medium">
                Cumulative Match Scores after Round {handResult.handNumber} (Target: Avoid 100):
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Team 1 */}
                <div className="p-3 bg-[#0F172A] rounded-2xl border border-indigo-500/40 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-400 border-b border-slate-800 pb-1">
                    <span>TEAM 1</span>
                    <span className="font-mono text-indigo-300 font-black">{team1TotalScore} pts</span>
                  </div>
                  {team1Players.map((p) => {
                    const score = handResult.finalScores[p.seatIndex] ?? p.score;
                    return (
                      <div key={p.id} className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-medium">{p.name}</span>
                        <span className="font-mono font-bold text-amber-300">{score}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Team 2 */}
                <div className="p-3 bg-[#0F172A] rounded-2xl border border-amber-500/40 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400 border-b border-slate-800 pb-1">
                    <span>TEAM 2</span>
                    <span className="font-mono text-amber-300 font-black">{team2TotalScore} pts</span>
                  </div>
                  {team2Players.map((p) => {
                    const score = handResult.finalScores[p.seatIndex] ?? p.score;
                    return (
                      <div key={p.id} className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-medium">{p.name}</span>
                        <span className="font-mono font-bold text-amber-300">{score}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SER & 0-SER BONUS SECTION */}
          {activeTab === 'ser' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="text-xs text-slate-400 font-medium">
                Ser Count &amp; Zero-Ser Bonus (-5 pts reward):
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {players.map((p) => {
                  const tricks = handResult.tricksWon[p.seatIndex] ?? 0;
                  const gotZeroBonus = handResult.zeroTrickBonusAwarded[p.seatIndex];

                  return (
                    <div
                      key={p.id}
                      className="p-2.5 bg-[#0F172A] rounded-xl border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-200">{p.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {tricks} Ser won
                        </div>
                      </div>

                      {gotZeroBonus ? (
                        <span className="px-2 py-1 bg-emerald-600/30 text-emerald-300 border border-emerald-400/50 rounded-lg text-[10px] font-black animate-pulse">
                          -5 BONUS
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-slate-400">
                          {tricks} Ser
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Button / Host Wait Banner */}
        <div className="pt-2 border-t border-slate-700/80">
          {isHost ? (
            <button
              type="button"
              onClick={onContinue}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition active:scale-98 cursor-pointer"
            >
              <span>PROCEED TO NEXT ROUND</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-full py-3.5 px-4 rounded-2xl bg-slate-800/90 border border-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-3 shadow-inner">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span>Waiting for host (<strong className="text-white">{hostName}</strong>) to start next round...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
