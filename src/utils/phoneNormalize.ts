/** Digits-only phone for DB CHECK constraints (Kenya-friendly: 07… → 2547…). */
export function normalizePhoneDigits(raw: string): string {
  let d = (raw || '').replace(/\D/g, '');
  if (d.startsWith('0') && d.length === 10) d = '254' + d.slice(1);
  else if (d.length === 9 && d.startsWith('7')) d = '254' + d;
  return d;
}
