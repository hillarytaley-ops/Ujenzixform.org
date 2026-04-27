import { useEffect, useState, useCallback } from "react";
import QRCode from "qrcode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, QrCode, ExternalLink } from "lucide-react";

function authorPageUrl(origin: string) {
  const base = origin.replace(/\/$/, "");
  return `${base}/author`;
}

async function qrPngDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 280,
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
  const [pageUrl, setPageUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    if (!origin) return;
    const url = authorPageUrl(origin);
    setPageUrl(url);
    let cancelled = false;
    setError(null);
    void (async () => {
      try {
        const png = await qrPngDataUrl(url);
        if (!cancelled) setQrDataUrl(png);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not generate QR code");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const downloadPng = useCallback(() => {
    if (qrDataUrl) triggerDownload(qrDataUrl, "ujenzixform-author-page.png");
  }, [qrDataUrl]);

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <QrCode className="h-5 w-5 text-cyan-400" />
          Author page QR code
        </CardTitle>
        <CardDescription className="text-gray-400">
          One scannable link to the public Author page (<code className="text-cyan-200/90">/author</code>, same as{" "}
          <code className="text-cyan-200/90">/auth</code>). Visitors choose Sign in or Sign up on that page. For printouts,
          site offices, or onboarding packs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="text-sm text-red-400 mb-4" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-col items-center text-center max-w-md mx-auto">
          <p className="text-xs text-gray-500 break-all mb-3 w-full">{pageUrl || "…"}</p>
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR code: Author page URL"
              className="rounded-md bg-white p-2 max-w-[min(100%,280px)]"
            />
          ) : (
            <div className="h-[280px] w-[280px] flex items-center justify-center text-gray-500 text-sm">Generating…</div>
          )}
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            <Button type="button" size="sm" variant="secondary" disabled={!qrDataUrl} onClick={downloadPng}>
              <Download className="h-4 w-4 mr-1.5" />
              Download PNG
            </Button>
            {pageUrl ? (
              <Button type="button" size="sm" variant="outline" className="border-slate-600" asChild>
                <a href={pageUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  Open page
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
