import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface HlsVideoPlayerProps {
  src: string;
  className?: string;
  /** Smaller min-height for grid cells. */
  compact?: boolean;
  /**
   * Low-latency HLS tuning (needs LL-HLS / short parts from the server, e.g. MediaMTX lowLatency).
   * Standard HLS (mpegts) may not benefit; use only when your playlist is LL-HLS.
   */
  latencyMode?: 'standard' | 'low';
  /** Retry after fatal network/media errors (default true). */
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  /** Called when playback cannot be recovered (CORS, 404, unsupported, fatal after retries). */
  onFatalError?: () => void;
}

/**
 * Plays HLS (.m3u8): Safari native HLS; Chrome/Edge/Firefox use hls.js (bundled).
 * Optional low-latency profile + automatic reconnect for flaky tunnels / LTE.
 */
export function HlsVideoPlayer({
  src,
  className,
  compact = false,
  latencyMode = 'standard',
  autoReconnect = true,
  maxReconnectAttempts = 10,
  onFatalError,
}: HlsVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onFatalRef = useRef(onFatalError);
  onFatalRef.current = onFatalError;
  const reconnectCountRef = useRef(0);

  useEffect(() => {
    reconnectCountRef.current = 0;
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let destroyed = false;
    let hls: import('hls.js').default | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let mediaRecoverAttempts = 0;

    const fail = () => {
      if (!destroyed) onFatalRef.current?.();
    };

    const native =
      video.canPlayType('application/vnd.apple.mpegurl') !== '' ||
      video.canPlayType('application/x-mpegURL') !== '';

    if (native) {
      video.src = src;
      const onErr = () => fail();
      const onLoaded = () => void video.play().catch(() => {});
      video.addEventListener('error', onErr);
      video.addEventListener('loadedmetadata', onLoaded);
      return () => {
        destroyed = true;
        video.removeEventListener('error', onErr);
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeAttribute('src');
        video.load();
      };
    }

    void import('hls.js').then(({ default: Hls }) => {
      if (destroyed || !videoRef.current) return;
      if (!Hls.isSupported()) {
        fail();
        return;
      }
      const srcLower = src.trim().toLowerCase();
      const ngrokTunnel =
        srcLower.includes('ngrok-free.') ||
        srcLower.includes('ngrok.app') ||
        srcLower.includes('ngrok.io');

      const low = latencyMode === 'low';
      const hlsInstance = new Hls({
        enableWorker: true,
        lowLatencyMode: low,
        maxBufferLength: low ? 8 : 45,
        maxMaxBufferLength: low ? 20 : 120,
        ...(low
          ? {
              liveSyncDurationCount: 3,
              liveMaxLatencyDurationCount: 8,
              maxLiveSyncPlaybackRate: 1.5,
              backBufferLength: 30,
            }
          : {}),
        ...(ngrokTunnel
          ? {
              xhrSetup: (xhr: XMLHttpRequest) => {
                xhr.setRequestHeader('ngrok-skip-browser-warning', 'true');
              },
            }
          : {}),
      });
      hls = hlsInstance;
      hlsInstance.loadSource(src);
      hlsInstance.attachMedia(video);
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        reconnectCountRef.current = 0;
        mediaRecoverAttempts = 0;
        void video.play().catch(() => {});
      });
      hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (!autoReconnect) {
          hlsInstance.destroy();
          hls = null;
          fail();
          return;
        }
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          reconnectCountRef.current += 1;
          if (reconnectCountRef.current <= maxReconnectAttempts) {
            const delay = Math.min(30_000, Math.round(800 * Math.pow(1.35, reconnectCountRef.current)));
            reconnectTimer = setTimeout(() => {
              if (destroyed) return;
              try {
                hlsInstance.startLoad();
              } catch {
                hlsInstance.destroy();
                hls = null;
                fail();
              }
            }, delay);
            return;
          }
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoverAttempts < 4) {
          mediaRecoverAttempts += 1;
          try {
            hlsInstance.recoverMediaError();
            return;
          } catch {
            /* fall through */
          }
        }
        hlsInstance.destroy();
        hls = null;
        fail();
      });
    }).catch(() => fail());

    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      hls?.destroy();
      hls = null;
      video.removeAttribute('src');
      video.load();
    };
  }, [src, latencyMode, autoReconnect, maxReconnectAttempts]);

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      className={cn(
        'w-full h-full object-contain bg-black',
        compact ? 'min-h-[120px] max-h-[220px]' : 'min-h-[min(48vh,440px)]',
        className
      )}
    />
  );
}
