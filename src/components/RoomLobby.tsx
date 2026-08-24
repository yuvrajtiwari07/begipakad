import React, { useState } from 'react';
import { RoomInfo } from '../game/types.ts';
import { Copy, Check, Users, Bot, Play, ArrowLeft, Plus, Trash2, Zap } from 'lucide-react';
import { sounds } from '../services/audio.ts';

export interface RoomLobbyProps {
  room: RoomInfo;
  currentUserId: string;
  onLeaveRoom: () => void;
  onAddBot: (seatIndex: number, difficulty: 'easy' | 'medium' | 'hard') => void;
  onRemoveBot: (seatIndex: number) => void;
  onStartGame: () => void;
}

export const RoomLobby: React.FC<RoomLobbyProps> = ({
  room,
  currentUserId,
  onLeaveRoom,
  onAddBot,
  onRemoveBot,
  onStartGame,
}) => {
  const [copied, setCopied] = useState(false);
  const isHost = room.hostPlayerId === currentUserId;
  const isFull = room.players.length === 4;

  const copyRoomCode = () => {
    sounds.playCardSelect();
    navigator.clipboard.writeText(room.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFillWithBots = () => {
    sounds.playCardSelect();
    const takenSeats = new Set(room.players.map((p) => p.seatIndex));
    for (let s = 0; s < 4; s++) {
      if (!takenSeats.has(s)) {
        onAddBot(s, 'medium');
      }
    }
  };

  // Seat slots 0, 1, 2, 3
  const seatSlots = [0, 1, 2, 3].map((seatIndex) => {
    const player = room.players.find((p) => p.seatIndex === seatIndex);
    const teamId = seatIndex % 2 === 0 ? 1 : 2;
    return { seatIndex, player, teamId };
  });

  return (
    <div className="w-full max-w-xl max-h-[96vh] overflow-y-auto no-scrollbar bg-[#1E293B] border border-slate-700 rounded-2xl sm:rounded-3xl p-3.5 xs:p-4 sm:p-6 shadow-2xl flex flex-col gap-3 sm:gap-4 my-auto text-slate-100 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5 sm:pb-3 shrink-0">
        <button
          type="button"
          onClick={() => {
            sounds.playCardSelect();
            onLeaveRoom();
          }}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl hover:bg-slate-800 transition border border-slate-700/60"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Leave Room</span>
        </button>

        <div className="flex items-center gap-2">
          {isHost && !isFull && (
            <button
              type="button"
              onClick={handleFillWithBots}
              className="flex items-center gap-1 text-[10px] sm:text-xs text-amber-300 font-bold bg-amber-950/60 hover:bg-amber-900/60 px-2 sm:px-2.5 py-1 rounded-lg border border-amber-700/60 transition shadow-sm"
              title="Fill all remaining seats with AI bots"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Fill Bots</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-indigo-300 font-bold bg-indigo-950/60 px-2.5 sm:px-3 py-1 rounded-full border border-indigo-700/50">
            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-400" />
            <span>{room.players.length} / 4 Players</span>
          </div>
        </div>
      </div>

      {/* Room Code Share Card */}
      <div className="p-2.5 xs:p-3 sm:p-4 bg-[#0F172A] border border-slate-700 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center text-center gap-1 sm:gap-2 shadow-inner shrink-0">
        <span className="text-[11px] sm:text-xs text-slate-400 font-medium">
          Share this Room ID with friends
        </span>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="font-mono text-2xl xs:text-3xl sm:text-4xl font-bold text-indigo-400 tracking-wider">
            {room.roomId}
          </span>
          <button
            type="button"
            onClick={copyRoomCode}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition flex items-center gap-1.5 text-xs font-bold"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* 4 Seating Slots */}
      <div className="space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
            Player Seating & Teams
          </h4>
          <span className="text-[10px] text-slate-500">
            Team 1: P1 & P3 • Team 2: P2 & P4
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
          {seatSlots.map(({ seatIndex, player, teamId }) => (
            <div
              key={seatIndex}
              className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border flex items-center justify-between gap-2 transition ${
                player
                  ? player.id === currentUserId
                    ? 'bg-slate-900 border-indigo-500 shadow-md ring-1 ring-indigo-500/30'
                    : 'bg-[#0F172A] border-slate-700'
                  : 'bg-[#0F172A]/50 border-dashed border-slate-700/60'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    player
                      ? teamId === 1
                        ? 'bg-indigo-600 text-white'
                        : 'bg-amber-600 text-slate-950'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {player ? (
                    player.isBot ? (
                      <Bot className="w-4 h-4" />
                    ) : (
                      player.name.slice(0, 2).toUpperCase()
                    )
                  ) : (
                    `P${seatIndex + 1}`
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-white whitespace-nowrap">
                      {player ? player.name : `Seat ${seatIndex + 1}`}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold whitespace-nowrap shrink-0 ${
                        teamId === 1
                          ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/40'
                          : 'bg-amber-950 text-amber-300 border border-amber-800/40'
                      }`}
                    >
                      Team {teamId}
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-400 block truncate">
                    {player
                      ? player.id === room.hostPlayerId
                        ? '👑 Room Host'
                        : player.isBot
                          ? '🤖 AI Bot'
                          : 'Connected Player'
                      : 'Waiting for player...'}
                  </span>
                </div>
              </div>

              {/* Action for open slot or bot removal */}
              <div className="shrink-0">
                {!player && isHost && (
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playCardSelect();
                      onAddBot(seatIndex, 'medium');
                    }}
                    className="px-2 xs:px-2.5 py-1 bg-indigo-900/40 hover:bg-indigo-600 text-indigo-200 hover:text-white text-[10px] font-bold rounded-lg border border-indigo-700/60 hover:border-indigo-500 flex items-center gap-1 transition shadow-sm whitespace-nowrap"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Bot</span>
                  </button>
                )}

                {player && player.isBot && isHost && (
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playCardSelect();
                      onRemoveBot(seatIndex);
                    }}
                    className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 rounded-lg transition"
                    title="Remove Bot"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Host Start Match Controls */}
      <div className="pt-1 sm:pt-2 shrink-0">
        {isHost ? (
          <button
            type="button"
            disabled={!isFull}
            onClick={() => {
              if (isFull) {
                sounds.playCardThrow();
                onStartGame();
              }
            }}
            className={`w-full py-3 sm:py-3.5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg ${
              isFull
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 cursor-pointer active:scale-98 animate-pulse'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isFull ? 'START MATCH NOW' : 'WAITING FOR 4 PLAYERS (OR ADD BOTS)'}</span>
          </button>
        ) : (
          <div className="text-center text-xs text-slate-400 py-2.5 sm:py-3 font-medium bg-[#0F172A] rounded-xl border border-slate-700">
            Waiting for Host to start the match...
          </div>
        )}
      </div>
    </div>
  );
};
