import React, { useState } from 'react';
import { X, User, Trophy, Zap, Shield, Save } from 'lucide-react';
import { UserProfile } from '../game/types';
import { saveUserProfile } from '../services/storage';

export interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onProfileUpdate: (updated: UserProfile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdate,
}) => {
  const [name, setName] = useState(profile.name);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const updated: UserProfile = { ...profile, name: name.trim() };
    saveUserProfile(updated);
    onProfileUpdate(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const winRate =
    profile.gamesPlayed > 0
      ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in font-sans">
      <div className="relative w-full max-w-md bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-[#0F172A]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Player Profile</h2>
              <p className="text-xs text-slate-400">Manage identity & view stats</p>
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

        <div className="p-6 space-y-4">
          {/* User ID display */}
          <div className="p-3.5 bg-[#0F172A] border border-slate-700 rounded-2xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Permanent User ID
              </span>
              <div className="font-mono text-sm font-bold text-indigo-400">{profile.id}</div>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Auto-Generated</div>
          </div>

          {/* Edit Name Form */}
          <form onSubmit={handleSave} className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">Display Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={20}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-400"
                placeholder="Enter your name"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-md shadow-indigo-600/30"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaved ? 'Saved!' : 'Save'}
              </button>
            </div>
          </form>

          {/* Stats Grid */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Game Statistics
            </h4>
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3.5 bg-[#0F172A] border border-slate-700 rounded-2xl">
                <Trophy className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <div className="text-lg font-bold text-white font-mono">{profile.gamesWon}</div>
                <div className="text-[10px] text-slate-400 font-medium">Wins ({winRate}%)</div>
              </div>

              <div className="p-3.5 bg-[#0F172A] border border-slate-700 rounded-2xl">
                <Shield className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                <div className="text-lg font-bold text-white font-mono">{profile.gamesPlayed}</div>
                <div className="text-[10px] text-slate-400 font-medium">Played</div>
              </div>

              <div className="p-3.5 bg-[#0F172A] border border-slate-700 rounded-2xl">
                <Zap className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <div className="text-lg font-bold text-white font-mono">{profile.zeroSerAchievements}</div>
                <div className="text-[10px] text-slate-400 font-medium">Zero Ser (-5)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 bg-[#0F172A] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
