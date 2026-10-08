import React from 'react';
import { RefreshCw, Swords, Zap } from 'lucide-react';

interface PowerButtonsProps {
  playerTokens: number;
  isActivePlayer: boolean;
  isInterventionPhase: boolean;
  roundIsStolen: boolean;
  onUsePower: (power: 'REROLL' | 'STEAL' | 'AUTOHIT') => void;
}

export const PowerButtons: React.FC<PowerButtonsProps> = ({
  playerTokens,
  isActivePlayer,
  isInterventionPhase,
  roundIsStolen,
  onUsePower
}) => {
  const canReroll = playerTokens >= 1 && isInterventionPhase && !roundIsStolen;
  const canSteal = playerTokens >= 2 && isInterventionPhase && !isActivePlayer && !roundIsStolen;
  const canAutoHit = playerTokens >= 3 && isActivePlayer;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 my-4">
      {/* 1. Trocar Música */}
      <button
        onClick={() => onUsePower('REROLL')}
        disabled={!canReroll}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all border shadow-md ${
          canReroll
            ? 'bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border-blue-500/50 hover:scale-105 active:scale-95'
            : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
        }`}
        title="Troca a música atual por outra aleatória (primeiros 15s)"
      >
        <RefreshCw className="w-4 h-4" />
        <span>Trocar Música</span>
        <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">1 🪙</span>
      </button>

      {/* 2. Roubar Música */}
      <button
        onClick={() => onUsePower('STEAL')}
        disabled={!canSteal}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all border shadow-md ${
          canSteal
            ? 'bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border-amber-500/50 hover:scale-105 active:scale-95'
            : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
        }`}
        title="Rouba a vez da música do jogador atual para você pontuar (primeiros 15s)"
      >
        <Swords className="w-4 h-4" />
        <span>Roubar Música</span>
        <span className="px-2 py-0.5 text-xs bg-amber-500 text-white rounded-full">2 🪙</span>
      </button>

      {/* 3. Acerto Automático */}
      <button
        onClick={() => onUsePower('AUTOHIT')}
        disabled={!canAutoHit}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all border shadow-md ${
          canAutoHit
            ? 'bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border-emerald-500/50 hover:scale-105 active:scale-95'
            : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
        }`}
        title="Acerta o jogo e a linha do tempo automaticamente sem risco (apenas jogador da vez)"
      >
        <Zap className="w-4 h-4" />
        <span>Auto-Acerto</span>
        <span className="px-2 py-0.5 text-xs bg-emerald-500 text-white rounded-full">3 🪙</span>
      </button>
    </div>
  );
};
