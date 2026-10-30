import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  PlusCircle,
  LogIn,
  Shuffle,
  BookOpen,
  User,
  Settings as SettingsIcon,
  Crown,
  Heart,
  Shield,
  Zap,
  ArrowRight,
  Wifi,
  Sparkles,
  Smartphone,
  Download,
  Maximize,
  Minimize,
} from 'lucide-react';
import { ClientGameState, RoomInfo, UserProfile } from './game/types';
import { getSocket } from './networking/socket';
import { getUserProfile, recordGameResult } from './services/storage';
import { sounds } from './services/audio';
import { LocalBotGame } from './components/LocalBotGame';
import { GameTable } from './components/GameTable';
import { RoomLobby } from './components/RoomLobby';
import { MatchmakingModal } from './components/MatchmakingModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { ProfileModal } from './components/ProfileModal';
import { SettingsModal } from './components/SettingsModal';
import { GameOverModal } from './components/GameOverModal';
import { RoundSummaryModal } from './components/RoundSummaryModal';
import { usePWA } from './hooks/usePWA';
import { PWAInstallModal } from './components/PWAInstallModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { OfflineBadge, PWAUpdateToast } from './components/OfflineBadge';

type AppView =
  | 'menu'
  | 'local_bots'
  | 'room_lobby'
  | 'online_game';

