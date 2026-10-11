export type LegalSlug = "terms" | "privacy" | "affiliate" | "trademark";

export type LegalDoc = {
  slug: LegalSlug;
  label: string;
  title: string;
  updated: string;
  short: string[];
};

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: "terms",
    label: "Terms of use",
    title: "Terms of use",
    updated: "Oct 2026",
    short: [
      "Free to use, no account needed.",
      "Your designs are yours. Shared ones are public.",
      "Logos are for your own laptop, not for selling stickers.",
    ],
  },
  {
    slug: "privacy",
    label: "Privacy",
    title: "Privacy",
    updated: "Oct 2026",
    short: [
      "No accounts and no ad trackers.",
      "Your designs stay in your browser until you save or share one.",
      "No analytics, for now.",
    ],
  },
  {
    slug: "affiliate",
    label: "Affiliate disclosure",
    title: "Affiliate disclosure",
    updated: "Oct 2026",
    short: [
      "Some print links pay us a small commission.",
      "You pay the same price either way.",
      "Every paid link is labeled right where it appears.",
    ],
  },
  {
    slug: "trademark",
    label: "Trademark notice",
    title: "Trademark notice",
    updated: "Oct 2026",
    short: [
      "Logos belong to their owners.",
      "Nothing here is endorsed unless it says “Sponsored”.",
      "Brands can ask for removal for free, any time.",
    ],
  },
];

/** Old or short slugs that redirect to a canonical one. */
export const LEGAL_ALIASES: Record<string, LegalSlug> = { tm: "trademark" };

export function getLegalDoc(slug: string): LegalDoc | undefined {
  return LEGAL_DOCS.find((d) => d.slug === slug);
}
