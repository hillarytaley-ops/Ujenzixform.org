import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface HlsVideoPlayerProps {
  src: string;
  className?: string;
  /** Called when playback cannot be recovered (CORS, 404, unsupported, fatal Hls error). */
  onFatalError?: () => void;
}

/**
 * Plays HLS (.m3u8) in the browser: Safari uses native HLS; Chrome/Firefox/Edge use **hls.js**
 * from the npm package (same role as a CDN script — bundled by Vite, no extra &lt;script&gt; tag).
 * The playlist host must send CORS headers allowing your site origin, or the player will fail.
 */
export function HlsVideoPlayer({ src, className, onFatalError }: HlsVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onFatalRef = useRef(onFatalError);
  onFatalRef.current = onFatalError;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let destroyed = false;
    let hls: import('hls.js').default | null = null;

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
      hls = new Hls({
        enableWorker: true,
        // Standard HLS (e.g. MediaMTX `hlsVariant: mpegts`) — LL-HLS needs lowLatencyMode + LL parts.
        lowLatencyMode: false,
        maxBufferLength: 45,
        maxMaxBufferLength: 120,
        // ngrok free tier returns an interstitial HTML page unless this header is set — breaks hls.js fetches.
        ...(ngrokTunnel
          ? {
              xhrSetup: (xhr: XMLHttpRequest) => {
                xhr.setRequestHeader('ngrok-skip-browser-warning', 'true');
              },
            }
          : {}),
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        void video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        hls?.destroy();
        hls = null;
        fail();
      });
    }).catch(() => fail());

    return () => {
      destroyed = true;
      hls?.destroy();
      hls = null;
      video.removeAttribute('src');
      video.load();
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      className={cn('w-full h-full min-h-[min(48vh,440px)] object-contain bg-black', className)}
    />
  );
}
