/**
 * Format sale datetime for integrator: yyyyMMddHHmmss.
 * Uses local timezone; hour is 24-hour (00–23) for unambiguous values (confirm with integrator if they require 12-hour encoding).
 */
export function formatEtimsSalesDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, "0");
  const D = String(d.getDate()).padStart(2, "0");
  const H = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${y}${M}${D}${H}${m}${s}`;
}