export default function App() {
  const [profile, setProfile] = useState<UserProfile>(getUserProfile());
  const [currentView, setCurrentView] = useState<AppView>('menu');
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [tableTheme, setTableTheme] = useState<string>('emerald');

  // PWA State & Hook
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isDesktop,
    isOffline,
    needRefresh,
    hasNativePrompt,
    triggerInstallPrompt,
    updateServiceWorker,
    dismissUpdate,
  } = usePWA();
  const [showPWAModal, setShowPWAModal] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Modals state
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showJoinRoomModal, setShowJoinRoomModal] = useState(false);
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [joinRoomError, setJoinRoomError] = useState('');
  // The Join Room box stays open until the server answers, so its inline error is visible
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const isJoiningRoomRef = useRef(false);
  isJoiningRoomRef.current = isJoiningRoom;

  // Online Multiplayer State
  const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null);
  const [onlineGameState, setOnlineGameState] = useState<ClientGameState | null>(null);
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [matchmakingPlayersCount, setMatchmakingPlayersCount] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGameOverModalOpen, setIsGameOverModalOpen] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(true);
  const isMatchmakingRef = useRef(false);
  isMatchmakingRef.current = isMatchmaking;
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // One timer for the toast, so a newer error gets its full time on screen
  const showError = (msg: string, ms = 4000) => {
    setErrorMessage(msg);
    clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setErrorMessage(null), ms);
  };

  // Setup Socket.IO connection
  useEffect(() => {
    const socket = getSocket();

    // The handshake identifies us on every (re)connect; this only pushes profile
    // edits made while already connected.
    if (socket.connected) {
      socket.emit('user:init', {
        id: profile.id,
        name: profile.name,
        avatarSeed: profile.avatarSeed,
      });
    }

    const handleConnect = () => {
      setIsSocketConnected(true);
      // The server drops us from the queue when the connection is lost; rejoin it
      if (isMatchmakingRef.current) socket.emit('matchmaking:join');
    };
    const handleDisconnect = () => setIsSocketConnected(false);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    socket.on('room:created', (room) => {
      setCurrentRoom(room);
      setCurrentView('room_lobby');
    });

    socket.on('room:joined', (room) => {
      setCurrentRoom(room);
      setCurrentView('room_lobby');
      setIsJoiningRoom(false);
      setShowJoinRoomModal(false);
      setJoinRoomInput('');
    });

    socket.on('room:updated', (room) => {
      setCurrentRoom(room);
    });

    socket.on('room:closed', (msg) => {
      showError(msg, 5000);
      setCurrentRoom(null);
      setOnlineGameState(null);
      setCurrentView('menu');
    });

    socket.on('room:error', (msg) => {
      setJoinRoomError(msg);
      // While the Join Room box is open the error shows inline there instead of as a toast
      if (!isJoiningRoomRef.current) showError(msg);
      setIsJoiningRoom(false);
    });

    socket.on('matchmaking:status', (status) => {
      setIsMatchmaking(status.inQueue);
      setMatchmakingPlayersCount(status.playersCount);
    });

    socket.on('game:started', (state) => {
      setIsMatchmaking(false);
      setOnlineGameState(state);
      setCurrentView('online_game');
      setIsGameOverModalOpen(false);
    });

    socket.on('game:stateUpdate', (state) => {
      setOnlineGameState(state);
      setCurrentView((prev) => (prev === 'local_bots' ? prev : 'online_game'));
      if (state.phase === 'GAME_COMPLETE') {
        setIsGameOverModalOpen(true);
        const myTeam = (state.mySeatIndex % 2 === 0 ? 1 : 2);
        const isWin = state.winnerTeam === myTeam;
        const zeroSerCount = state.handHistory.filter((h) => h.zeroTrickBonusAwarded[state.mySeatIndex]).length;
        const updatedProfile = recordGameResult(isWin, zeroSerCount, state.gameId);
        setProfile({ ...updatedProfile });
      }
    });

    socket.on('game:ended', (payload) => {
      setIsGameOverModalOpen(true);
    });

    socket.on('game:abandoned', (payload) => {
      showError(payload.message, 6000);
      setOnlineGameState(null);
      setCurrentRoom(null);
      setCurrentView('menu');
    });

    socket.on('error:message', (msg) => showError(msg));

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('room:created');
      socket.off('room:joined');
      socket.off('room:updated');
      socket.off('room:closed');
      socket.off('room:error');
      socket.off('matchmaking:status');
      socket.off('game:started');
      socket.off('game:stateUpdate');
      socket.off('game:ended');
      socket.off('game:abandoned');
      socket.off('error:message');
    };
  }, [profile.id, profile.name, profile.avatarSeed]);

  // PWA home-screen shortcuts open /?mode=local or /?mode=create (see vite.config.ts)
  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get('mode');
    if (!mode) return;
    // Drop the param so a refresh doesn't repeat the action
    window.history.replaceState(null, '', window.location.pathname);
    if (mode === 'local') {
      setCurrentView('local_bots');
    } else if (mode === 'create') {
      getSocket().emit('room:create');
    }
  }, []);

  const triggerFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };

  // Actions
  const handlePlayBots = () => {
    sounds.playCardSelect();
    triggerFullscreen();
    const socket = getSocket();
    socket.emit('room:leave');
    socket.emit('matchmaking:leave');
    setOnlineGameState(null);
    setCurrentRoom(null);
    setIsMatchmaking(false);
    setCurrentView('local_bots');
  };

  const handleCreateRoom = () => {
    sounds.playCardSelect();
    triggerFullscreen();
    setOnlineGameState(null);
    setCurrentRoom(null);
    setIsMatchmaking(false);
    const socket = getSocket();
    socket.emit('room:create');
  };

  const handleJoinRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomInput.trim()) return;
    sounds.playCardSelect();
    triggerFullscreen();
    setOnlineGameState(null);
    setCurrentRoom(null);
    setIsMatchmaking(false);
    const socket = getSocket();
    setJoinRoomError('');
    setIsJoiningRoom(true);
    socket.emit('room:join', joinRoomInput.trim().toUpperCase());
  };

  const handleStartRandomMatch = () => {
    sounds.playCardSelect();
    triggerFullscreen();
    setOnlineGameState(null);
    setCurrentRoom(null);
    const socket = getSocket();
    socket.emit('matchmaking:join');
    setIsMatchmaking(true);
  };

  const handleCancelRandomMatch = () => {
    const socket = getSocket();
    socket.emit('matchmaking:leave');
    setIsMatchmaking(false);
  };

  const handleLeaveRoom = () => {
    const socket = getSocket();
    socket.emit('room:leave');
    setCurrentRoom(null);
    setOnlineGameState(null);
    setIsMatchmaking(false);
    setCurrentView('menu');
  };

  const handleAddBotToRoom = (seatIndex: number, diff: 'easy' | 'medium' | 'hard') => {
    const socket = getSocket();
    socket.emit('room:addBot', seatIndex, diff);
  };

  const handleRemoveBotFromRoom = (seatIndex: number) => {
    const socket = getSocket();
    socket.emit('room:removeBot', seatIndex);
  };

  const handleStartRoomGame = () => {
    triggerFullscreen();
    const socket = getSocket();
    socket.emit('room:start');
  };

  const handleOnlinePlayCard = (cardId: string) => {
    const socket = getSocket();
    socket.emit('game:playCard', cardId);
  };

  const handleOnlineSubmitPass = (cardIds: string[]) => {
    const socket = getSocket();
    socket.emit('game:submitPass', cardIds);
  };

  const handleOnlineAutoPass = () => {
    // Pick auto cards from current hand
    if (!onlineGameState) return;
    const recipientSeat = (onlineGameState.mySeatIndex + 1) % 4;
    const recipient = onlineGameState.players.find((p) => p.seatIndex === recipientSeat);
    const recipientScore = recipient ? recipient.score : 0;
    const eligible = recipientScore >= 90
      ? onlineGameState.myHand.filter((c) => !c.isPaan)
      : [...onlineGameState.myHand];
    const sorted = eligible.sort((a, b) => b.rankValue - a.rankValue);
    const passCards = sorted.slice(0, 5).map((c) => c.id);
    handleOnlineSubmitPass(passCards);
  };

  const handleSendQuickMessage = (text: string) => {
    const socket = getSocket();
    socket.emit('game:sendQuickMessage', text);
  };

  const handleReplaceWithBot = () => {
    const socket = getSocket();
    socket.emit('game:replaceWithBot');
  };

  const handleExitAndEndGame = () => {
    const socket = getSocket();
    socket.emit('game:exitAndEnd');
    handleExitToMenu();
  };

  const handleHostEndGame = () => {
    const socket = getSocket();
    socket.emit('game:hostEndGame');
    handleExitToMenu();
  };

  const handleExitToMenu = () => {
    const socket = getSocket();
    socket.emit('room:leave');
    socket.emit('matchmaking:leave');
    setCurrentView('menu');
    setOnlineGameState(null);
    setCurrentRoom(null);
    setIsMatchmaking(false);
    setIsGameOverModalOpen(false);
  };

  const isHost = (onlineGameState?.hostPlayerId ?? currentRoom?.hostPlayerId) === profile.id;

  return (
    <div className="w-full h-dvh bg-[#0F172A] text-slate-100 flex flex-col items-center justify-between font-sans selection:bg-indigo-600 selection:text-white overflow-hidden">
      {/* PWA Banner & Offline Status */}
      {!bannerDismissed && currentView === 'menu' && (
        <PWAInstallBanner
          isInstallable={isInstallable}
          isInstalled={isInstalled}
          isIOS={isIOS}
          isAndroid={isAndroid}
          isDesktop={isDesktop}
          onOpenModal={() => setShowPWAModal(true)}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}
      <OfflineBadge isOffline={isOffline} />
      <PWAUpdateToast
        needRefresh={needRefresh}
        onUpdate={updateServiceWorker}
        onDismiss={dismissUpdate}
      />

      {/* Online game reconnect status, so players wait instead of refreshing */}
      {!isSocketConnected && (currentView === 'online_game' || currentView === 'room_lobby') && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-amber-950/90 border border-amber-500/50 text-amber-200 text-xs font-bold shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top">
          Connection lost. Reconnecting…
        </div>
      )}

      {/* Toast Error Banner */}
      {errorMessage && (
        <div className="fixed top-4 z-50 max-w-md bg-rose-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl border border-rose-400 animate-in fade-in slide-in-from-top">
          {errorMessage}
        </div>
      )}

      {/* VIEW ROUTER */}
      {currentView === 'local_bots' && (
        <LocalBotGame
          playerName={profile.name}
          avatarSeed={profile.avatarSeed}
          botDifficulty={botDifficulty}
          onExitToMenu={() => setCurrentView('menu')}
          tableTheme={tableTheme}
        />
      )}

      {currentView === 'room_lobby' && currentRoom && (
        <div className="w-full flex-1 min-h-0 flex items-center justify-center p-2 sm:p-4 bg-[#0F172A] overflow-y-auto no-scrollbar">
          <RoomLobby
            room={currentRoom}
            currentUserId={profile.id}
            onLeaveRoom={handleLeaveRoom}
            onAddBot={handleAddBotToRoom}
            onRemoveBot={handleRemoveBotFromRoom}
            onStartGame={handleStartRoomGame}
          />
        </div>
      )}

      {currentView === 'online_game' && onlineGameState && (
        <div className="w-full flex-1 min-h-0 flex flex-col items-center bg-[#0F172A]">
          <GameTable
            gameState={onlineGameState}
            onPlayCard={handleOnlinePlayCard}
            onSubmitPass={handleOnlineSubmitPass}
            onAutoPass={handleOnlineAutoPass}
            onLeaveGame={handleExitToMenu}
            onReplaceWithBot={handleReplaceWithBot}
            onExitAndEndGame={handleExitAndEndGame}
            onHostEndGame={handleHostEndGame}
            onSendQuickMessage={handleSendQuickMessage}
            isHost={isHost}
            onOpenRules={() => setShowHowToPlay(true)}
            tableTheme={tableTheme}
          />

          <RoundSummaryModal
            isOpen={Boolean(onlineGameState.phase === 'HAND_COMPLETE')}
            handResult={onlineGameState.handHistory[onlineGameState.handHistory.length - 1] || null}
            players={onlineGameState.players}
            isHost={onlineGameState.mySeatIndex === (onlineGameState.nextRoundSeatIndex ?? 0)}
            hostName={onlineGameState.players.find(p => p.seatIndex === (onlineGameState.nextRoundSeatIndex ?? 0))?.name || 'Host'}
            onContinue={() => {
              getSocket().emit('game:nextRound');
            }}
          />

          <GameOverModal
            isOpen={isGameOverModalOpen}
            winnerTeam={onlineGameState.winnerTeam}
            losingTeam={onlineGameState.losingTeam}
            players={onlineGameState.players}
            handHistory={onlineGameState.handHistory}
            myTeamId={(onlineGameState.mySeatIndex % 2 === 0 ? 1 : 2)}
            onExitToMenu={handleExitToMenu}
          />
        </div>
      )}

      {currentView === 'menu' && (
        <div className="w-full max-w-md my-auto p-4 sm:p-6 pt-safe pb-safe flex flex-col items-center gap-4 sm:gap-6 overflow-y-auto no-scrollbar max-h-full">
          {/* Top Bar with Profile & Settings */}
          <div className="w-full flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#1E293B] border border-slate-700 hover:border-slate-600 text-xs font-semibold text-slate-300 hover:text-white transition shadow-md"
            >
              <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                {profile.name.slice(0, 2)}
              </div>
              <span className="truncate max-w-[110px]">{profile.name}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPWAModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md border border-indigo-400/40 transition cursor-pointer"
                title="Install PWA App"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Install App</span>
              </button>

              <button
                type="button"
                onClick={() => setShowHowToPlay(true)}
                className="p-2 rounded-xl bg-[#1E293B] border border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white transition shadow-sm cursor-pointer"
                title="How To Play"
              >
                <BookOpen className="w-4 h-4 text-indigo-400" />
              </button>

              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-xl bg-[#1E293B] border border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white transition shadow-sm cursor-pointer"
                title="Settings"
              >
                <SettingsIcon className="w-4 h-4 text-slate-300" />
              </button>
            </div>
          </div>

          {/* Hero Branding */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/30 border border-indigo-400">
                <span className="text-white font-black text-2xl tracking-tighter">BP</span>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 rounded-full p-1 shadow-md border border-slate-900">
                <Crown className="w-3.5 h-3.5 fill-amber-200" />
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-1">
              Begi Pakad
            </h1>

            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Standard 4-player team card game. Avoid Begum Hukum (Q♠) and Paan (♥) to protect your team!
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="w-full space-y-3">
            {/* Play With Bots */}
            <div className="p-3.5 bg-[#1E293B] border border-slate-700 rounded-2xl flex flex-col gap-2.5 shadow-xl">
              <button
                type="button"
                onClick={handlePlayBots}
                className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-between shadow-lg shadow-indigo-600/30 transition active:scale-98 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Bot className="w-5 h-5" />
                  <span>PLAY WITH BOTS</span>
                </div>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Bot Difficulty Selector */}
              <div className="flex items-center justify-between text-xs px-1 text-slate-400 font-medium">
                <span>AI Difficulty:</span>
                <div className="flex gap-1">
                  {(['easy', 'medium', 'hard'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setBotDifficulty(d)}
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer ${
                        botDifficulty === d
                          ? 'bg-indigo-600 text-white border border-indigo-400'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Create Room */}
            <button
              type="button"
              onClick={handleCreateRoom}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#1E293B] hover:bg-slate-800 border border-slate-700 text-white font-bold text-sm flex items-center justify-between transition shadow-md group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <span>Create Private Room</span>
              </div>
              <span className="text-[10px] text-indigo-300 font-mono bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                BGP Code
              </span>
            </button>

            {/* Join Room */}
            <button
              type="button"
              onClick={() => {
                setJoinRoomError('');
                setShowJoinRoomModal(true);
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#1E293B] hover:bg-slate-800 border border-slate-700 text-white font-bold text-sm flex items-center justify-between transition shadow-md group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition">
                  <LogIn className="w-4 h-4" />
                </div>
                <span>Join Room</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </button>

            {/* Random Match */}
            <button
              type="button"
              onClick={handleStartRandomMatch}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#1E293B] hover:bg-slate-800 border border-slate-700 text-white font-bold text-sm flex items-center justify-between transition shadow-md group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                  <Shuffle className="w-4 h-4" />
                </div>
                <span>Random Matchmaking</span>
              </div>
              <span className="text-[10px] text-amber-400 font-semibold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                Queue
              </span>
            </button>

            {/* Install PWA App Button */}
            <button
              type="button"
              onClick={() => setShowPWAModal(true)}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-700 hover:from-indigo-600 hover:to-purple-600 border border-indigo-400/30 text-white font-bold text-sm flex items-center justify-between transition shadow-lg shadow-indigo-900/40 group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-white/20 text-white group-hover:scale-110 transition">
                  <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                </div>
                <div className="flex flex-col text-left">
                  <span>INSTALL PWA APP</span>
                  <span className="text-[10px] text-indigo-100 font-normal">PC, Laptop, Tablet, Android & iOS</span>
                </div>
              </div>
              <Download className="w-4 h-4 text-indigo-100 group-hover:translate-y-0.5 transition" />
            </button>

            {/* Download Android App APK */}
            <a
              href="/BegiPakad.apk"
              download="BegiPakad.apk"
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-400/30 text-white font-bold text-xs flex items-center justify-between transition shadow-md group cursor-pointer no-underline"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-white/20 text-white group-hover:scale-110 transition">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span>DOWNLOAD ANDROID APK</span>
                  <span className="text-[9px] text-emerald-100 font-normal">Native APK File • Android</span>
                </div>
              </div>
              <Download className="w-4 h-4 text-emerald-100 group-hover:translate-y-0.5 transition" />
            </a>
          </div>

          {/* Quick Rules & Profile Trigger */}
          <div className="w-full flex items-center justify-center gap-4 text-xs text-slate-400 pt-2 font-medium">
            <button
              type="button"
              onClick={() => setShowHowToPlay(true)}
              className="hover:text-indigo-300 transition flex items-center gap-1 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              How To Play
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setShowProfile(true)}
              className="hover:text-indigo-300 transition flex items-center gap-1 cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-indigo-400" />
              Profile ({profile.name})
            </button>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {showJoinRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm bg-[#1E293B] border border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-white">Join Private Room</h3>
              <p className="text-xs text-slate-400 mt-0.5">Enter 6-character Room ID</p>
            </div>

            <form onSubmit={handleJoinRoomSubmit} className="space-y-3">
              <input
                type="text"
                autoFocus
                maxLength={8}
                value={joinRoomInput}
                onChange={(e) => setJoinRoomInput(e.target.value.toUpperCase())}
                placeholder="e.g. BGP482"
                className="w-full bg-[#0F172A] border border-slate-700 rounded-2xl px-4 py-3 text-center font-mono text-xl font-bold text-indigo-400 tracking-widest uppercase focus:outline-none focus:border-indigo-500"
              />

              {joinRoomError && (
                <div className="text-xs text-rose-400 text-center font-medium">
                  {joinRoomError}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinRoomModal(false);
                    setIsJoiningRoom(false);
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!joinRoomInput.trim() || isJoiningRoom}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
                >
                  {isJoiningRoom ? 'Joining…' : 'Join Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Matchmaking Queue Modal */}
      <MatchmakingModal
        isOpen={isMatchmaking}
        playersCount={matchmakingPlayersCount}
        targetCount={4}
        onCancel={handleCancelRandomMatch}
      />

      {/* How To Play Modal */}
      <HowToPlayModal
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        profile={profile}
        onProfileUpdate={(updated) => setProfile(updated)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        tableTheme={tableTheme}
        onThemeChange={(th) => setTableTheme(th)}
        onOpenPWAInstall={() => setShowPWAModal(true)}
        isPWAInstalled={isInstalled}
      />

      {/* PWA Install Modal */}
      <PWAInstallModal
        isOpen={showPWAModal}
        onClose={() => setShowPWAModal(false)}
        isIOS={isIOS}
        isAndroid={isAndroid}
        isDesktop={isDesktop}
        hasNativePrompt={hasNativePrompt}
        onTriggerInstall={triggerInstallPrompt}
      />
    </div>
  );
}
