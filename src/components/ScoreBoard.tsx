import React from 'react';
import { HandScoreResult, Player } from '../game/types';
import { Award } from 'lucide-react';
import { ScoreTable } from './ScoreTable';

export interface ScoreBoardProps {
  players: Player[];
  handHistory: HandScoreResult[];
  currentHand: number;
  currentTrickNumber: number;
  mySeatIndex?: number;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  players,
  handHistory,
  currentHand,
  currentTrickNumber,
  mySeatIndex,
}) => {
  return (
    <div className="w-full max-w-xl bg-[#1E293B] border border-slate-700 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col gap-4 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Scoreboard</h3>
            <p className="text-[10px] text-slate-400">Target: Avoid reaching 100 points</p>
          </div>
        </div>
        <div className="text-xs text-slate-400 text-right">
          Round <strong className="text-slate-200">#{currentHand}</strong> • Ser{' '}
          <strong className="text-emerald-400">{currentTrickNumber}/13</strong>
        </div>
      </div>

      {/* Round-wise scores, totalled at the bottom */}
      <ScoreTable
        players={players}
        handHistory={handHistory}
        currentHand={currentHand}
        mySeatIndex={mySeatIndex}
      />

      {/* Score Zone Rules Quick Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[10px] text-slate-400 border-t border-slate-700/80">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Round start &lt;75: Q♠ +12</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Round start 75+: Q♠ +0</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>90–99: No Paan Pass</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-600" />
          <span>100+: Team Loses</span>
        </div>
      </div>
    </div>
  );
};
