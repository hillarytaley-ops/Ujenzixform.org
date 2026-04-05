/**
 * XSS mitigation for `dangerouslySetInnerHTML`.
 * Uses DOMPurify in the browser; regex fallbacks when `window` is unavailable (SSR/tests).
 */

import DOMPurify from 'dompurify';

function stripCommonXssVectors(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*>/gi, '')
    .replace(/\bjavascript:/gi, 'blocked:')
    .replace(/\son\w+\s*=/gi, ' data-removed=');
}

function legacyCameraEmbedRegex(html: string): string {
  const trimmed = html.trim();
  if (!/^<\s*iframe[\s>]/i.test(trimmed)) return '';
  const srcMatch = trimmed.match(/\bsrc\s*=\s*(["'])([^"']*)\1/i);
  if (!srcMatch || !/^https:\/\//i.test(srcMatch[2].trim())) return '';
  return stripCommonXssVectors(trimmed);
}

const canUseDomPurify = (): boolean =>
  typeof window !== 'undefined' && typeof window.document !== 'undefined';

/** Admin email template preview — full HTML with DOMPurify in browser. */
export function sanitizeEmailPreviewHtml(html: string): string {
  if (!canUseDomPurify()) return stripCommonXssVectors(html);
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

/**
 * Camera embed HTML — single iframe, https src, stripped via DOMPurify + final URL check.
 */
export function sanitizeCameraEmbedHtml(html: string): string {
  if (!canUseDomPurify()) return legacyCameraEmbedRegex(html);

  const clean = DOMPurify.sanitize(html.trim(), {
    ALLOWED_TAGS: ['iframe'],
    ALLOWED_ATTR: [
      'src',
      'width',
      'height',
      'allow',
      'allowfullscreen',
      'title',
      'loading',
      'referrerpolicy',
      'frameborder',
    ],
    ALLOW_DATA_ATTR: false,
  });

  const div = window.document.createElement('div');
  div.innerHTML = clean;
  const iframe = div.querySelector('iframe');
  if (!iframe) return '';
  const src = iframe.getAttribute('src')?.trim() ?? '';
  if (!/^https:\/\//i.test(src)) return '';
  return iframe.outerHTML;
}

/** Chat lines with **bold** converted to <strong>. */
export function sanitizeChatBoldHtml(html: string): string {
  if (!canUseDomPurify()) return stripCommonXssVectors(html);
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['strong', 'b', 'br'],
    ALLOWED_ATTR: [],
  });
}
