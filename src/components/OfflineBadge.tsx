import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

interface OfflineBadgeProps {
  isOffline: boolean;
}

export function OfflineBadge({ isOffline }: OfflineBadgeProps) {
  if (!isOffline) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full bg-amber-950/90 border border-amber-500/50 text-amber-200 text-xs font-bold shadow-xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top">
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span>Offline Mode — Bot games are active</span>
    </div>
  );
}

interface PWAUpdateToastProps {
  needRefresh: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

export function PWAUpdateToast({ needRefresh, onUpdate, onDismiss }: PWAUpdateToastProps) {
  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm p-4 rounded-2xl bg-[#1E293B] border border-indigo-500/50 text-white shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-in slide-in-from-bottom">
      <div className="flex flex-col">
        <span className="text-xs font-bold text-indigo-300">New App Version Ready</span>
        <span className="text-[11px] text-slate-300">Update now to get the latest features</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDismiss}
          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition"
        >
          Later
        </button>
        <button
          type="button"
          onClick={onUpdate}
          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow-md flex items-center gap-1.5 transition"
        >
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>Update</span>
        </button>
      </div>
    </div>
  );
}
