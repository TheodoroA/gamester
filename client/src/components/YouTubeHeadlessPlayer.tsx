import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YouTubeHeadlessPlayerProps {
  youtubeId?: string;
  startTime?: number;
  duration?: number;
  isPlaying?: boolean;
  onError?: (errCode: number) => void;
}

export const YouTubeHeadlessPlayer: React.FC<YouTubeHeadlessPlayerProps> = ({
  youtubeId,
  startTime = 0,
  duration = 30,
  isPlaying = true,
  onError
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const isDestroyedRef = useRef(false);

  useEffect(() => {
    isDestroyedRef.current = false;

    const loadAPI = () => {
      if (window.YT && window.YT.Player) {
        initPlayer();
        return;
      }

      // Se o script ainda não foi adicionado ao DOM
      if (!document.getElementById('youtube-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScript = document.getElementsByTagName('script')[0];
        firstScript.parentNode?.insertBefore(tag, firstScript);
      }

      // Polling e callback global de fallback
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prevCallback?.();
        if (!isDestroyedRef.current) {
          initPlayer();
        }
      };

      const checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkInterval);
          if (!isDestroyedRef.current) {
            initPlayer();
          }
        }
      }, 100);

      setTimeout(() => clearInterval(checkInterval), 10000);
    };

    loadAPI();

    return () => {
      isDestroyedRef.current = true;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, []);

  const initPlayer = () => {
    if (!containerRef.current || playerRef.current || isDestroyedRef.current) return;

    try {
      playerRef.current = new window.YT.Player(containerRef.current, {
        height: '200',
        width: '200',
        videoId: youtubeId || undefined,
        host: 'https://www.youtube.com',
        playerVars: {
          autoplay: 1,
          start: startTime || 0,
          end: (startTime || 0) + duration,
          controls: 0,
          disablekb: 1,
          fs: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (event: any) => {
            playerRef.current = event.target;
            try {
              event.target.unMute();
              event.target.setVolume(100);
              if (youtubeId && isPlaying) {
                event.target.playVideo();
              }
            } catch (err) {
              console.warn('YouTube onReady autoplay notice:', err);
            }
          },
          onStateChange: (event: any) => {
            // Se pausado ou em buffer/cued enquanto deve tocar, força play
            if (isPlaying && (event.data === 2 || event.data === 5)) {
              try {
                event.target.playVideo();
              } catch {
                // ignore
              }
            }
          },
          onError: (event: any) => {
            console.error('YouTube Player Error (código):', event.data);
            onError?.(event.data);
          }
        }
      });
    } catch (err) {
      console.error('Falha ao inicializar YT.Player:', err);
    }
  };

  const playTrack = (videoId: string, start: number) => {
    if (!playerRef.current) return;

    try {
      if (typeof playerRef.current.loadVideoById === 'function') {
        playerRef.current.loadVideoById({
          videoId,
          startSeconds: start,
          endSeconds: start + duration
        });
        playerRef.current.unMute();
        playerRef.current.setVolume(100);
        playerRef.current.playVideo();
      }
    } catch (err) {
      console.warn('Erro ao chamar loadVideoById:', err);
    }
  };

  // Atualiza reprodução quando o youtubeId ou startTime mudar
  useEffect(() => {
    if (!youtubeId || !playerRef.current) return;

    if (isPlaying) {
      playTrack(youtubeId, startTime);
    } else if (typeof playerRef.current.stopVideo === 'function') {
      try {
        playerRef.current.stopVideo();
      } catch {
        // ignore
      }
    }
  }, [youtubeId, startTime, isPlaying]);

  return (
    <div className="headless-audio-player" aria-hidden="true">
      <div ref={containerRef} />
    </div>
  );
};
