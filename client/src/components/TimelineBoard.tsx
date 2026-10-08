import React from 'react';
import { TimelineCard as CardType } from '../stores/roomStore.js';
import { TimelineCard } from './TimelineCard.js';
import { PlusCircle, Trophy } from 'lucide-react';

interface TimelineBoardProps {
  timeline: CardType[];
  targetCardsToWin?: number;
  isSelectingSlot?: boolean;
  selectedSlot?: number | null;
  onSelectSlot?: (slotIndex: number) => void;
}

export const TimelineBoard: React.FC<TimelineBoardProps> = ({
  timeline,
  targetCardsToWin = 10,
  isSelectingSlot = false,
  selectedSlot = null,
  onSelectSlot
}) => {
  // Ordena cronologicamente
  const sorted = [...timeline].sort((a, b) => a.releaseYear - b.releaseYear);

  return (
    <div className="w-full bg-slate-950/80 border-t border-slate-800 p-4 sticky bottom-0 z-20 backdrop-blur-md">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-300">
              Sua Linha do Tempo
            </span>
          </div>

          <div className="text-xs font-bold text-slate-400">
            Cartas: <span className="text-purple-400 font-black">{sorted.length}</span> / {targetCardsToWin}
          </div>
        </div>

        {/* Linha horizontal rolável */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 px-1 scroll-smooth">
          {sorted.length === 0 ? (
            <div className="py-6 px-4 text-center text-xs text-slate-500 italic w-full border border-dashed border-slate-800 rounded-xl">
              Nenhuma carta conquistada ainda. Acerte o jogo e o período para começar sua linha do tempo!
            </div>
          ) : (
            <>
              {/* Slot inicial (antes do primeiro jogo) */}
              {isSelectingSlot && (
                <button
                  onClick={() => onSelectSlot?.(0)}
                  className={`flex-shrink-0 px-3 py-6 rounded-xl border border-dashed flex flex-col items-center justify-center gap-1 transition-all ${
                    selectedSlot === 0
                      ? 'bg-purple-600/30 border-purple-500 text-purple-300 scale-105'
                      : 'border-slate-700 hover:border-slate-500 text-slate-400'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span className="text-[10px] font-bold">Antes de {sorted[0].releaseYear}</span>
                </button>
              )}

              {sorted.map((card, idx) => (
                <React.Fragment key={card.id}>
                  <TimelineCard card={card} index={idx} />

                  {/* Slot entre cartas */}
                  {isSelectingSlot && idx < sorted.length - 1 && (
                    <button
                      onClick={() => onSelectSlot?.(idx + 1)}
                      className={`flex-shrink-0 px-3 py-6 rounded-xl border border-dashed flex flex-col items-center justify-center gap-1 transition-all ${
                        selectedSlot === idx + 1
                          ? 'bg-purple-600/30 border-purple-500 text-purple-300 scale-105'
                          : 'border-slate-700 hover:border-slate-500 text-slate-400'
                      }`}
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span className="text-[10px] font-bold">
                        {sorted[idx].releaseYear} a {sorted[idx + 1].releaseYear}
                      </span>
                    </button>
                  )}
                </React.Fragment>
              ))}

              {/* Slot final (após o último jogo) */}
              {isSelectingSlot && (
                <button
                  onClick={() => onSelectSlot?.(sorted.length)}
                  className={`flex-shrink-0 px-3 py-6 rounded-xl border border-dashed flex flex-col items-center justify-center gap-1 transition-all ${
                    selectedSlot === sorted.length
                      ? 'bg-purple-600/30 border-purple-500 text-purple-300 scale-105'
                      : 'border-slate-700 hover:border-slate-500 text-slate-400'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span className="text-[10px] font-bold">Após {sorted[sorted.length - 1].releaseYear}</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
