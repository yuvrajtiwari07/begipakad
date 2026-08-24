import React, { useState } from 'react';
import { X, BookOpen, Crown, Heart, Zap, Users } from 'lucide-react';

export interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'basics' | 'scoring' | 'passing' | 'tricks' | 'rules'>('basics');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in font-sans">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-[#0F172A]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Begi Pakad — Official Rules</h2>
              <p className="text-xs text-slate-400">Indian Strategic Multiplayer Card Game</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition border border-transparent hover:border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-700 px-6 gap-3 bg-[#0F172A]/70 overflow-x-auto">
          {[
            { id: 'basics', label: '1. Basics & Teams' },
            { id: 'scoring', label: '2. Scoring & Q♠' },
            { id: 'passing', label: '3. 5-Card Passing' },
            { id: 'tricks', label: '4. Playing Tricks' },
            { id: 'rules', label: '5. Special Rules' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-3 px-3 text-xs font-bold whitespace-nowrap border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-indigo-400 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-300 leading-relaxed">
          {activeTab === 'basics' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-700">
                <h4 className="font-bold text-white text-sm sm:text-base mb-1.5 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  4 Players in 2 Fixed Teams
                </h4>
                <p className="text-xs text-slate-300">
                  Begi Pakad is played with exactly <strong>4 players</strong> seated in a cross:
                </p>
                <div className="grid grid-cols-2 gap-2.5 mt-3 text-xs">
                  <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-700/50 text-indigo-200">
                    <strong>Team 1:</strong> Player 1 (South) + Player 3 (North)
                  </div>
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-700/50 text-amber-200">
                    <strong>Team 2:</strong> Player 2 (West) + Player 4 (East)
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-700">
                <h4 className="font-bold text-white text-sm sm:text-base mb-1.5">Standard 52-Card Deck</h4>
                <p className="text-xs text-slate-300">
                  Standard deck without Jokers. Suits: <strong>Hukum ♠ (Spades)</strong>,{' '}
                  <strong>Paan ♥ (Hearts)</strong>, <strong>Eent ♦ (Diamonds)</strong>,{' '}
                  <strong>Chidi ♣ (Clubs)</strong>.
                </p>
                <p className="text-xs text-slate-300 mt-2 font-mono">
                  Ranking: <span className="font-bold text-amber-300">A &gt; K &gt; Q &gt; J &gt; 10 &gt; 9 &gt; 8 &gt; 7 &gt; 6 &gt; 5 &gt; 4 &gt; 3 &gt; 2</span>.
                </p>
                <p className="text-xs text-rose-300 font-semibold mt-2">
                  🚨 There is NO TRUMP suit! All suits are equal. Only the lead suit wins a Ser.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-200 text-xs">
                <strong>Objective & Team Loss:</strong> Points are bad! If <em>any</em> player reaches <strong>100 or more points</strong>, their entire team loses immediately.
              </div>
            </div>
          )}

          {activeTab === 'scoring' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#0F172A] border border-amber-500/40">
                  <div className="flex items-center gap-2 text-amber-300 font-bold mb-1 text-xs sm:text-sm">
                    <Crown className="w-4 h-4 text-amber-400" />
                    Begum Hukum (Q♠) = 12 Points
                  </div>
                  <p className="text-xs text-slate-300">
                    The dangerous Queen of Spades gives <strong>+12 points</strong> to whoever collects it, as long as their score is below 75!
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0F172A] border border-rose-500/40">
                  <div className="flex items-center gap-2 text-rose-300 font-bold mb-1 text-xs sm:text-sm">
                    <Heart className="w-4 h-4 text-rose-400" />
                    Paan (♥) = 1 Point Each
                  </div>
                  <p className="text-xs text-slate-300">
                    Every Heart card is worth <strong>+1 point</strong> (13 total in deck). Total points in deck = 25 (12 + 13).
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-700">
                <h4 className="font-bold text-white text-xs sm:text-sm mb-2.5">Score Protection Zones</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-700">
                    <span className="font-bold text-emerald-400 shrink-0">0 – 74:</span>
                    <span>Standard scoring (Q♠ = +12, ♥ = +1). Paan can be passed.</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-700">
                    <span className="font-bold text-amber-400 shrink-0">75 – 89:</span>
                    <span><strong>⚠️ 75-Point Rule:</strong> Q♠ gives <strong>+0 points</strong> to this player! Paan still gives +1.</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-700">
                    <span className="font-bold text-rose-400 shrink-0">90 – 99:</span>
                    <span><strong>🔴 90-Point Rule:</strong> Q♠ = +0. Other players <strong>CANNOT pass Paan (♥)</strong> to this player!</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-rose-950/60 border border-rose-800">
                    <span className="font-bold text-rose-300 shrink-0">100+:</span>
                    <span><strong>❌ Game Over:</strong> Player's team loses the match immediately.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'passing' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-700">
                <h4 className="font-bold text-white text-sm sm:text-base mb-1.5">5-Card Simultaneous Passing</h4>
                <p className="text-xs text-slate-300">
                  Before the first Ser of each hand, every player selects exactly <strong>5 cards</strong> from their 13 cards to pass clockwise:
                </p>
                <div className="flex items-center justify-around py-2.5 my-2.5 bg-slate-900 rounded-xl text-xs font-mono font-bold text-indigo-300 border border-slate-700">
                  <span>P1 → P2</span>
                  <span>P2 → P3</span>
                  <span>P3 → P4</span>
                  <span>P4 → P1</span>
                </div>
                <p className="text-xs text-slate-300">
                  Passing happens simultaneously. No player sees incoming cards until everyone has selected their 5 cards.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-700/60 text-xs text-rose-200">
                <h4 className="font-bold text-white text-xs sm:text-sm mb-1">The 90-Point Passing Restriction</h4>
                <p>
                  If your passing recipient has <strong>90 or more points</strong>, the rules strictly forbid passing them any Paan (♥) cards! The game will block illegal passes.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0F172A] border border-slate-700 text-xs text-slate-300">
                <strong>2-Minute Timer:</strong> If the timer expires, the game will automatically select 5 legal cards using a deterministic safe fallback.
              </div>
            </div>
          )}

          {activeTab === 'tricks' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-700">
                <h4 className="font-bold text-white text-sm sm:text-base mb-1.5">13 Ser (Tricks) Gameplay</h4>
                <p className="text-xs text-slate-300">
                  Starting player leads any card. The suit of that card becomes the <strong>Lead Suit</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-700 space-y-2.5">
                <h4 className="font-bold text-white text-xs sm:text-sm">Following Suit Rules</h4>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs space-y-1">
                  <span className="font-bold text-emerald-400">1. If you have the Lead Suit:</span>
                  <p>You <strong>MUST</strong> play a card of that suit.</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs space-y-1">
                  <span className="font-bold text-amber-400">2. If you DO NOT have the Lead Suit:</span>
                  <p>
                    <strong>Priority 1:</strong> If you hold <strong>Q♠ (Begum Hukum)</strong>, you <strong>MUST</strong> play Q♠!
                  </p>
                  <p>
                    <strong>Priority 2:</strong> If you do not hold Q♠, you can play <strong>any card</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-700/60 text-xs text-amber-200">
                <h4 className="font-bold text-white text-xs sm:text-sm mb-1">Special Hukum Rule</h4>
                <p>
                  When Hukum (♠) is led: If someone plays <strong>A♠</strong> or <strong>K♠</strong> in the trick, and another player holds <strong>Q♠</strong>, that player <strong>MUST play Q♠</strong>, even if they have other Hukum cards!
                </p>
              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-700/50">
                <div className="flex items-center gap-2 text-indigo-300 font-bold mb-1.5 text-xs sm:text-sm">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  Zero-Ser Bonus (-5 Points!)
                </div>
                <p className="text-xs text-slate-300">
                  If a player manages to win <strong>0 Ser in all 13 Ser</strong> of a hand, <strong>-5 points</strong> is deducted from their cumulative score! (e.g. 94 becomes 89). This is a master strategic play.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-700 text-xs space-y-2 text-slate-300">
                <h4 className="font-bold text-white text-xs sm:text-sm">Trick Winner Determination</h4>
                <p>
                  The highest card of the <strong>Lead Suit</strong> wins the Ser. No trump exists. The winner collects all 4 cards and leads the next Ser.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 bg-[#0F172A] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition"
          >
            Got It, Let's Play!
          </button>
        </div>
      </div>
    </div>
  );
};
