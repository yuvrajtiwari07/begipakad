import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Skull, RotateCcw, Home, Award } from 'lucide-react';
import { HandScoreResult, Player, TeamId } from '../game/types';
import { sounds } from '../services/audio';
import { ScoreTable } from './ScoreTable';

export interface GameOverModalProps {
  isOpen: boolean;
  winnerTeam: TeamId | null;
  losingTeam: TeamId | null;
  players: Player[];
  handHistory: HandScoreResult[];
  myTeamId: TeamId;
  onPlayAgain?: () => void; // offline only; online games go back to the menu
  onExitToMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  winnerTeam,
  losingTeam,
  players,
  handHistory,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in zoom-in-95 font-sans">
      <div className="relative w-full max-w-md max-h-full overflow-y-auto no-scrollbar bg-[#1E293B] border border-slate-700 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col items-center text-center gap-5 text-slate-100">
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

        {/* Final Scores: round by round, totalled at the bottom */}
        <ScoreTable players={players} handHistory={handHistory} winnerTeam={winnerTeam} />

        {/* Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row gap-2.5 pt-2">
          {onPlayAgain && (
            <button
              type="button"
              onClick={onPlayAgain}
              className="flex-1 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              PLAY AGAIN
            </button>
          )}
          <button
            type="button"
            onClick={onExitToMenu}
            className="flex-1 py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition"
          >
            <Home className="w-4 h-4" />
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
