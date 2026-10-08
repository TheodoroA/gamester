import React from 'react';
import { Calendar, Disc } from 'lucide-react';
import { TimelineCard as CardType } from '../stores/roomStore.js';

interface TimelineCardProps {
  card: CardType;
  index: number;
}

export const TimelineCard: React.FC<TimelineCardProps> = ({ card }) => {
  return (
    <div className="flex-shrink-0 w-44 p-3 bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/80 rounded-xl shadow-lg relative group hover:border-purple-500/60 transition-all hover:-translate-y-1">
      {/* Ano em Destaque */}
      <div className="flex items-center justify-between mb-2">
        <span className="px-2 py-0.5 rounded text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {card.releaseYear}
        </span>
        <Disc className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
      </div>

      {/* Título do Jogo */}
      <h4 className="font-bold text-sm text-slate-100 line-clamp-2 mb-1" title={card.gameTitle}>
        {card.gameTitle}
      </h4>

      {/* Música se cadastrada */}
      {card.songTitle && (
        <p className="text-[11px] text-slate-400 truncate" title={card.songTitle}>
          🎵 {card.songTitle}
        </p>
      )}
    </div>
  );
};
