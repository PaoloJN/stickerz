import { siteConfig } from "@/config/site";

/**
 * Per-page social metadata. A page's server load returns `seo` and the root layout turns it into the
 * og:/twitter: tags, so each page has one image and one description, never two sets of tags.
 */
export type Seo = {
  title?: string;
  description?: string;
  /** absolute URL of a 1200×630 image; the site card when unset */
  image?: string;
  imageAlt?: string;
};

export const DEFAULT_SEO: Required<Seo> = {
  title: siteConfig.name,
  description: "Design a sticker layout for your laptop from your stack, then post it or print it.",
  image: `${siteConfig.url}/og.png`,
  imageAlt: `${siteConfig.name}: ${siteConfig.tagline}`,
};

export const resolveSeo = (seo?: Seo | null): Required<Seo> => ({ ...DEFAULT_SEO, ...Object.fromEntries(Object.entries(seo ?? {}).filter(([, v]) => v != null)) });
