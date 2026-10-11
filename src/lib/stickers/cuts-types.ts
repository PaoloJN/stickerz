/** Client-safe half of `cuts.ts`: types and constants only, no JSON import. */

/**
 * A precomputed die-cut outline. `d` is in mm, centred on the art box (origin = art centre), traced in a canonical box
 * `CANON.artW` wide (or `CANON.artW` tall when `aspect < 1`); scale it by the drawn art size over that box.
 */
export type CutEntry = { d: string; aspect: number };

/** canonical box the paths were traced in (mm); scale by w/CANON.artW when drawing */
export const CANON = { artW: 100, margin: 3 } as const;
