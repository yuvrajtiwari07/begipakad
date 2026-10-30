import React from 'react';
import { HandScoreResult, Player, TeamId } from '../game/types';

export interface ScoreTableProps {
  players: Player[];
  handHistory: HandScoreResult[];
  currentHand?: number; // shows a live row for this round while it's being played
  mySeatIndex?: number;
  winnerTeam?: TeamId | null;
}

// Points added to a player's score in a round, including the Zero-Ser -5
export function getRoundDelta(hand: HandScoreResult, seatIndex: number): number {
  return (hand.finalScores[seatIndex] ?? 0) - (hand.startScores[seatIndex] ?? 0);
}

export function formatDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

// Taking points is bad in Begi Pakad: red for gains, green for the Zero-Ser bonus
const deltaColor = (delta: number) =>
  delta > 0 ? 'text-rose-400' : delta < 0 ? 'text-emerald-400' : 'text-slate-500';

const totalColor = (score: number) =>
  score >= 90 ? 'text-rose-400' : score >= 75 ? 'text-amber-400' : 'text-slate-100';

export const ScoreTable: React.FC<ScoreTableProps> = ({
  players,
  handHistory,
  currentHand,
  mySeatIndex,
  winnerTeam,
}) => {
  const team1 = players.filter((p) => p.teamId === 1).sort((a, b) => a.seatIndex - b.seatIndex);
  const team2 = players.filter((p) => p.teamId === 2).sort((a, b) => a.seatIndex - b.seatIndex);
  const columns = [...team1, ...team2];

  const lastHand = handHistory[handHistory.length - 1];
  const showLiveRow = currentHand !== undefined && !handHistory.some((h) => h.handNumber === currentHand);
  // Live round: score so far minus where the round started (last recorded total)
  const liveDelta = (p: Player) => p.score - (lastHand?.finalScores[p.seatIndex] ?? 0);
  const hasPartialRound = handHistory.some((h) => h.isPartial);

  const teamTotal = (team: Player[]) => team.reduce((acc, p) => acc + p.score, 0);

  const cell = 'px-1.5 py-1.5 text-center font-mono font-bold tabular-nums';

  return (
    <div className="w-full flex flex-col gap-1.5">
      <div className="w-full max-h-[45vh] overflow-auto rounded-xl border border-slate-700 bg-[#0F172A]">
        <table className="w-full text-[11px] sm:text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-[#0F172A]">
            <tr className="text-[10px] uppercase tracking-wider">
              <th rowSpan={2} className="px-2 py-1.5 text-left text-slate-400 font-semibold border-b border-slate-700 align-bottom">
                Round
              </th>
              <th colSpan={team1.length} className="px-1.5 pt-1.5 text-indigo-400 font-bold">
                Team 1{winnerTeam === 1 && <span className="ml-1 text-amber-400">• Winner</span>}
              </th>
              <th colSpan={team2.length} className="px-1.5 pt-1.5 text-amber-400 font-bold border-l border-slate-800">
                Team 2{winnerTeam === 2 && <span className="ml-1 text-amber-300">• Winner</span>}
              </th>
            </tr>
            <tr>
              {columns.map((p, i) => (
                <th
                  key={p.id}
                  title={p.name}
                  className={`px-1.5 pb-1.5 pt-0.5 font-semibold border-b border-slate-700 ${
                    p.seatIndex === mySeatIndex ? 'text-white' : 'text-slate-300'
                  } ${i === team1.length ? 'border-l border-slate-800' : ''}`}
                >
                  <span className="block max-w-[72px] mx-auto truncate">
                    {p.seatIndex === mySeatIndex ? 'You' : p.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {handHistory.map((hand) => (
              <tr key={hand.handNumber} className="border-b border-slate-800/80">
                <td className="px-2 py-1.5 text-slate-400 font-semibold whitespace-nowrap">
                  R{hand.handNumber}
                  {hand.isPartial && <span className="text-slate-500">*</span>}
                </td>
                {columns.map((p, i) => {
                  const delta = getRoundDelta(hand, p.seatIndex);
                  const zeroSer = hand.zeroTrickBonusAwarded[p.seatIndex];
                  return (
                    <td
                      key={p.id}
                      title={zeroSer ? 'Zero Ser bonus (-5)' : undefined}
                      className={`${cell} ${deltaColor(delta)} ${i === team1.length ? 'border-l border-slate-800' : ''}`}
                    >
                      {formatDelta(delta)}
                      {zeroSer && <span className="ml-0.5 text-[9px] font-sans font-semibold text-emerald-500/80">0S</span>}
                    </td>
                  );
                })}
              </tr>
            ))}

            {showLiveRow && (
              <tr className="border-b border-slate-800/80 bg-slate-800/30">
                <td className="px-2 py-1.5 text-slate-400 font-semibold whitespace-nowrap">
                  R{currentHand} <span className="text-[9px] uppercase text-emerald-400">live</span>
                </td>
                {columns.map((p, i) => {
                  const delta = liveDelta(p);
                  return (
                    <td
                      key={p.id}
                      className={`${cell} ${deltaColor(delta)} ${i === team1.length ? 'border-l border-slate-800' : ''}`}
                    >
                      {formatDelta(delta)}
                    </td>
                  );
                })}
              </tr>
            )}

            {handHistory.length === 0 && !showLiveRow && (
              <tr>
                <td colSpan={columns.length + 1} className="px-2 py-4 text-center text-slate-500">
                  No rounds played yet
                </td>
              </tr>
            )}
          </tbody>

          <tfoot className="sticky bottom-0 bg-[#1E293B]">
            <tr className="border-t-2 border-slate-600">
              <td className="px-2 py-1.5 text-slate-200 font-black uppercase text-[10px] tracking-wider">Total</td>
              {columns.map((p, i) => (
                <td
                  key={p.id}
                  className={`${cell} text-sm ${totalColor(p.score)} ${i === team1.length ? 'border-l border-slate-700' : ''}`}
                >
                  {p.score}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-2 pb-1.5 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">Team</td>
              <td colSpan={team1.length} className="px-1.5 pb-1.5 text-center font-mono font-bold text-indigo-300">
                {teamTotal(team1)}
              </td>
              <td colSpan={team2.length} className="px-1.5 pb-1.5 text-center font-mono font-bold text-amber-300 border-l border-slate-700">
                {teamTotal(team2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap justify-between gap-x-3 text-[10px] text-slate-500">
        <span>
          <span className="text-emerald-500/80 font-semibold">0S</span> = Zero Ser bonus (-5)
        </span>
        {hasPartialRound && <span>* Game ended mid-round</span>}
      </div>
    </div>
  );
};
