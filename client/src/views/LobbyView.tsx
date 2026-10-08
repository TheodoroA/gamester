import React, { useState } from 'react';
import { Crown, CheckCircle2, Copy, Play, Volume2 } from 'lucide-react';
import { RoomState, Player } from '../stores/roomStore.js';

interface LobbyViewProps {
  room: RoomState;
  currentPlayer: Player;
  hasAudioUnlocked: boolean;
  onToggleReady: () => void;
  onStartGame: () => void;
  onUnlockAudio: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  room,
  currentPlayer,
  hasAudioUnlocked,
  onToggleReady,
  onStartGame,
  onUnlockAudio
}) => {
  const [copied, setCopied] = useState(false);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHost = currentPlayer.id === room.hostId;

  return (
    <div className="max-w-2xl w-full mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
      {/* Cabeçalho do Lobby */}
      <div className="flex flex-col sm:flex-row justify-between items-center pb-6 border-b border-slate-800 gap-4">
        <div>
          <span className="text-xs uppercase font-bold text-slate-400">Código da Sala</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-3xl font-mono font-black tracking-widest text-purple-400">
              {room.id}
            </span>
            <button
              onClick={copyRoomCode}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              title="Copiar código"
            >
              <Copy className="w-4 h-4" />
            </button>
            {copied && <span className="text-xs text-green-400 font-semibold">Copiado!</span>}
          </div>
        </div>

        <div className="text-right">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
            Modo: {room.settings.mode === 'TIMELINE' ? '📜 Linha do Tempo (10 cartas)' : '⚡ Arcade (por pontos)'}
          </span>
        </div>
      </div>

      {/* Aviso de Desbloqueio de Áudio (Crucial para mitigar bloqueio de autoplay nos navegadores) */}
      {!hasAudioUnlocked && (
        <div className="my-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-300">Desbloquear Áudio do Navegador</p>
              <p className="text-xs text-slate-400">Clique para permitir que as OSTs toquem automaticamente durante a rodada.</p>
            </div>
          </div>
          <button
            onClick={onUnlockAudio}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all"
          >
            Habilitar Áudio
          </button>
        </div>
      )}

      {/* Lista de Jogadores */}
      <div className="my-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Jogadores Conectados ({room.players.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {room.players.map((p) => (
            <div
              key={p.id}
              className={`p-3 rounded-xl border flex items-center justify-between ${
                !p.isConnected
                  ? 'bg-rose-950/20 border-rose-800/40 opacity-70'
                  : p.id === currentPlayer.id
                  ? 'bg-purple-950/30 border-purple-500/40'
                  : 'bg-slate-950/40 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {p.isHost && (
                  <span title="Host da Sala">
                    <Crown className="w-4 h-4 text-amber-400" />
                  </span>
                )}
                <span className="font-semibold text-sm text-slate-200">{p.nickname}</span>
                {p.id === currentPlayer.id && (
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">
                    Você
                  </span>
                )}
              </div>

              <div>
                {!p.isConnected ? (
                  <span className="flex items-center gap-1 text-xs text-rose-400 font-semibold">
                    🔴 Desconectado
                  </span>
                ) : p.isReady ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4" /> Pronto
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">Aguardando...</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ações */}
      <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row gap-3 justify-end">
        <button
          onClick={() => {
            onUnlockAudio();
            onToggleReady();
          }}
          className={`py-3 px-6 rounded-xl font-bold text-sm transition-all ${
            currentPlayer.isReady
              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
          }`}
        >
          {currentPlayer.isReady ? 'Cancelar Pronto' : 'Estou Pronto!'}
        </button>

        {isHost && (
          <button
            onClick={() => {
              onUnlockAudio();
              onStartGame();
            }}
            disabled={room.players.length === 0}
            className="py-3 px-6 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Play className="w-4 h-4 fill-white" />
            Iniciar Partida
          </button>
        )}
      </div>
    </div>
  );
};
