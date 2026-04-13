import { cn } from '@/lib/utils';
import { sanitizeCameraEmbedHtml } from '@/utils/sanitizeHtml';
import {
  isHlsPlaylistUrl,
  isHttpStreamBlockedByMixedContent,
} from '@/utils/cameraStreamUrlHints';
import { HlsVideoPlayer } from '@/components/monitoring/HlsVideoPlayer';
import { ExternalLink, Video } from 'lucide-react';

export type WallCamera = {
  id: string;
  name: string;
  stream_url?: string | null;
  embed_code?: string | null;
};

type Latency = 'standard' | 'low';

export type WallViewerMode = 'admin' | 'client';

export function MultiCameraWall({
  cameras,
  selectedId,
  onSelectCamera,
  latencyMode,
  className,
  viewerMode = 'admin',
}: {
  cameras: WallCamera[];
  selectedId: string | null;
  onSelectCamera: (id: string) => void;
  latencyMode: Latency;
  className?: string;
  /** Client viewers: no external “open stream” links; show a neutral wait state instead. */
  viewerMode?: WallViewerMode;
}) {
  const withMedia = cameras.filter(
    (c) =>
      String(c.embed_code ?? '').trim() !== '' || String(c.stream_url ?? '').trim() !== ''
  );

  if (withMedia.length === 0) {
    return (
      <div className={cn('rounded-lg border border-slate-700/60 bg-slate-900/50 p-6 text-center text-slate-400 text-sm', className)}>
        {viewerMode === 'client'
          ? 'No live streams are available for this project yet. Please check back later.'
          : 'No cameras with a stream URL or embed code. Add streams in Admin → Monitoring.'}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3',
        className
      )}
    >
      {withMedia.map((cam) => {
        const selected = selectedId === cam.id;
        const rawUrl = String(cam.stream_url ?? '').trim();
        const embed = sanitizeCameraEmbedHtml(String(cam.embed_code ?? ''));

        return (
          <button
            key={cam.id}
            type="button"
            onClick={() => onSelectCamera(cam.id)}
            className={cn(
              'text-left rounded-lg border overflow-hidden bg-black/80 transition-shadow',
              selected
                ? 'border-cyan-400 ring-2 ring-cyan-400/50 shadow-lg shadow-cyan-900/20'
                : 'border-slate-700 hover:border-slate-500'
            )}
          >
            <div className="flex items-center justify-between gap-2 px-2 py-1.5 bg-slate-900/90 border-b border-slate-700/80">
              <span className="truncate text-xs font-medium text-slate-100">{cam.name}</span>
              <Video className="h-3.5 w-3.5 shrink-0 text-cyan-400/80" />
            </div>
            <div className="relative aspect-video bg-black">
              {embed ? (
                <div
                  className="absolute inset-0 overflow-hidden [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:min-h-0 [&_iframe]:border-0"
                  dangerouslySetInnerHTML={{ __html: embed }}
                />
              ) : isHlsPlaylistUrl(rawUrl) ? (
                isHttpStreamBlockedByMixedContent(rawUrl) ? (
                  <div className="absolute inset-0 flex items-center justify-center p-2 text-[11px] text-amber-200 text-center">
                    {viewerMode === 'client'
                      ? 'Waiting for live stream'
                      : 'HTTPS required for wall view'}
                  </div>
                ) : (
                  <div className="absolute inset-0">
                    <HlsVideoPlayer
                      src={rawUrl}
                      compact
                      latencyMode={latencyMode}
                      autoReconnect
                      className="h-full w-full min-h-0 max-h-full"
                    />
                  </div>
                )
              ) : rawUrl ? (
                viewerMode === 'client' ? (
                  <div className="absolute inset-0 flex items-center justify-center p-3 text-center text-[11px] text-slate-400">
                    Waiting for live stream
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2">
                    <span className="text-[11px] text-slate-500 text-center">Open in player / new tab</span>
                    <a
                      href={rawUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open
                    </a>
                  </div>
                )
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[11px] text-slate-500">
                  No stream
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
