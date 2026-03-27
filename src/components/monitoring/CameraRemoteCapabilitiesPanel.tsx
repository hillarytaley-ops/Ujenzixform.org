import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Mic, Video, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Home } from 'lucide-react';

export interface CameraRemoteCapabilitiesPanelProps {
  supportsPtz: boolean;
  supportsTwoWayAudio: boolean;
}

/**
 * Surfaces PTZ and push-to-talk UI when the camera is marked capable in admin.
 * Actual control requires a future secure gateway (ONVIF / vendor cloud); controls stay disabled until then.
 */
export const CameraRemoteCapabilitiesPanel: React.FC<CameraRemoteCapabilitiesPanelProps> = ({
  supportsPtz,
  supportsTwoWayAudio,
}) => {
  if (!supportsPtz && !supportsTwoWayAudio) {
    return (
      <div className="px-4 pb-4 pt-0 border-t border-slate-700/40">
        <p className="text-xs text-slate-500 mt-3">
          This camera is set up for viewing only. Your admin can enable PTZ or site audio for compatible hardware in
          Admin → Monitoring when those integrations are rolled out.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 pt-3 border-t border-slate-700/40 space-y-4">
      <Alert className="border-amber-500/30 bg-amber-500/5">
        <Video className="h-4 w-4 text-amber-400" />
        <AlertTitle className="text-amber-200 text-sm">Remote control and site audio</AlertTitle>
        <AlertDescription className="text-xs text-slate-400 mt-1">
          These controls will talk to your camera through a secure server path (vendor cloud, ONVIF bridge, or WebRTC).
          Wiring is not active yet; flags below show which capabilities this camera is intended to support.
        </AlertDescription>
      </Alert>

      {supportsPtz && (
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-3">
          <div className="flex items-center gap-2 text-sm text-slate-200 mb-3">
            <Video className="h-4 w-4 text-cyan-400" />
            Pan / tilt / zoom
          </div>
          <div className="flex flex-col items-center gap-1 max-w-[140px] mx-auto">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled
              className="h-9 w-9 p-0 border-slate-600 text-slate-400"
              title="Tilt up (coming soon)"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled
                className="h-9 w-9 p-0 border-slate-600 text-slate-400"
                title="Pan left (coming soon)"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled
                className="h-9 w-9 p-0 border-slate-600 text-slate-400"
                title="Home position (coming soon)"
              >
                <Home className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled
                className="h-9 w-9 p-0 border-slate-600 text-slate-400"
                title="Pan right (coming soon)"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled
              className="h-9 w-9 p-0 border-slate-600 text-slate-400"
              title="Tilt down (coming soon)"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[11px] text-slate-500 text-center mt-3">Zoom +/- will follow the same gateway.</p>
        </div>
      )}

      {supportsTwoWayAudio && (
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-3">
          <div className="flex items-center gap-2 text-sm text-slate-200 mb-2">
            <Mic className="h-4 w-4 text-emerald-400" />
            Talk to site
          </div>
          <Button
            type="button"
            size="sm"
            disabled
            className="w-full border-emerald-500/30 bg-emerald-500/10 text-emerald-200/80 hover:bg-emerald-500/10"
            title="Push-to-talk (coming soon)"
          >
            <Mic className="h-4 w-4 mr-2" />
            Hold to speak (coming soon)
          </Button>
          <p className="text-[11px] text-slate-500 mt-2">
            Requires a microphone-capable browser session and a camera or NVR that exposes two-way audio to the app.
          </p>
        </div>
      )}
    </div>
  );
};
