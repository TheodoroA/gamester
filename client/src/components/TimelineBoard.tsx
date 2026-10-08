import React from 'react';
import { TimelineCard as CardType } from '../stores/roomStore.js';
import { TimelineCard } from './TimelineCard.js';
import { PlusCircle, Trophy, Eye } from 'lucide-react';

export interface TimelineBoardProps {
  timeline: CardType[];
  targetCardsToWin?: number;
  isSelectingSlot?: boolean;
  selectedSlot?: number | null;
  onSelectSlot?: (slotIndex: number) => void;
  activePlayerName?: string;
  isViewingActivePlayer?: boolean;
  viewTab?: 'ACTIVE' | 'MINE';
  onToggleViewTab?: (tab: 'ACTIVE' | 'MINE') => void;
  canSwitchTab?: boolean;
}

export const getSlotDescription = (timeline: CardType[], slotIndex?: number | null): string => {
  if (slotIndex === null || slotIndex === undefined) return 'Nenhum slot selecionado';
  const sorted = [...timeline].sort((a, b) => a.releaseYear - b.releaseYear);
  if (sorted.length === 0) return '⭐ 1ª Carta da Linha do Tempo';
  if (slotIndex === 0) return `Antes de ${sorted[0].releaseYear}`;
  if (slotIndex >= sorted.length) return `Após ${sorted[sorted.length - 1].releaseYear}`;
  return `Entre ${sorted[slotIndex - 1].releaseYear} e ${sorted[slotIndex].releaseYear}`;
};

