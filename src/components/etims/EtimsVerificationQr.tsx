/**
 * KRA eTIMS receipt verification QR — encodes the official verification URL
 * (e.g. etims-sbx.kra.go.ke/.../indexEtimsReceiptData?Data=...).
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
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#0f172a', light: '#ffffff' },
  });
}

export type EtimsVerificationQrProps = {
  verificationUrl: string;
  className?: string;
  /** QR image width in px (default 200) */
  size?: number;
  compact?: boolean;
};

export const EtimsVerificationQr: React.FC<EtimsVerificationQrProps> = ({
  verificationUrl,
  className,
  size = 200,
  compact = false,
}) => {
  const { toast } = useToast();
  const url = verificationUrl.trim();
  const valid = url.length > 0 && isHttpsOrHttpUrl(url);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      toast({ title: 'Link copied', description: 'Paste in a browser to verify on KRA eTIMS.' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy link' });
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-lg border border-border bg-white px-4 text-center dark:bg-slate-950',
        compact ? 'py-4' : 'py-5',
        className,
      )}
    >
      <p className={cn('font-semibold text-foreground', compact ? 'text-xs' : 'text-sm')}>
        Scan QR code to verify receipt
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">Official KRA eTIMS verification</p>

      <div className="relative my-4 flex items-center justify-center">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="KRA eTIMS verification QR code"
            width={size}
            height={size}
            className="rounded-md border border-border bg-white p-1 shadow-sm"
          />
        ) : error ? (
          <div className="flex h-[120px] w-[120px] flex-col items-center justify-center gap-1 rounded-md border border-dashed border-amber-400/60 bg-amber-50/50 text-[10px] text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            <QrCode className="h-6 w-6 opacity-60" />
            QR unavailable
          </div>
        ) : (
          <div
            className="flex items-center justify-center rounded-md border border-border bg-muted/30"
            style={{ width: size, height: size }}
          >
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="w-full max-w-md space-y-2">
        <p className="text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Link</p>
        <p className="break-all rounded-md border bg-muted/30 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-foreground">
          {url}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => void copyLink()}>
            Copy link
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open on KRA
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EtimsVerificationQr;
