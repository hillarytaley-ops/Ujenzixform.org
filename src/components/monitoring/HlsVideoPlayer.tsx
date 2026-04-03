import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface HlsVideoPlayerProps {
  src: string;
  className?: string;
  /** Called when playback cannot be recovered (CORS, 404, unsupported, fatal Hls error). */
  onFatalError?: () => void;
}

/**
 * Plays HLS (.m3u8) in the browser: Safari uses native HLS; Chrome/Firefox/Edge use hls.js.
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
      video.addEventListener('error', onErr);
      return () => {
        destroyed = true;
        video.removeEventListener('error', onErr);
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
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 45,
        maxMaxBufferLength: 120,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
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