export const TimelineBoard: React.FC<TimelineBoardProps> = ({
  timeline,
  targetCardsToWin = 10,
  isSelectingSlot = false,
  selectedSlot = null,
  onSelectSlot,
  activePlayerName = 'Jogador da Vez',
  isViewingActivePlayer = false,
  viewTab = 'ACTIVE',
  onToggleViewTab,
  canSwitchTab = false
}) => {
  // Ordena cronologicamente
  const sorted = [...timeline].sort((a, b) => a.releaseYear - b.releaseYear);

  return (
    <div className="w-full bg-slate-950/85 border-t border-slate-800 p-4 sticky bottom-0 z-20 backdrop-blur-md">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-300">
                {isViewingActivePlayer
                  ? `Linha do Tempo de ${activePlayerName}`
                  : 'Sua Linha do Tempo'}
              </span>
            </div>

            {canSwitchTab && (
              <div className="flex items-center bg-slate-900 rounded-xl p-0.5 border border-slate-800 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => onToggleViewTab?.('ACTIVE')}
                  className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                    viewTab === 'ACTIVE'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>{activePlayerName} (Ao Vivo)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleViewTab?.('MINE')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    viewTab === 'MINE'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Minha Linha
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
            {isViewingActivePlayer && selectedSlot !== null && selectedSlot !== undefined && (
              <span className="text-[11px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                🎯 {activePlayerName}: {getSlotDescription(timeline, selectedSlot)}
              </span>
            )}
            <div>
              Cartas: <span className="text-purple-400 font-black">{sorted.length}</span> / {targetCardsToWin}
            </div>
          </div>
        </div>

        {/* Linha horizontal rolável */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 px-1 scroll-smooth">
          {sorted.length === 0 ? (
            isSelectingSlot ? (
              <button
                type="button"
                onClick={() => onSelectSlot?.(0)}
                className={`w-full py-5 px-4 rounded-xl border border-dashed flex flex-col items-center justify-center gap-1.5 transition-all ${
                  selectedSlot === 0 || selectedSlot === null
                    ? 'bg-purple-600/25 border-purple-500 text-purple-200 shadow-lg shadow-purple-600/10 ring-2 ring-purple-400'
                    : 'border-slate-700 hover:border-slate-500 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-purple-300">
                  <PlusCircle className="w-4 h-4 text-purple-400" />
                  <span>⭐ Slot Inicial: 1ª Carta da Linha do Tempo (Selecionado)</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Qualquer ano de lançamento iniciará sua linha do tempo após acertar o jogo.
                </span>
              </button>
            ) : isViewingActivePlayer ? (
              <div className="w-full py-5 px-4 rounded-xl border-2 border-dashed border-amber-400/60 bg-amber-500/10 flex flex-col items-center justify-center gap-1">
                <div className="flex items-center gap-2 font-black text-xs text-amber-300">
                  <span>🎯</span>
                  <span>{activePlayerName} está no Slot Inicial (1ª Carta)</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Qualquer ano de lançamento iniciará a linha do tempo dele se acertar o jogo.
                </span>
              </div>
            ) : (
              <div className="py-6 px-4 text-center text-xs text-slate-500 italic w-full border border-dashed border-slate-800 rounded-xl">
                Nenhuma carta conquistada ainda. Acerte o jogo para começar sua linha do tempo!
              </div>
            )
          ) : (
            <>
              {/* Slot inicial (antes do primeiro jogo) */}
              {isSelectingSlot ? (
                <button
                  type="button"
                  onClick={() => onSelectSlot?.(0)}
                  className={`flex-shrink-0 px-3 py-6 rounded-xl border border-dashed flex flex-col items-center justify-center gap-1 transition-all ${
                    selectedSlot === 0
                      ? 'bg-purple-600/30 border-purple-500 text-purple-300 scale-105 ring-2 ring-purple-400'
                      : 'border-slate-700 hover:border-slate-500 text-slate-400'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span className="text-[10px] font-bold">Antes de {sorted[0].releaseYear}</span>
                </button>
              ) : isViewingActivePlayer && selectedSlot === 0 ? (
                <div className="flex-shrink-0 px-3 py-6 rounded-xl border-2 border-dashed border-amber-400 bg-amber-500/20 text-amber-300 flex flex-col items-center justify-center gap-1 shadow-lg shadow-amber-500/20 animate-pulse">
                  <span className="text-xs">🎯</span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-200">Colocando Aqui</span>
                  <span className="text-[10px] font-bold text-amber-300/80">Antes de {sorted[0].releaseYear}</span>
                </div>
              ) : null}

              {sorted.map((card, idx) => (
                <React.Fragment key={card.id}>
                  <TimelineCard card={card} index={idx} />

                  {/* Slot entre cartas */}
                  {isSelectingSlot ? (
                    idx < sorted.length - 1 && (
                      <button
                        type="button"
                        onClick={() => onSelectSlot?.(idx + 1)}
                        className={`flex-shrink-0 px-3 py-6 rounded-xl border border-dashed flex flex-col items-center justify-center gap-1 transition-all ${
                          selectedSlot === idx + 1
                            ? 'bg-purple-600/30 border-purple-500 text-purple-300 scale-105 ring-2 ring-purple-400'
                            : 'border-slate-700 hover:border-slate-500 text-slate-400'
                        }`}
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span className="text-[10px] font-bold">
                          {sorted[idx].releaseYear} a {sorted[idx + 1].releaseYear}
                        </span>
                      </button>
                    )
                  ) : isViewingActivePlayer && selectedSlot === idx + 1 && idx < sorted.length - 1 ? (
                    <div className="flex-shrink-0 px-3 py-6 rounded-xl border-2 border-dashed border-amber-400 bg-amber-500/20 text-amber-300 flex flex-col items-center justify-center gap-1 shadow-lg shadow-amber-500/20 animate-pulse">
                      <span className="text-xs">🎯</span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-200">Colocando Aqui</span>
                      <span className="text-[10px] font-bold text-amber-300/80">
                        {sorted[idx].releaseYear} a {sorted[idx + 1].releaseYear}
                      </span>
                    </div>
                  ) : null}
                </React.Fragment>
              ))}

              {/* Slot final (após o último jogo) */}
              {isSelectingSlot ? (
                <button
                  type="button"
                  onClick={() => onSelectSlot?.(sorted.length)}
                  className={`flex-shrink-0 px-3 py-6 rounded-xl border border-dashed flex flex-col items-center justify-center gap-1 transition-all ${
                    selectedSlot === sorted.length
                      ? 'bg-purple-600/30 border-purple-500 text-purple-300 scale-105 ring-2 ring-purple-400'
                      : 'border-slate-700 hover:border-slate-500 text-slate-400'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span className="text-[10px] font-bold">Após {sorted[sorted.length - 1].releaseYear}</span>
                </button>
              ) : isViewingActivePlayer && selectedSlot === sorted.length ? (
                <div className="flex-shrink-0 px-3 py-6 rounded-xl border-2 border-dashed border-amber-400 bg-amber-500/20 text-amber-300 flex flex-col items-center justify-center gap-1 shadow-lg shadow-amber-500/20 animate-pulse">
                  <span className="text-xs">🎯</span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-200">Colocando Aqui</span>
                  <span className="text-[10px] font-bold text-amber-300/80">
                    Após {sorted[sorted.length - 1].releaseYear}
                  </span>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

