import React, { useState, useEffect } from 'react';

interface RoundTimerProps {
  startedAt: number;
  interventionEndsAt: number;
  roundEndsAt: number;
  onInterventionEnd?: () => void;
  onRoundEnd?: () => void;
}

export const RoundTimer: React.FC<RoundTimerProps> = ({
  startedAt,
  interventionEndsAt,
  roundEndsAt
}) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const totalDuration = roundEndsAt - startedAt;
  const elapsed = Math.max(0, now - startedAt);
  const remaining = Math.max(0, roundEndsAt - now);
  const remainingSeconds = Math.ceil(remaining / 1000);

  const isIntervention = now <= interventionEndsAt;
  const interventionRemaining = Math.max(0, Math.ceil((interventionEndsAt - now) / 1000));

  const progressPercent = Math.min(100, (elapsed / totalDuration) * 100);

  return (
    <div className="w-full max-w-xl mx-auto mb-6 bg-slate-900/80 p-4 rounded-xl border border-slate-800 shadow-lg">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          {isIntervention ? (
            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
              ⚡ JANELA DE INTERVENÇÃO: {interventionRemaining}s
            </span>
          ) : (
            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
              🎯 FASE DE ADIVINHAÇÃO
            </span>
          )}
        </div>
        <div className="text-xl font-black tabular-nums text-slate-200">
          {remainingSeconds}s
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden relative">
        <div
          className={`h-full transition-all duration-100 ${
            isIntervention
              ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
              : 'bg-gradient-to-r from-purple-500 to-indigo-400'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
        {/* Marcador dos 15 segundos */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-400/60 z-10"
          style={{ left: `${((interventionEndsAt - startedAt) / totalDuration) * 100}%` }}
          title="Fim da Janela de Intervenção (15s)"
        />
      </div>
    </div>
  );
};
