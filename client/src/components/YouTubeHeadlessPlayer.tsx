import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
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
  const isApiReady = useRef(false);

  useEffect(() => {
    // 1. Carrega o script da API do YouTube se ainda não foi injetado
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        isApiReady.current = true;
        initPlayer();
      };
    } else {
      isApiReady.current = true;
      initPlayer();
    }

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  const initPlayer = () => {
    if (!containerRef.current || playerRef.current) return;

    playerRef.current = new window.YT.Player(containerRef.current, {
      height: '1',
      width: '1',
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        playsinline: 1
      },
      events: {
        onReady: () => {
          if (youtubeId && isPlaying) {
            playTrack(youtubeId, startTime);
          }
        },
        onError: (event: any) => {
          console.warn('Erro na reprodução do YouTube:', event.data);
          onError?.(event.data);
        }
      }
    });
  };

  const playTrack = (videoId: string, start: number) => {
    if (playerRef.current && playerRef.current.loadVideoById) {
      playerRef.current.loadVideoById({
        videoId,
        startSeconds: start,
        endSeconds: start + duration
      });
      playerRef.current.playVideo();
    }
  };

  // Atualiza reprodução quando o youtubeId ou startTime mudar
  useEffect(() => {
    if (youtubeId && playerRef.current && isPlaying) {
      playTrack(youtubeId, startTime);
    } else if (!isPlaying && playerRef.current && playerRef.current.stopVideo) {
      playerRef.current.stopVideo();
    }
  }, [youtubeId, startTime, isPlaying]);

  return (
    <div className="headless-audio-player" aria-hidden="true">
      <div ref={containerRef} />
    </div>
  );
};
