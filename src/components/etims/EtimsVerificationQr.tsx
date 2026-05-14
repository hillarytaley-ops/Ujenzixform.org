/**
 * KRA eTIMS receipt verification QR — encodes the official verification URL.
 */

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ExternalLink, Loader2, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function isHttpsOrHttpUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

async function qrPngDataUrl(text: string, size: number): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#0f172a', light: '#ffffff' },
  });
}

export type EtimsVerificationQrProps = {
  verificationUrl: string;
  className?: string;
  /** QR image width in px — default 120 (receipt standard) */
  size?: number;
  /** Receipt footer: compact, no card chrome */
  variant?: 'card' | 'footer';
};

export const EtimsVerificationQr: React.FC<EtimsVerificationQrProps> = ({
  verificationUrl,
  className,
  size = 120,
  variant = 'card',
}) => {
  const { toast } = useToast();
  const url = verificationUrl.trim();
  const valid = url.length > 0 && isHttpsOrHttpUrl(url);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isFooter = variant === 'footer';

  useEffect(() => {
    if (!valid) {
      setDataUrl(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setError(null);
    void qrPngDataUrl(url, size)
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch((e) => {
        if (!cancelled) {
          setDataUrl(null);
          setError(e instanceof Error ? e.message : String(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [url, size, valid]);

  if (!valid) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy link' });
    }
  };

  return (
    <div
      className={cn(
        isFooter
          ? 'flex flex-col items-center text-center'
          : 'flex flex-col items-center rounded-lg border border-border bg-white px-4 py-4 text-center dark:bg-slate-950',
        className,
      )}
    >
      {!isFooter ? (
        <>
          <p className="text-sm font-semibold text-foreground">Scan QR code to verify receipt</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Official KRA eTIMS verification</p>
        </>
      ) : null}

      <div className={cn('flex items-center justify-center', isFooter ? 'my-2' : 'my-3')}>
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="KRA eTIMS verification QR code"
            width={size}
            height={size}
            className="rounded-sm border border-slate-200 bg-white p-0.5"
          />
        ) : error ? (
          <div
            className="flex flex-col items-center justify-center gap-1 rounded border border-dashed border-amber-400/60 bg-amber-50/50 text-[10px] text-amber-900"
            style={{ width: size, height: size }}
          >
            <QrCode className="h-5 w-5 opacity-60" />
            QR unavailable
          </div>
        ) : (
          <div
            className="flex items-center justify-center rounded border border-border bg-muted/30"
            style={{ width: size, height: size }}
          >
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <div className={cn('w-full', isFooter ? 'max-w-[280px]' : 'max-w-sm space-y-2')}>
        <p className="text-left text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Link</p>
        <p className="break-all text-left font-mono text-[9px] leading-relaxed text-foreground">{url}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[10px]" onClick={() => void copyLink()}>
            Copy link
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 gap-1 px-2 text-[10px]"
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="h-3 w-3" />
            Open on KRA
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EtimsVerificationQr;
