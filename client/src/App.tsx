import React, { useState, useEffect } from 'react';
import { roomStore, RoomState, Player } from './stores/roomStore.js';
import { HomeView } from './views/HomeView.js';
import { LobbyView } from './views/LobbyView.js';
import { GameView } from './views/GameView.js';
import { AdminView } from './views/AdminView.js';
import { TimelineBoard } from './components/TimelineBoard.js';
import { RevealModal } from './components/RevealModal.js';
import { GameOverModal } from './components/GameOverModal.js';

export const App: React.FC = () => {
  const [room, setRoom] = useState<RoomState | null>(roomStore.room);
  const [player, setPlayer] = useState<Player | null>(roomStore.player);
  const [error, setError] = useState<string | null>(roomStore.error);
  const [closeNotice, setCloseNotice] = useState<string | null>(roomStore.closeNotice);
  const [hasAudioUnlocked, setHasAudioUnlocked] = useState(roomStore.hasAudioUnlocked);
  const [resolution, setResolution] = useState<any | null>(roomStore.resolution);
  const [gameOver, setGameOver] = useState<any | null>(roomStore.gameOver);
  const [view, setView] = useState<'APP' | 'ADMIN'>('APP');

  // Slot selection for Timeline mode
  const [selectedSlot, setSelectedSlot] = useState<number | null>(0);

  useEffect(() => {
    if (player && player.timeline.length === 0) {
      setSelectedSlot(0);
    }
  }, [player?.timeline?.length, room?.currentRound?.roundNumber]);

  useEffect(() => {
    const unsubscribe = roomStore.subscribe(() => {
      setRoom(roomStore.room);
      setPlayer(roomStore.player);
      setError(roomStore.error);
      setCloseNotice(roomStore.closeNotice);
      setHasAudioUnlocked(roomStore.hasAudioUnlocked);
      setResolution(roomStore.resolution);
      setGameOver(roomStore.gameOver);
    });

    return unsubscribe;
  }, []);

  const handleCreateRoom = async (nickname: string, mode: 'TIMELINE' | 'ARCADE') => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, settings: { mode } })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Erro: ${err.error?.message || 'Falha ao criar sala'}`);
        return;
      }

      const data = await res.json();
      roomStore.initAudioContext();
      roomStore.connect(data.roomId, nickname, data.playerId);
    } catch (e) {
      alert('Erro de conexão com o servidor.');
    }
  };

  const handleJoinRoom = (roomId: string, nickname: string) => {
    roomStore.initAudioContext();
    roomStore.connect(roomId, nickname);
  };

  const handleUnlockAudio = () => {
    roomStore.initAudioContext();
  };

  const handleGuessSubmit = (gameGuess: string, songGuess?: string) => {
    const slot = (player?.timeline.length === 0) ? 0 : (selectedSlot ?? 0);
    roomStore.submitGuess(gameGuess, songGuess, slot);
  };

  if (view === 'ADMIN') {
    return (
      <div className="min-h-screen p-4 flex flex-col justify-center items-center">
        <AdminView onBack={() => setView('APP')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Toast de Erro */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-600/90 text-white font-bold text-xs rounded-xl shadow-lg border border-red-500/50">
          {error}
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col justify-center p-4">
        {!room || !player ? (
          <HomeView
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onOpenAdmin={() => setView('ADMIN')}
          />
        ) : room.status === 'LOBBY' ? (
          <LobbyView
            room={room}
            currentPlayer={player}
            hasAudioUnlocked={hasAudioUnlocked}
            onToggleReady={() => roomStore.toggleReady()}
            onStartGame={() => roomStore.startGame()}
            onUnlockAudio={handleUnlockAudio}
          />
        ) : (
          <GameView
            room={room}
            currentPlayer={player}
            closeNotice={closeNotice}
            onUsePower={(power) => roomStore.usePower(power)}
            onSubmitGuess={handleGuessSubmit}
          />
        )}
      </main>

      {/* Linha do Tempo Fixa no Rodapé durante o Jogo */}
      {room && room.status === 'PLAYING' && player && (
        <TimelineBoard
          timeline={player.timeline}
          targetCardsToWin={room.settings.maxCardsToWin}
          isSelectingSlot={room.currentRound?.activePlayerId === player.id}
          selectedSlot={selectedSlot}
          onSelectSlot={(slot) => setSelectedSlot(slot)}
        />
      )}

      {/* Modal de Revelação da Rodada */}
      {resolution && !gameOver && room && (
        <RevealModal
          resolution={resolution}
          players={room.players}
          isHost={player?.isHost ?? false}
          onNextRound={() => roomStore.nextRound()}
        />
      )}

      {/* Modal de Fim de Jogo */}
      {gameOver && (
        <GameOverModal
          data={gameOver}
          onPlayAgain={() => roomStore.resetGameOver()}
        />
      )}
    </div>
  );
};
