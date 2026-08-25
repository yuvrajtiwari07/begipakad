import React, { useState } from 'react';
import {
  Smartphone,
  Monitor,
  Apple,
  Download,
  X,
  Share,
  PlusSquare,
  CheckCircle2,
  Zap,
  WifiOff,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  hasNativePrompt: boolean;
  onTriggerInstall: () => Promise<boolean>;
}

export function PWAInstallModal({
  isOpen,
  onClose,
  isIOS,
  isAndroid,
  isDesktop,
  hasNativePrompt,
  onTriggerInstall,
}: PWAInstallModalProps) {
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'desktop'>(
    isIOS ? 'ios' : isAndroid ? 'android' : 'desktop'
  );
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setIsInstalling(true);
    const success = await onTriggerInstall();
    setIsInstalling(false);
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg bg-[#1E293B] border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Header */}
        <div className="flex items-center gap-3.5 pt-1">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/30 shrink-0">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold uppercase tracking-wider mb-1">
              <Zap className="w-3 h-3 text-amber-400 fill-amber-400" /> Web App
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Install Begi Pakad PWA
            </h2>
            <p className="text-xs text-slate-400">
              Get the native app experience on Laptop, PC, Tablet, Android & iPhone
            </p>
          </div>
        </div>

        {/* Features highlight grid */}
        <div className="grid grid-cols-3 gap-2 py-1">
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col items-center text-center gap-1">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-bold text-slate-200">Instant Launch</span>
            <span className="text-[9px] text-slate-400">From home screen</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col items-center text-center gap-1">
            <WifiOff className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-bold text-slate-200">Offline Bots</span>
            <span className="text-[9px] text-slate-400">Play anytime</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col items-center text-center gap-1">
            <Smartphone className="w-4 h-4 text-indigo-400" />
            <span className="text-[11px] font-bold text-slate-200">Full Screen</span>
            <span className="text-[9px] text-slate-400">No browser address bar</span>
          </div>
        </div>

        {/* Native Install Button (if browser supports direct prompt) */}
        {hasNativePrompt && !installSuccess && (
          <button
            type="button"
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm sm:text-base tracking-wide flex items-center justify-center gap-2.5 shadow-xl shadow-indigo-600/30 border border-indigo-400/30 transition transform active:scale-98 cursor-pointer"
          >
            <Download className="w-5 h-5 animate-bounce" />
            <span>{isInstalling ? 'INSTALLING...' : 'INSTALL ONE-CLICK PWA APP'}</span>
          </button>
        )}

        {installSuccess && (
          <div className="w-full py-3.5 px-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold text-sm flex items-center justify-center gap-2 shadow-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>App Installed Successfully! Launching...</span>
          </div>
        )}

        {/* Device guide tabs */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Device Instructions:</span>
            <span className="text-[10px] text-slate-400 normal-case font-normal">
              Select your device below
            </span>
          </div>

          {/* Platform Selector Tabs */}
          <div className="grid grid-cols-3 p-1 rounded-2xl bg-slate-900/80 border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'android'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'ios'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Apple className="w-3.5 h-3.5" />
              <span>iOS / iPhone</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('desktop')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'desktop'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>PC / Laptop</span>
            </button>
          </div>

          {/* Instructions Content */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            {activeTab === 'ios' && (
              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-indigo-400 font-bold">
                  <Apple className="w-4 h-4" />
                  <span>iPhone & iPad (Safari Browser)</span>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-200">
                        Tap the <Share className="w-3.5 h-3.5 inline text-indigo-400" /> Share button
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Located at the bottom of Safari on iPhone or top on iPad.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-200">
                        Scroll down and tap <PlusSquare className="w-3.5 h-3.5 inline text-emerald-400" /> 'Add to Home Screen'
                      </p>
                      <p className="text-[11px] text-slate-400">
                        This installs Begi Pakad directly as an app icon.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-200">Tap 'Add' in the top-right corner</p>
                      <p className="text-[11px] text-slate-400">
                        Launch directly from your iOS Home Screen!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'android' && (
              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <Smartphone className="w-4 h-4" />
                    <span>Android Mobile & Tablet</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {hasNativePrompt ? (
                    <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-slate-200">
                      <p className="font-semibold text-indigo-300">✨ One-Click Ready!</p>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Tap the big <strong>"INSTALL ONE-CLICK PWA APP"</strong> button above!
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                        1
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-200">
                          Tap Chrome menu (<strong>⋮</strong> or <strong>≡</strong>)
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Android APK alternative link */}
                  <div className="pt-1">
                    <a
                      href="/BegiPakad.apk"
                      download="BegiPakad.apk"
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-between transition no-underline"
                    >
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4 text-emerald-400" />
                        <span>Download Android APK Directly (.apk)</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'desktop' && (
              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-indigo-400 font-bold">
                  <Monitor className="w-4 h-4" />
                  <span>Desktop & Laptop (Windows, Mac, Linux, Chromebook)</span>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-200">Look at your Browser Address Bar</p>
                      <p className="text-[11px] text-slate-400">
                        In Chrome/Edge/Brave, look for the <strong>Install Icon (⊕ or 📥)</strong> on the right side of the address bar.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-200">Click 'Install'</p>
                      <p className="text-[11px] text-slate-400">
                        Begi Pakad will open in a clean, standalone desktop window with a desktop launcher icon!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
