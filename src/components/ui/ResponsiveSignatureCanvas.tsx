import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { cn } from '@/lib/utils';

export type ResponsiveSignatureCanvasProps = {
  /** When false, resize observers are detached (e.g. dialog closed). */
  active: boolean;
  /** Minimum canvas height in CSS pixels. */
  minHeight?: number;
  className?: string;
};

/**
 * Sizes the canvas bitmap to the container width so touch/mouse coordinates match the drawable
 * area on mobile (fixed width + w-full CSS scales the bitmap and breaks signing on small screens).
 */
export const ResponsiveSignatureCanvas = React.forwardRef<SignatureCanvas, ResponsiveSignatureCanvasProps>(
  function ResponsiveSignatureCanvas({ active, minHeight = 180, className }, ref) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const [dims, setDims] = useState({ w: 320, h: minHeight });

    const measure = useCallback(() => {
      const el = wrapRef.current;
      if (!el || !active) return;
      const raw = el.getBoundingClientRect().width;
      if (raw < 48) return;
      const w = Math.floor(raw);
      const h = Math.max(minHeight, Math.min(280, Math.round(w * 0.42)));
      setDims((d) => (d.w === w && d.h === h ? d : { w, h }));
    }, [active, minHeight]);

    useLayoutEffect(() => {
      if (!active) return;
      measure();
      const t1 = window.setTimeout(measure, 50);
      const t2 = window.setTimeout(measure, 300);
      const ro = new ResizeObserver(() => measure());
      if (wrapRef.current) ro.observe(wrapRef.current);
      window.addEventListener('orientationchange', measure);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        ro.disconnect();
        window.removeEventListener('orientationchange', measure);
      };
    }, [active, measure]);

    return (
      <div
        ref={wrapRef}
        className={cn('w-full', className)}
        style={{ minHeight: `${minHeight}px` }}
      >
        <SignatureCanvas
          key={`${dims.w}x${dims.h}`}
          ref={ref}
          canvasProps={{
            width: dims.w,
            height: dims.h,
            className:
              'block max-w-full rounded border border-input bg-white touch-none select-none [touch-action:none]',
          }}
        />
      </div>
    );
  }
);
