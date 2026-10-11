/**
 * Brands that sponsor their logo (see BRAND_TIERS in $lib/support). Paid placement is always labeled: sponsored logos
 * appear in their own "Sponsored" row and never change the order of search results or the regular library.
 */

export type SponsorTier = "verified" | "featured" | "partner";
export type BrandSponsor = {
  /** library logo key */
  logo: string;
  tier: SponsorTier;
  /** brand guidelines or site */
  url?: string;
};

/** Add a row when a brand signs (and its license is on file). */
export const BRAND_SPONSORS: BrandSponsor[] = [];

/** max logos in the Sponsored row */
export const SPONSORED_SLOTS = 6;

/** Logos for the Sponsored row: partners first (fixed), then featured, capped. */
export function sponsoredLogos(list: BrandSponsor[] = BRAND_SPONSORS): string[] {
  const rank = (t: SponsorTier) => (t === "partner" ? 0 : t === "featured" ? 1 : 2);
  return list
    .filter((s) => s.tier !== "verified")
    .sort((a, b) => rank(a.tier) - rank(b.tier))
    .slice(0, SPONSORED_SLOTS)
    .map((s) => s.logo);
}

/** Every sponsoring tier includes the Official badge. */
export const isOfficial = (logo: string, list: BrandSponsor[] = BRAND_SPONSORS) => list.some((s) => s.logo === logo);
