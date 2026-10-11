/** Builds a GitHub Sponsors checkout link with the frequency and amount preselected. */
export function sponsorUrl(user: string, opts: { frequency: "recurring" | "one-time"; amount: number }): string {
  return `https://github.com/sponsors/${user}?frequency=${opts.frequency}&amount=${opts.amount}`;
}

/** Preset amounts per frequency (USD). */
export const SPONSOR_AMOUNTS = {
  recurring: [3, 5, 10, 25],
  "one-time": [5, 10, 25, 50],
} as const;
