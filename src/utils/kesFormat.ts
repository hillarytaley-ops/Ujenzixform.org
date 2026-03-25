/**
 * Compact KES for dashboard cards (avoids "0.0M" when spend is under ~50k).
 * Aligns with ProjectDetails: M → K → grouped full amount.
 */
export function formatKesCompact(amount: number | null | undefined): string {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) {
    return "KES 0";
  }
  if (n >= 1_000_000) {
    return `KES ${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  }
  if (n >= 1_000) {
    return `KES ${(n / 1_000).toFixed(0)}K`;
  }
  return `KES ${Math.round(n).toLocaleString()}`;
}
