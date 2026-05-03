import { useEffect, useState, useMemo } from "react";
import QRCode from "qrcode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, QrCode, ExternalLink } from "lucide-react";

/** Production host for printable QR codes; override for local testing via VITE_QR_LINK_BASE_URL. */
const DEFAULT_QR_LINK_BASE = "https://www.ujenzixform.org";

function getQrLinkBase(): string {
  const fromEnv = (import.meta.env.VITE_QR_LINK_BASE_URL as string | undefined)?.trim().replace(/\/$/, "");
  return fromEnv || DEFAULT_QR_LINK_BASE;
}

type QrEntry = {
  id: string;
  title: string;
  path: string;
  filename: string;
  blurb: string;
};

const QR_ENTRIES: QrEntry[] = [
  {
    id: "auth",
    title: "Auth",
    path: "/auth",
    filename: "ujenzixform-qr-auth.png",
    blurb: "Sign in or sign up (tabs on the page).",
  },
  {
    id: "supplier-registration",
    title: "Supplier registration",
    path: "/register/scan/supplier",
    filename: "ujenzixform-qr-supplier-registration.png",
    blurb: "Not signed in → auth first; signed in → supplier form.",
  },
  {
    id: "private-builder-registration",
    title: "Private client registration",
    path: "/register/scan/private-builder",
    filename: "ujenzixform-qr-private-client-registration.png",
    blurb: "Not signed in → auth first; signed in → private client form.",
  },
  {
    id: "professional-builder-registration",
    title: "CO/Contractor registration",
    path: "/register/scan/professional-builder",
    filename: "ujenzixform-qr-professional-builder-registration.png",
    blurb: "Not signed in → auth first; signed in → CO/contractor form.",
  },
];

async function qrPngDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 240,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.rel = "noopener";
  a.click();
}

export function AuthPageQrDownloads() {
  const base = useMemo(() => getQrLinkBase(), []);
  const [qrs, setQrs] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    void (async () => {
      try {
        const pairs = await Promise.all(
          QR_ENTRIES.map(async (e) => {
            const url = `${base}${e.path}`;
            const png = await qrPngDataUrl(url);
            return [e.id, png] as const;
          })
        );
        if (cancelled) return;
        const next: Record<string, string | null> = {};
        for (const [id, png] of pairs) next[id] = png;
        setQrs(next);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not generate QR codes");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [base]);

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <QrCode className="h-5 w-5 text-cyan-400" />
          Public links — downloadable QR codes
        </CardTitle>
        <CardDescription className="text-gray-400">
          Codes use <code className="text-cyan-200/90">{base}</code> for production scans. Registration QRs use{" "}
          <code className="text-cyan-200/90">/register/scan/…</code> so guests hit auth first, signed-in users go straight
          to the form. Override host with <code className="text-cyan-200/90">VITE_QR_LINK_BASE_URL</code> for local/preview.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="text-sm text-red-400 mb-4" role="alert">
            {error}
          </p>
        )}
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {QR_ENTRIES.map((e) => {
            const url = `${base}${e.path}`;
            const dataUrl = qrs[e.id];
            return (
              <div
                key={e.id}
                className="rounded-lg border border-slate-700/80 bg-slate-950/40 p-4 flex flex-col items-center text-center"
              >
                <p className="text-sm font-medium text-white mb-0.5">{e.title}</p>
                <p className="text-[11px] text-gray-500 mb-2">{e.blurb}</p>
                <p className="text-[10px] text-gray-500 break-all mb-2 w-full leading-snug">{url}</p>
                {dataUrl ? (
                  <img
                    src={dataUrl}
                    alt={`QR code: ${e.title}`}
                    className="rounded-md bg-white p-2 w-full max-w-[240px] aspect-square object-contain"
                  />
                ) : (
                  <div className="h-[240px] w-[240px] max-w-full flex items-center justify-center text-gray-500 text-sm">
                    Generating…
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2 justify-center">
                  <Button type="button" size="sm" variant="secondary" disabled={!dataUrl} onClick={() => dataUrl && triggerDownload(dataUrl, e.filename)}>
                    <Download className="h-4 w-4 mr-1.5" />
                    Download PNG
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="border-slate-600" asChild>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1.5" />
                      Open
                    </a>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
