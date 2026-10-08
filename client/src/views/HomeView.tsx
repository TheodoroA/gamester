import React, { useState } from 'react';
import { Gamepad2, Play, Users } from 'lucide-react';

interface HomeViewProps {
  onCreateRoom: (nickname: string, mode: 'TIMELINE' | 'ARCADE') => void;
  onJoinRoom: (roomId: string, nickname: string) => void;
  onOpenAdmin: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onCreateRoom, onJoinRoom, onOpenAdmin }) => {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'TIMELINE' | 'ARCADE'>('TIMELINE');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    onCreateRoom(nickname.trim(), mode);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !roomCode.trim()) return;
    onJoinRoom(roomCode.trim().toUpperCase(), nickname.trim());
  };

  return (
    <div className="max-w-md w-full mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
      <div className="text-center mb-8">
        <div className="inline-flex p-3 bg-purple-600/20 text-purple-400 rounded-2xl border border-purple-500/30 mb-3">
          <Gamepad2 className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
          GAMESTER
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Adivinhe as OSTs de games e monte sua linha do tempo!
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          Seu Apelido (Nickname)
        </label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Ex: CloudStrife"
          maxLength={20}
          className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
        />
      </div>

      <div className="space-y-6">
        {/* Criar Sala */}
        <form onSubmit={handleCreate} className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
          <div className="mb-3">
            <label className="block text-xs font-semibold text-slate-400 mb-1">Modo de Jogo</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('TIMELINE')}
                className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                  mode === 'TIMELINE'
                    ? 'bg-purple-600/30 text-purple-300 border-purple-500'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                📜 Linha do Tempo
              </button>
              <button
                type="button"
                onClick={() => setMode('ARCADE')}
                className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                  mode === 'ARCADE'
                    ? 'bg-purple-600/30 text-purple-300 border-purple-500'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                ⚡ Modo Arcade
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {mode === 'TIMELINE'
                ? 'Ordene os jogos cronologicamente na sua linha do tempo (10 cartas para vencer).'
                : 'Adivinhe apenas o nome do jogo diretamente para somar pontos (sem linha do tempo).'}
            </p>
          </div>

          <button
            type="submit"
            disabled={!nickname.trim()}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Play className="w-4 h-4 fill-white" />
            Criar Nova Sala
          </button>
        </form>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-4 text-xs text-slate-500 uppercase font-semibold">ou entre em uma</span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Entrar em Sala */}
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="CÓDIGO (EX: WXYZ)"
            maxLength={6}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-center uppercase tracking-widest font-mono text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={!nickname.trim() || !roomCode.trim()}
            className="px-5 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <Users className="w-4 h-4" />
            Entrar
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={onOpenAdmin}
            className="text-xs text-slate-500 hover:text-slate-300 underline transition-colors"
          >
            Painel Administrativo do Catálogo
          </button>
        </div>
      </div>
    </div>
  );
};
