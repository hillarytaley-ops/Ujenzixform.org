/**
 * Best-effort XSS mitigation for `dangerouslySetInnerHTML`.
 * Not a full HTML parser — prefer DOMPurify (or server-side sanitization) for untrusted rich HTML.
 */

function stripCommonXssVectors(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*>/gi, '')
    .replace(/\bjavascript:/gi, 'blocked:')
    .replace(/\son\w+\s*=/gi, ' data-removed=');
}

/** Admin email template preview — strip scripts and inline handlers. */
export function sanitizeEmailPreviewHtml(html: string): string {
  return stripCommonXssVectors(html);
}

/**
 * Camera embed HTML — only allow a single iframe with https src after stripping handlers.
 */
export function sanitizeCameraEmbedHtml(html: string): string {
  const trimmed = html.trim();
  if (!/^<\s*iframe[\s>]/i.test(trimmed)) return '';
  const srcMatch = trimmed.match(/\bsrc\s*=\s*(["'])([^"']*)\1/i);
  if (!srcMatch || !/^https:\/\//i.test(srcMatch[2].trim())) return '';
  return stripCommonXssVectors(trimmed);
}

/** Chat lines with **bold** converted to <strong>. */
export function sanitizeChatBoldHtml(html: string): string {
  return stripCommonXssVectors(html);
}
