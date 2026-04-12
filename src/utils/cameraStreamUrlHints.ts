/**
 * Heuristics for camera stream URLs shown on Monitoring / admin.
 * Browsers only play a subset of URLs in <video src>; share pages and RTSP are common pitfalls.
 */

/** Browsers cannot open rtsp:// or rtsps:// in &lt;video&gt; or hls.js — convert to HLS/WebRTC first. */
export function isRtspStreamUrl(url: string): boolean {
  const lower = url.trim().toLowerCase();
  return lower.startsWith('rtsp://') || lower.startsWith('rtsps://');
}

/** True when URL should be played with hls.js (or Safari native HLS), not a plain progressive file. */
export function isHlsPlaylistUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  if (u.includes('.m3u8')) return true;
  try {
    const p = new URL(url.trim());
    return p.pathname.endsWith('.m3u8') || p.pathname.endsWith('/playlist.m3u8');
  } catch {
    return false;
  }
}

/**
 * When the SPA is served over HTTPS, browsers block fetching `http://` playlists and segments
 * (mixed content). hls.js and native HLS both fail silently or with a generic security error.
 * Localhost HTTP is still allowed by browsers for dev.
 */
export function isHttpStreamBlockedByMixedContent(url: string): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.protocol !== 'https:') return false;
  const trimmed = url.trim();
  if (!trimmed.toLowerCase().startsWith('http://')) return false;
  try {
    const u = new URL(trimmed);
    const h = u.hostname.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1' || h === '[::1]') return false;
    return true;
  } catch {
    return false;
  }
}

export function shouldUseSharePageHintInsteadOfVideoTag(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  if (isRtspStreamUrl(trimmed)) return true;
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
