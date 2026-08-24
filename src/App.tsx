import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { ClientGameState, RoomInfo, UserProfile } from './game/types.ts';
import { getSocket } from './networking/socket.ts';
import { getUserProfile, recordGameResult } from './services/storage.ts';
import { sounds } from './services/audio.ts';
import { LocalBotGame } from './components/LocalBotGame.tsx';
import { GameTable } from './components/GameTable.tsx';
import { RoomLobby } from './components/RoomLobby.tsx';
import { MatchmakingModal } from './components/MatchmakingModal.tsx';
import { HowToPlayModal } from './components/HowToPlayModal.tsx';
import { ProfileModal } from './components/ProfileModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { GameOverModal } from './components/GameOverModal.tsx';
import { RoundSummaryModal } from './components/RoundSummaryModal.tsx';

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

  // Modals state
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showJoinRoomModal, setShowJoinRoomModal] = useState(false);
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [joinRoomError, setJoinRoomError] = useState('');

  // Online Multiplayer State
  const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null);
  const [onlineGameState, setOnlineGameState] = useState<ClientGameState | null>(null);
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [matchmakingPlayersCount, setMatchmakingPlayersCount] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGameOverModalOpen, setIsGameOverModalOpen] = useState(false);

  // Setup Socket.IO connection
  useEffect(() => {
    const socket = getSocket();

    socket.emit('user:init', {
      id: profile.id,
      name: profile.name,
      avatarSeed: profile.avatarSeed,
    });

    socket.on('room:created', (room) => {
      setCurrentRoom(room);
      setCurrentView('room_lobby');
    });

    socket.on('room:joined', (room) => {
      setCurrentRoom(room);
      setCurrentView('room_lobby');
    });

    socket.on('room:updated', (room) => {
      setCurrentRoom(room);
    });

    socket.on('room:closed', (msg) => {
      setErrorMessage(msg);
      setCurrentRoom(null);
      setOnlineGameState(null);
      setCurrentView('menu');
      setTimeout(() => setErrorMessage(null), 5000);
    });

    socket.on('room:error', (msg) => {
      setJoinRoomError(msg);
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
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
      setCurrentView((prev) => (prev === 'room_lobby' ? 'online_game' : prev));
      if (state.phase === 'GAME_COMPLETE') {
        setIsGameOverModalOpen(true);
        const myTeam = (state.mySeatIndex % 2 === 0 ? 1 : 2);
        const isWin = state.winnerTeam === myTeam;
        const zeroSerCount = state.handHistory.filter((h) => h.zeroTrickBonusAwarded[state.mySeatIndex]).length;
        const updatedProfile = recordGameResult(isWin, zeroSerCount);
        setProfile({ ...updatedProfile });
      }
    });

    socket.on('game:ended', (payload) => {
      setIsGameOverModalOpen(true);
    });

    socket.on('game:abandoned', (payload) => {
      setErrorMessage(payload.message);
      setOnlineGameState(null);
      setCurrentRoom(null);
      setCurrentView('menu');
      setTimeout(() => setErrorMessage(null), 6000);
    });

    socket.on('error:message', (msg) => {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    });

    return () => {
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

  // Actions
  const handlePlayBots = () => {
    sounds.playCardSelect();
    setCurrentView('local_bots');
  };

  const handleCreateRoom = () => {
    sounds.playCardSelect();
    const socket = getSocket();
    socket.emit('room:create');
  };

  const handleJoinRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomInput.trim()) return;
    sounds.playCardSelect();
    const socket = getSocket();
    socket.emit('room:join', joinRoomInput.trim().toUpperCase());
    setShowJoinRoomModal(false);
    setJoinRoomInput('');
  };

  const handleStartRandomMatch = () => {
    sounds.playCardSelect();
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
  };

  const handleHostEndGame = () => {
    const socket = getSocket();
    socket.emit('game:hostEndGame');
  };

  const handleExitToMenu = () => {
    setCurrentView('menu');
    setOnlineGameState(null);
    setCurrentRoom(null);
  };

  const isHost = Boolean(currentRoom && currentRoom.hostPlayerId === profile.id);

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col items-center justify-between font-sans selection:bg-indigo-600 selection:text-white">
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
        <div className="w-full min-h-screen flex items-center justify-center p-2 sm:p-4 bg-[#0F172A] overflow-y-auto">
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
        <div className="w-full min-h-screen flex flex-col items-center bg-[#0F172A]">
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
            onContinue={() => {
              // Online game automatically transitions when host/players complete
            }}
          />

          <GameOverModal
            isOpen={isGameOverModalOpen}
            winnerTeam={onlineGameState.winnerTeam}
            losingTeam={onlineGameState.losingTeam}
            players={onlineGameState.players}
            myTeamId={(onlineGameState.mySeatIndex % 2 === 0 ? 1 : 2)}
            onPlayAgain={() => {
              setIsGameOverModalOpen(false);
              handleExitToMenu();
            }}
            onExitToMenu={handleExitToMenu}
          />
        </div>
      )}

      {currentView === 'menu' && (
        <div className="w-full max-w-md my-auto p-4 sm:p-6 flex flex-col items-center gap-6">
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
                onClick={() => setShowHowToPlay(true)}
                className="p-2 rounded-xl bg-[#1E293B] border border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white transition shadow-sm"
                title="How To Play"
              >
                <BookOpen className="w-4 h-4 text-indigo-400" />
              </button>

              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-xl bg-[#1E293B] border border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white transition shadow-sm"
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
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase transition ${
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
            {/* Download Android App APK */}
            <a
              href="/BegiPakad.apk"
              download="BegiPakad.apk"
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-400/30 text-white font-bold text-sm flex items-center justify-between transition shadow-lg shadow-emerald-900/40 group cursor-pointer no-underline"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-white/20 text-white group-hover:scale-110 transition">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span>DOWNLOAD MOBILE APP</span>
                  <span className="text-[10px] text-emerald-100 font-normal">Android APK • Cross-Play</span>
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
              className="hover:text-indigo-300 transition flex items-center gap-1"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              How To Play
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setShowProfile(true)}
              className="hover:text-indigo-300 transition flex items-center gap-1"
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
                  onClick={() => setShowJoinRoomModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!joinRoomInput.trim()}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md"
                >
                  Join Room
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
      />
    </div>
  );
}
