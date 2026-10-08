import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Music, Calendar, Coins, Clock } from 'lucide-react';
import { Player } from '../stores/roomStore.js';

interface RevealModalProps {
  resolution: {
    gameCorrect: boolean;
    timelineCorrect: boolean;
    songTitleCorrect: boolean;
    tokensEarned: number;
    tokensSpent: number;
    awardedPlayerId: string;
    song: {
      gameTitle: string;
      releaseYear: number;
      songTitle?: string;
      youtubeId?: string;
      tags?: string[];
    };
  };
  players: Player[];
  isHost?: boolean;
  mode?: 'TIMELINE' | 'ARCADE';
  onNextRound?: () => void;
}

export const RevealModal: React.FC<RevealModalProps> = ({
  resolution,
  players,
  mode = 'TIMELINE'
}) => {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    setCountdown(10);
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resolution]);

  const awardedPlayer = players.find(p => p.id === resolution.awardedPlayerId);
  const isArcade = mode === 'ARCADE';
  const success = isArcade ? resolution.gameCorrect : (resolution.gameCorrect && resolution.timelineCorrect);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center max-h-[90vh] overflow-y-auto">
        {/* Thumbnail do YouTube do Jogo */}
        {resolution.song.youtubeId && (
          <div className="w-full h-44 rounded-2xl overflow-hidden mb-4 relative shadow-lg border border-slate-800 bg-black flex-shrink-0 group">
            <img
              src={`https://img.youtube.com/vi/${resolution.song.youtubeId}/hqdefault.jpg`}
              alt={resolution.song.gameTitle}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${resolution.song.youtubeId}/mqdefault.jpg`;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs text-slate-300">
              <span className="bg-black/70 px-2 py-0.5 rounded-md backdrop-blur font-bold text-[11px] text-white">
                🎮 {resolution.song.gameTitle}
              </span>
              <span className="bg-purple-600/80 px-2 py-0.5 rounded-md backdrop-blur font-mono text-[11px] text-white font-bold">
                {resolution.song.releaseYear}
              </span>
            </div>
          </div>
        )}

        {/* Ícone de status */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
          success ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
        }`}>
          {success ? <CheckCircle className="w-7 h-7" /> : <XCircle className="w-7 h-7" />}
        </div>

        <h2 className="text-2xl font-black text-white mb-1">
          {success ? (isArcade ? '+2 Pontos Conquistados!' : 'Ponto Conquistado!') : 'Não foi dessa vez!'}
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Jogador da vez: <strong className="text-purple-300">{awardedPlayer?.nickname || 'Jogador'}</strong>
        </p>

        {/* Card da música revelada */}
        <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-4 text-left space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Jogo Revelado</span>
            <span className="flex items-center gap-1 text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              <Calendar className="w-3 h-3" />
              {resolution.song.releaseYear}
            </span>
          </div>

          <div className="text-xl font-black text-white leading-tight">
            {resolution.song.gameTitle}
          </div>

          {resolution.song.songTitle && (
            <div className="flex items-center gap-1.5 text-xs text-purple-300 pt-1 border-t border-slate-800/80">
              <Music className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
              <span className="truncate">Faixa: <strong>{resolution.song.songTitle}</strong></span>
            </div>
          )}

          {resolution.song.tags && resolution.song.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {resolution.song.tags.map(tag => (
                <span key={tag} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-medium">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Resumo do Palpite */}
        {isArcade ? (
          <div className="w-full mb-4">
            <div className={`p-3.5 rounded-xl border flex items-center justify-between px-4 text-xs ${
              resolution.gameCorrect
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}>
              <span className="text-[11px] uppercase text-slate-400 font-bold">Palpite do Jogo</span>
              <span className="font-extrabold text-sm">
                {resolution.gameCorrect ? 'ACERTOU (+2 Pontos) 🏆' : 'ERROU (0 Pontos)'}
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full grid grid-cols-2 gap-2 text-xs mb-4">
            <div className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 ${
              resolution.gameCorrect
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}>
              <span className="text-[10px] uppercase text-slate-400 font-bold">Jogo</span>
              <span className="font-extrabold">{resolution.gameCorrect ? 'ACERTOU' : 'ERROU'}</span>
            </div>

            <div className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 ${
              resolution.timelineCorrect
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}>
              <span className="text-[10px] uppercase text-slate-400 font-bold">Linha do Tempo</span>
              <span className="font-extrabold">{resolution.timelineCorrect ? 'CORRETO' : 'INCORRETO'}</span>
            </div>
          </div>
        )}

        {/* Bônus de Nome de Música */}
        {resolution.songTitleCorrect && (
          <div className="w-full bg-amber-500/15 border border-amber-500/30 rounded-xl p-2.5 mb-4 flex items-center justify-center gap-2 text-amber-300 text-xs font-bold animate-pulse">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>
              {isArcade
                ? 'Bônus: Nome da Faixa Acertado (+1 Ponto 🏆 e +1 Recurso 🪙)!'
                : 'Bônus: Nome da Faixa Acertado (+1 Recurso)!'}
            </span>
          </div>
        )}

        {/* Barra de Progresso do Auto-Avanço (10s) */}
        <div className="w-full mb-4 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              Próxima rodada automática
            </span>
            <span className="font-mono font-black text-purple-300">{countdown}s</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${(countdown / 10) * 100}%` }}
            />
          </div>
        </div>

        {/* Status de Sincronização da Próxima Rodada (10s obrigatórios para sincronizar multiplayer) */}
        <div className="w-full py-3.5 px-4 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-center gap-2.5 text-purple-300 text-xs font-bold shadow-inner">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
          <span>Próxima rodada iniciando em {countdown}s...</span>
        </div>
      </div>
    </div>
  );
};
