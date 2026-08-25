import React from 'react';
import { Player } from '../game/types';
import { getScoreZone } from '../game/scoring';
import { Award } from 'lucide-react';

export interface ScoreBoardProps {
  players: Player[];
  currentHand: number;
  currentTrickNumber: number;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  players,
  currentHand,
  currentTrickNumber,
}) => {
  const team1Players = players.filter((p) => p.teamId === 1);
  const team2Players = players.filter((p) => p.teamId === 2);

  const team1Score = team1Players.reduce((acc, p) => acc + p.score, 0);
  const team2Score = team2Players.reduce((acc, p) => acc + p.score, 0);

  const renderPlayerRow = (player: Player) => {
    const zone = getScoreZone(player.score);
    const progressPercent = Math.min(100, (player.score / 100) * 100);

    return (
      <div
        key={player.id}
        className="flex flex-col bg-[#0F172A] p-2.5 rounded-xl border border-slate-700 gap-1.5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs sm:text-sm font-bold text-slate-100 truncate max-w-[110px]">
              {player.name}
            </span>
            {player.tricksWonThisHand === 0 && (
              <span
                title="Zero Ser in current hand (-5 pts bonus if maintained!)"
                className="text-[9px] bg-indigo-950 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-700/50 font-semibold"
              >
                0 Ser
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <span className="text-sm sm:text-base font-black text-amber-300 font-mono">
              {player.score}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">/ 100</span>
          </div>
        </div>

        {/* Progress Bar towards 100 */}
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              player.score >= 90
                ? 'bg-rose-500'
                : player.score >= 75
                  ? 'bg-amber-400'
                  : 'bg-emerald-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Score Zone Badge */}
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-400">
            Ser won: <strong className="text-slate-200">{player.tricksWonThisHand}</strong>
          </span>
          <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] ${zone.badgeColor}`}>
            {zone.label}
          </span>
        </div>
      </div>
    );
  };

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
          Hand <strong className="text-slate-200">#{currentHand}</strong> • Ser{' '}
          <strong className="text-emerald-400">{currentTrickNumber}/13</strong>
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* TEAM 1 */}
        <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-indigo-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              TEAM 1 (P1 + P3)
            </span>
            <span className="text-xs font-mono font-bold text-indigo-300">{team1Score} pts</span>
          </div>
          {team1Players.map(renderPlayerRow)}
        </div>

        {/* TEAM 2 */}
        <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              TEAM 2 (P2 + P4)
            </span>
            <span className="text-xs font-mono font-bold text-amber-300">{team2Score} pts</span>
          </div>
          {team2Players.map(renderPlayerRow)}
        </div>
      </div>

      {/* Score Zone Rules Quick Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[10px] text-slate-400 border-t border-slate-700/80">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>&lt;75: Q♠ +12, ♥ +1</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>75–89: Q♠ +0 (Safe)</span>
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
