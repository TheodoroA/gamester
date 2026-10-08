import React from 'react';
import { CheckCircle, XCircle, Music, Calendar, ArrowRight, Coins } from 'lucide-react';
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
      tags?: string[];
    };
  };
  players: Player[];
  isHost: boolean;
  onNextRound: () => void;
}

export const RevealModal: React.FC<RevealModalProps> = ({
  resolution,
  players,
  isHost,
  onNextRound
}) => {
  const awardedPlayer = players.find(p => p.id === resolution.awardedPlayerId);
  const success = resolution.gameCorrect && resolution.timelineCorrect;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
        {/* Ícone de status */}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
          success ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
        }`}>
          {success ? <CheckCircle className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
        </div>

        <h2 className="text-2xl font-black text-white mb-1">
          {success ? 'Ponto Conquistado!' : 'Não foi dessa vez!'}
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Jogador da vez: <strong className="text-purple-300">{awardedPlayer?.nickname || 'Jogador'}</strong>
        </p>

        {/* Card da música revelada */}
        <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-5 text-left space-y-2.5">
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
        <div className="w-full grid grid-cols-2 gap-2 text-xs mb-5">
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

        {/* Bônus de Nome de Música */}
        {resolution.songTitleCorrect && (
          <div className="w-full bg-amber-500/15 border border-amber-500/30 rounded-xl p-2.5 mb-5 flex items-center justify-center gap-2 text-amber-300 text-xs font-bold animate-pulse">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>Bônus: Nome da Faixa Acertado (+1 Recurso)!</span>
          </div>
        )}

        {/* Ação Próxima Rodada */}
        {isHost ? (
          <button
            onClick={onNextRound}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <span>Próxima Rodada</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
            Aguardando o anfitrião iniciar a próxima rodada...
          </div>
        )}
      </div>
    </div>
  );
};
