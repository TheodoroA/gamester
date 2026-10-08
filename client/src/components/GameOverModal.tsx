import React from 'react';
import { Trophy, Medal, Award, Calendar, RotateCcw } from 'lucide-react';

interface GameOverPodiumEntry {
  rank: number;
  playerId: string;
  nickname: string;
  score: number;
  cardsCount: number;
  timeline: { id: string; gameTitle: string; releaseYear: number }[];
}

interface GameOverModalProps {
  data: {
    winner: GameOverPodiumEntry;
    podium: GameOverPodiumEntry[];
    mode: string;
  };
  onPlayAgain: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ data, onPlayAgain }) => {
  const { winner, podium, mode } = data;

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-amber-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-slate-300" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-sm font-black text-slate-500">#{rank}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center my-8">
        {/* Troféu Principal */}
        <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center mb-4 text-amber-400 animate-bounce">
          <Trophy className="w-10 h-10" />
        </div>

        <span className="text-xs uppercase font-extrabold text-amber-400 tracking-widest mb-1">
          Fim de Jogo • {mode === 'TIMELINE' ? 'Modo Linha do Tempo' : 'Modo Arcade'}
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-white mb-2">
          🏆 Vitória de {winner.nickname}!
        </h2>
        <p className="text-sm text-slate-400 mb-8">
          {mode === 'TIMELINE'
            ? `Completou ${winner.cardsCount} cartas cronológicas com perfeição!`
            : `Alcançou a pontuação máxima de ${winner.score} pontos!`}
        </p>

        {/* Tabela do Pódio */}
        <div className="w-full space-y-3 mb-8">
          {podium.map((entry) => (
            <div
              key={entry.playerId}
              className={`w-full p-4 rounded-2xl border flex flex-col gap-3 text-left transition-all ${
                entry.rank === 1
                  ? 'bg-amber-500/10 border-amber-500/30 shadow-lg shadow-amber-500/5'
                  : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                    {getRankBadge(entry.rank)}
                  </div>
                  <div>
                    <span className="text-base font-extrabold text-white">{entry.nickname}</span>
                    <div className="text-xs text-slate-400">
                      {mode === 'TIMELINE' ? `${entry.cardsCount} cartas` : `${entry.score} pontos`}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs uppercase font-bold text-slate-500">Cartas na Timeline</span>
                  <div className="text-lg font-black text-purple-400">{entry.timeline.length}</div>
                </div>
              </div>

              {/* Prévia da Linha do Tempo do Participante */}
              {entry.timeline.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin">
                  {entry.timeline.map((card) => (
                    <span
                      key={card.id}
                      className="flex-shrink-0 text-[11px] bg-slate-800/90 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700/60 flex items-center gap-1"
                    >
                      <Calendar className="w-2.5 h-2.5 text-amber-400" />
                      <strong className="text-amber-300">{card.releaseYear}</strong>
                      <span className="truncate max-w-[100px] text-slate-200">{card.gameTitle}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Botão de Jogar Novamente */}
        <button
          onClick={onPlayAgain}
          className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold rounded-2xl shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 text-base transition-transform active:scale-95"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Voltar ao Lobby / Jogar Novamente</span>
        </button>
      </div>
    </div>
  );
};
