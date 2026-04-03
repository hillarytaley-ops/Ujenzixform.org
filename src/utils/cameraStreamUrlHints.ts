/**
 * Heuristics for camera stream URLs shown on Monitoring / admin.
 * Browsers only play a subset of URLs in <video src>; share pages and RTSP are common pitfalls.
 */

export function shouldUseSharePageHintInsteadOfVideoTag(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('rtsp://') || lower.startsWith('rtsps://')) return true;
  if (!lower.startsWith('http://') && !lower.startsWith('https://')) return true;
  try {
    const parsed = new URL(trimmed);
    const h = parsed.hostname.toLowerCase();
    if (h.includes('gopro.com')) return true;
    if (h.includes('quik.gopro.com')) return true;
    if (h.includes('dropbox.com')) {
      if (h.endsWith('dropboxusercontent.com') || h.includes('dl.dropboxusercontent.com')) return false;
      if (!lower.includes('raw=1') && !lower.includes('dl=0')) return true;
    }
    if (h.includes('drive.google.com')) return true;
    if (h.includes('photos.app.goo.gl') || h.includes('photos.google.com')) return true;
    if (h.includes('facebook.com') || h.includes('fb.watch')) return true;
    if (h.includes('instagram.com')) return true;
    if (h.includes('tiktok.com')) return true;
    return false;
  } catch {
    return true;
  }
}
