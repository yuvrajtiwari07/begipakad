import React from 'react';
import { Download, Sparkles, X, Smartphone, Monitor } from 'lucide-react';

interface PWAInstallBannerProps {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  onOpenModal: () => void;
  onDismiss: () => void;
}

export function PWAInstallBanner({
  isInstallable,
  isInstalled,
  isIOS,
  isAndroid,
  isDesktop,
  onOpenModal,
  onDismiss,
}: PWAInstallBannerProps) {
  if (isInstalled || !isInstallable) return null;

  return (
    <div className="w-full bg-gradient-to-r from-indigo-900/90 via-purple-900/90 to-slate-900/90 border-b border-indigo-500/30 px-3 py-2 text-white shadow-lg flex items-center justify-between gap-3 text-xs animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-1.5 rounded-xl bg-indigo-600/40 border border-indigo-400/40 text-amber-400 shrink-0">
          <Sparkles className="w-4 h-4 fill-amber-400" />
        </div>
        <div className="truncate">
          <span className="font-bold text-slate-100">Install Begi Pakad App</span>
          <span className="hidden sm:inline text-slate-300 ml-1">
            — Play fullscreen on {isIOS ? 'iPhone/iPad' : isAndroid ? 'Android' : 'PC & Laptop'} with instant access & offline support!
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenModal}
          className="py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-md border border-indigo-400/40 transition active:scale-95 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>INSTALL APP</span>
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
