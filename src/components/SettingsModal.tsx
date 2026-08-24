import React, { useState } from 'react';
import { X, Settings, Volume2, VolumeX, Smartphone, Palette } from 'lucide-react';
import { sounds } from '../services/audio.ts';
import { haptics } from '../services/haptics.ts';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableTheme: string;
  onThemeChange: (theme: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  tableTheme,
  onThemeChange,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(sounds.isEnabled());
  const [hapticsEnabled, setHapticsEnabled] = useState(haptics.isEnabled());

  if (!isOpen) return null;

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.setEnabled(next);
    if (next) sounds.playCardSelect();
  };

  const toggleHaptics = () => {
    const next = !hapticsEnabled;
    setHapticsEnabled(next);
    haptics.setEnabled(next);
    if (next) haptics.triggerLight();
  };

  const themes = [
    { id: 'emerald', label: 'Emerald Felt', color: 'bg-emerald-900 border-emerald-500' },
    { id: 'midnight', label: 'Midnight Blue', color: 'bg-slate-900 border-indigo-500' },
    { id: 'crimson', label: 'Royal Crimson', color: 'bg-rose-950 border-rose-500' },
    { id: 'charcoal', label: 'Charcoal Velvet', color: 'bg-zinc-900 border-zinc-500' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in font-sans">
      <div className="relative w-full max-w-md bg-[#1E293B] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-[#0F172A]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Settings</h2>
              <p className="text-xs text-slate-400">Audio, haptics & appearance</p>
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
          {/* Sound FX toggle */}
          <div className="flex items-center justify-between p-3.5 bg-[#0F172A] border border-slate-700 rounded-2xl">
            <div className="flex items-center gap-3">
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-indigo-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-500" />
              )}
              <div>
                <span className="text-sm font-bold text-white block">Game Sound FX</span>
                <span className="text-[11px] text-slate-400">
                  Card throws, snaps, alerts & fanfare
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleSound}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                soundEnabled ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform transform ${
                  soundEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Haptics toggle */}
          <div className="flex items-center justify-between p-3.5 bg-[#0F172A] border border-slate-700 rounded-2xl">
            <div className="flex items-center gap-3">
              <Smartphone className={`w-5 h-5 ${hapticsEnabled ? 'text-indigo-400' : 'text-slate-500'}`} />
              <div>
                <span className="text-sm font-bold text-white block">Haptic Feedback</span>
                <span className="text-[11px] text-slate-400">
                  Vibrations on card play & Q♠ collection
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleHaptics}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                hapticsEnabled ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform transform ${
                  hapticsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Table Felt Theme */}
          <div className="p-3.5 bg-[#0F172A] border border-slate-700 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-2 text-slate-300">
              <Palette className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-white">Table Felt Theme</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onThemeChange(t.id)}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 transition ${
                    tableTheme === t.id
                      ? `${t.color} ring-2 ring-indigo-400 text-white font-bold`
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full ${t.color}`} />
                  <span className="text-xs truncate">{t.label}</span>
                </button>
              ))}
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
