/**
 * Everything the Support page and sponsor features link to, in one place.
 *
 * A `null` link means "not set up yet": the item is hidden in production and shown with a "not set up" tag in dev,
 * so you can see the whole page while signing up for each program. Research notes and sources:
 * docs/ideas/2026-10-04-business-ideas.md.
 */

import { repoUrl, siteConfig, sponsorsUrl, upstreamRepoUrl } from "@/config/site";

/** Values below derive from siteConfig (src/config/site.ts); change identity there, not here. */
export const REPO_URL = repoUrl;

/** Project account on X, linked from the footer. Hidden while null. */
export const X_URL: string | null = siteConfig.links.x;

export type Link = { href: string | null };

export const DONATE = {
  /** 0% fees from personal accounts, one-time + monthly, invoices for companies. Enable at github.com/sponsors */
  githubSponsors: siteConfig.donate.githubSponsors ? sponsorsUrl(siteConfig.donate.githubSponsors) : null,
  /** one-time tips for people without GitHub; 0% on one-time. ko-fi.com/<user> */
  kofi: siteConfig.donate.kofi ? `https://ko-fi.com/${siteConfig.donate.kofi}` : null,
  /** add once companies want invoices + a public budget; 10% host fee via Open Source Collective */
  openCollective: siteConfig.donate.openCollective ? `https://opencollective.com/${siteConfig.donate.openCollective}` : null,
};

/** Where the logo library started; credited on the Support page and in the docs. */
export const UPSTREAM = {
  name: siteConfig.upstream.name,
  site: siteConfig.upstream.site,
  repo: upstreamRepoUrl,
  sponsors: sponsorsUrl(siteConfig.upstream.sponsors),
};

/** Where brands get in touch about sponsorship. A mailto is friendlier for companies once you have one. */
export const BRAND_CONTACT = `${REPO_URL}/issues/new?title=${encodeURIComponent("Brand sponsorship")}&labels=sponsorship`;

export type BrandTier = {
  id: "verified" | "featured" | "partner";
  name: string;
  /** display price, e.g. "$49"; billing period is `period` */
  price: string;
  /** shown after the price, e.g. "/ month" */
  period: string;
  perks: string[];
};

/**
 * Priced between Open Collective sponsor tiers ($100–500/mo) and Tailwind's partner program ($2.5–5k/mo).
 * "Verified" needs a short written trademark license from the brand (approved assets, revocable).
 * Copy matches the For Brands design (docs/design/*For Brands.dc.html).
 */
export const BRAND_TIERS: BrandTier[] = [
  {
    id: "verified",
    name: "Verified",
    price: "$49",
    period: "/ month",
    perks: ["Official badge on your logo", "Only the versions and colors you approve"],
  },
  {
    id: "featured",
    name: "Featured",
    price: "$299",
    period: "/ month",
    perks: ["Everything in Verified", "A spot in the Sponsored row of the logo picker", "Monthly stats: designs, exports and shares"],
  },
  {
    id: "partner",
    name: "Partner",
    price: "$1,500",
    period: "/ month",
    perks: [
      "Everything in Featured",
      "A fixed Sponsored spot that’s always shown",
      "Your logo on the homepage and README",
      "A starter layout built around your stack",
    ],
  },
];

export type Shop = { name: string; blurb: string; href: string | null; affiliate: boolean };

/** Professional printing. Sticker Mule Commissions: 5–10% of a referral's orders for 12 months, takes PDF/SVG die-cuts. */
export const PRINT_SHOPS: Shop[] = [
  {
    name: "Sticker Mule",
    blurb: "Die-cut vinyl from the print PDF. Upload it and they cut along our cut lines.",
    // swap for your Commissions referral link once you have it
    href: "https://www.stickermule.com/custom-stickers",
    affiliate: false,
  },
];

/** Cut and print at home. Fill in affiliate links as programs approve you (Silhouette is US-only). */
export const SUPPLIES: Shop[] = [
  { name: "Silhouette Cameo", blurb: "Cutting machine. Reads the cut lines in the print PDF.", href: null, affiliate: true },
  { name: "Cricut", blurb: "Cutting machine. Print then cut, for sticker sheets.", href: null, affiliate: true },
  { name: "Printable vinyl sticker paper", blurb: "Inkjet vinyl, waterproof once laminated.", href: null, affiliate: true },
  { name: "Clear laminate sheets", blurb: "Protects prints from scratches and spills.", href: null, affiliate: true },
];

/** Amazon requires this exact sentence wherever Amazon links appear. Set true once any supply links to Amazon. */
export const AMAZON_LINKS = false;
export const AMAZON_DISCLOSURE = "As an Amazon Associate I earn from qualifying purchases.";
export const AFFILIATE_DISCLOSURE = "Some links here are paid links: if you buy through them we earn a commission, at no extra cost to you.";

/** EthicalAds publisher id (privacy-first, needs ~50k pageviews/mo). The ad slot renders nothing until it's set. */
export const ETHICAL_ADS_PUBLISHER: string | null = null;

/** Show unconfigured items while developing so the full page is visible; hide them in production. */
export const showPending = import.meta.env.DEV;
