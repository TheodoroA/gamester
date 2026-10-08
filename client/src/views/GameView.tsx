import React, { useState, useEffect } from 'react';
import { Send, Music, HelpCircle, AlertCircle, Coins, Volume2, VolumeX, WifiOff, Crown } from 'lucide-react';
import { RoomState, Player, roomStore } from '../stores/roomStore.js';
import { RoundTimer } from '../components/RoundTimer.js';
import { PowerButtons } from '../components/PowerButtons.js';
import { YouTubeHeadlessPlayer } from '../components/YouTubeHeadlessPlayer.js';

interface GameViewProps {
  room: RoomState;
  currentPlayer: Player;
  closeNotice: string | null;
  onUsePower: (power: 'REROLL' | 'STEAL' | 'AUTOHIT') => void;
  onSubmitGuess: (gameGuess: string, songGuess?: string, timelineIndex?: number) => void;
}

export const GameView: React.FC<GameViewProps> = ({
  room,
  currentPlayer,
  closeNotice,
  onUsePower,
  onSubmitGuess
}) => {
  const [gameGuess, setGameGuess] = useState('');
  const [songGuess, setSongGuess] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [volume, setVolume] = useState(roomStore.volume);
  const [isMuted, setIsMuted] = useState(roomStore.isMuted);

  const round = room.currentRound;
  if (!round) {
    return <div className="text-center p-8 text-slate-400">Aguardando início da rodada...</div>;
  }

  // Limpa inputs e status de envio a cada nova rodada
  useEffect(() => {
    setGameGuess('');
    setSongGuess('');
    setSubmitted(false);
  }, [round.roundNumber, round.startedAt, round.youtubeId]);

  const activePlayer = room.players.find(p => p.id === round.activePlayerId);
  const isActive = currentPlayer.id === round.activePlayerId;
  const isInterventionPhase = Date.now() <= (round.interventionEndsAt || 0);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    roomStore.setVolume(val);
    setVolume(val);
    setIsMuted(roomStore.isMuted);
  };

  const handleToggleMute = () => {
    roomStore.toggleMute();
    setIsMuted(roomStore.isMuted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameGuess.trim()) return;
    onSubmitGuess(gameGuess.trim(), songGuess.trim() || undefined);
    setSubmitted(true);
  };

  return (
    <div className="max-w-3xl w-full mx-auto p-4 sm:p-6 flex flex-col items-center">
      {/* Player do YouTube Oculto (Headless) - toca durante os 30s de palpite + 10s de revelação */}
      <YouTubeHeadlessPlayer
        youtubeId={round.youtubeId}
        startTime={round.startTime}
        duration={(room.settings.listenSeconds || 30) + 12}
        isPlaying={true}
        volume={volume}
        isMuted={isMuted}
      />

      {/* Barra de Status Superior */}
      <div className="w-full flex flex-wrap justify-between items-center gap-3 mb-4 px-2">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-bold text-slate-400">Rodada #{round.roundNumber || 1}</span>
          {round.isStolen && (
            <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
              🗡️ MÚSICA ROUBADA
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Controle de Volume */}
          <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={handleToggleMute}
              className="text-slate-400 hover:text-purple-400 transition-colors"
              title={isMuted ? "Desmutar" : "Mutar"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-purple-400" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 sm:w-24 accent-purple-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              title={`Volume: ${isMuted ? 0 : volume}%`}
            />
            <span className="text-[10px] font-bold text-slate-400 w-6 text-right">
              {isMuted ? '0%' : `${volume}%`}
            </span>
          </div>

          {/* Seus Recursos */}
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-300">Recursos:</span>
            <span className="text-sm font-black text-amber-400">{currentPlayer.tokens} / 5</span>
          </div>
        </div>
      </div>

      {/* Aviso de Jogadores Desconectados */}
      {room.players.some(p => !p.isConnected) && (
        <div className="w-full mb-3 p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl flex items-center justify-between gap-3 text-rose-300 text-xs">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>
              <strong>{room.players.filter(p => !p.isConnected).map(p => p.nickname).join(', ')}</strong> desconectou-se da partida.
            </span>
          </div>
          <span className="text-[10px] text-rose-400 font-mono bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
            Aguardando reconexão
          </span>
        </div>
      )}

      {/* Relação ao vivo dos jogadores na partida */}
      <div className="w-full mb-4 flex items-center gap-2 overflow-x-auto pb-1 px-1">
        {room.players.map((p) => {
          const isTurn = p.id === round.activePlayerId;
          const isMe = p.id === currentPlayer.id;
          return (
            <div
              key={p.id}
              className={`flex-shrink-0 px-3 py-2 rounded-xl border flex items-center gap-2.5 text-xs transition-all ${
                !p.isConnected
                  ? 'bg-rose-950/20 border-rose-800/40 opacity-70'
                  : isTurn
                  ? 'bg-purple-900/40 border-purple-500 text-white shadow-md shadow-purple-600/20 scale-[1.02]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300'
              }`}
            >
              <div className="relative">
                <span
                  className={`w-2.5 h-2.5 rounded-full block ${
                    p.isConnected ? 'bg-emerald-400' : 'bg-rose-500 animate-pulse'
                  }`}
                  title={p.isConnected ? 'Conectado' : 'Desconectado'}
                />
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1 font-bold leading-tight">
                  <span className="truncate max-w-[90px]">{p.nickname}</span>
                  {isMe && <span className="text-[9px] text-purple-400 font-normal">(Você)</span>}
                  {p.isHost && <Crown className="w-3 h-3 text-amber-400" />}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                  <span className="font-semibold text-purple-300">{p.timeline.length} cartas</span>
                  <span>🪙 {p.tokens}</span>
                  {!p.isConnected && <span className="text-rose-400 font-bold">Caiu</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Temporizador da Rodada */}
      <RoundTimer
        startedAt={round.startedAt}
        interventionEndsAt={round.interventionEndsAt}
        roundEndsAt={round.roundEndsAt}
      />

      {/* Banner de Jogador da Vez */}
      <div className="w-full max-w-xl text-center mb-6 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <span className="text-xs uppercase tracking-widest text-slate-400 font-bold block mb-1">
          Adivinhador da Vez
        </span>
        <div className="text-2xl font-black bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
          {isActive ? '🌟 É A SUA VEZ!' : `🎮 ${activePlayer?.nickname || 'Jogador'}`}
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {isActive
            ? 'Escute o trecho de 30s e digite o jogo de origem abaixo.'
            : 'Escute com atenção! Você pode usar poderes para intervir nos primeiros 15s.'}
        </p>
      </div>

      {/* Botões de Poderes (Reroll, Steal, AutoHit) */}
      <PowerButtons
        playerTokens={currentPlayer.tokens}
        isActivePlayer={isActive}
        isInterventionPhase={isInterventionPhase}
        roundIsStolen={!!round.isStolen}
        onUsePower={onUsePower}
      />

      {/* Alerta Privado "Por Pouco!" */}
      {closeNotice && (
        <div className="w-full max-w-xl my-3 p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl flex items-center gap-3 text-amber-300 text-sm font-bold animate-bounce">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{closeNotice}</span>
        </div>
      )}

      {/* Formulário de Palpites (Habilitado para quem tem a vez) */}
      {isActive ? (
        <form onSubmit={handleSubmit} className="w-full max-w-xl bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Jogo de Origem (Obrigatório)</span>
              <span className="text-[10px] text-slate-500 font-normal">Tolerante a erros leves</span>
            </label>
            <input
              type="text"
              value={gameGuess}
              onChange={(e) => setGameGuess(e.target.value)}
              placeholder="Ex: Chrono Trigger, Zelda Ocarina of Time, Doom..."
              autoFocus
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors text-base font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-purple-400" />
                Nome da Música (Bônus: +1 Recurso 🪙)
              </span>
              <span className="text-[10px] text-amber-400/80 font-normal">Opcional</span>
            </label>
            <input
              type="text"
              value={songGuess}
              onChange={(e) => setSongGuess(e.target.value)}
              placeholder="Ex: Wind Scene, Gerudo Valley, BFG Division..."
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={!gameGuess.trim()}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
            {submitted ? 'Atualizar Palpite' : 'Enviar Resposta'}
          </button>
        </form>
      ) : (
        <div className="w-full max-w-xl p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl text-center text-slate-400 text-sm flex items-center justify-center gap-2">
          <HelpCircle className="w-5 h-5 text-slate-500" />
          Aguardando o palpite de <strong className="text-slate-300">{activePlayer?.nickname}</strong>...
        </div>
      )}
    </div>
  );
};
