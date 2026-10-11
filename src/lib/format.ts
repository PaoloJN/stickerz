const short = (n: number) => n.toFixed(1).replace(/\.0$/, "");

/** Compact count for badges: 999 → "999", 4821 → "4.8k", 1_200_000 → "1.2m". */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 999_950) return `${short(n / 1000)}k`;
  return `${short(n / 1_000_000)}m`;
}
