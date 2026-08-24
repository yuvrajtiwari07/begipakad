import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Skull, RotateCcw, Home, Award } from 'lucide-react';
import { Player, TeamId } from '../game/types.ts';
import { sounds } from '../services/audio.ts';

export interface GameOverModalProps {
  isOpen: boolean;
  winnerTeam: TeamId | null;
  losingTeam: TeamId | null;
  players: Player[];
  myTeamId: TeamId;
  onPlayAgain: () => void;
  onExitToMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  winnerTeam,
  losingTeam,
  players,
  myTeamId,
  onPlayAgain,
  onExitToMenu,
}) => {
  const isWinner = winnerTeam === myTeamId;

  useEffect(() => {
    if (isOpen) {
      if (isWinner) {
        sounds.playWinFanfare();
        try {
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore
        }
      } else {
        sounds.playDangerWarning();
      }
    }
  }, [isOpen, isWinner]);

  if (!isOpen) return null;

  const team1Players = players.filter((p) => p.teamId === 1);
  const team2Players = players.filter((p) => p.teamId === 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in zoom-in-95 font-sans">
      <div className="relative w-full max-w-md bg-[#1E293B] border border-slate-700 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col items-center text-center gap-5 text-slate-100">
        {/* Banner icon */}
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl ${
            isWinner
              ? 'bg-indigo-600 text-white ring-4 ring-indigo-400/40'
              : 'bg-rose-700 text-white ring-4 ring-rose-600/40'
          }`}
        >
          {isWinner ? (
            <Trophy className="w-10 h-10 fill-current" />
          ) : (
            <Skull className="w-10 h-10" />
          )}
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {isWinner ? 'MATCH VICTORY' : 'MATCH DEFEAT'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            {isWinner
              ? `Your Team (Team ${myTeamId}) won the match!`
              : `Team ${losingTeam} reached 100+ points and lost.`}
          </p>
        </div>

        {/* Final Scores Breakdown */}
        <div className="w-full space-y-3">
          <div className="grid grid-cols-2 gap-2 text-left">
            {/* Team 1 */}
            <div
              className={`p-3.5 rounded-2xl border ${
                winnerTeam === 1
                  ? 'bg-[#0F172A] border-indigo-500/80 ring-1 ring-indigo-500/30'
                  : 'bg-[#0F172A] border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-indigo-400 mb-1.5">
                <span>TEAM 1</span>
                {winnerTeam === 1 && <span className="text-[10px] text-amber-400 font-bold">WINNER</span>}
              </div>
              {team1Players.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-slate-300 truncate max-w-[80px]">{p.name}</span>
                  <span className="font-bold text-amber-300 font-mono">{p.score} pts</span>
                </div>
              ))}
            </div>

            {/* Team 2 */}
            <div
              className={`p-3.5 rounded-2xl border ${
                winnerTeam === 2
                  ? 'bg-[#0F172A] border-amber-500/80 ring-1 ring-amber-500/30'
                  : 'bg-[#0F172A] border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-amber-400 mb-1.5">
                <span>TEAM 2</span>
                {winnerTeam === 2 && <span className="text-[10px] text-amber-400 font-bold">WINNER</span>}
              </div>
              {team2Players.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-slate-300 truncate max-w-[80px]">{p.name}</span>
                  <span className="font-bold text-amber-300 font-mono">{p.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row gap-2.5 pt-2">
          <button
            type="button"
            onClick={onPlayAgain}
            className="flex-1 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            PLAY AGAIN
          </button>
          <button
            type="button"
            onClick={onExitToMenu}
            className="py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition"
          >
            <Home className="w-4 h-4" />
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
