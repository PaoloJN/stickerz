/** Docs navigation + table-of-contents data. Article bodies live in `src/routes/docs/[slug]/+page.svelte`. */

export type Article = {
  slug: string;
  label: string;
  eyebrow: string;
  title: string;
  lede?: string;
  meta?: string;
  /** [heading id, label]; every id must exist as `<h2 id data-toc>` in the page body */
  toc: [id: string, label: string][];
};

export const ARTICLES: Article[] = [
  {
    slug: "works",
    label: "How it works",
    eyebrow: "DOCS / GET STARTED",
    title: "How it works",
    lede: "Three steps, no account. Your design is drawn at real size, so the layout you make is the one you’ll print.",
    toc: [
      ["pick", "Pick your logos"],
      ["arrange", "Arrange your stickers"],
      ["share", "Share or print"],
      ["saved", "Where your designs live"],
    ],
  },
  {
    slug: "print",
    label: "How to print",
    eyebrow: "DOCS / PRINTING",
    title: "How to print your laptop stickers",
    lede: "Export a print kit: your stickers laid out on paper at true size, plus a stencil and a map so they land exactly where you designed them. Cut them with scissors, a Cricut, a Silhouette, or send them to a print shop.",
    meta: "8 MIN READ · UPDATED OCT 2026",
    toc: [
      ["export", "Export the print kit"],
      ["size", "Check the size"],
      ["cut", "Print and cut"],
      ["place", "Put them in the right place"],
      ["apply", "Stick it on"],
    ],
  },
  {
    slug: "contribute",
    label: "How to contribute",
    eyebrow: "DOCS / CONTRIBUTE",
    title: "How to contribute",
    lede: "Stickerz is open source. Bug fixes, new laptop sizes and better print exports are all welcome.",
    toc: [
      ["local", "Run it locally"],
      ["pr", "Opening a pull request"],
      ["logos", "Where the logos live"],
    ],
  },
  {
    slug: "missing",
    label: "Adding a missing logo",
    eyebrow: "DOCS / CONTRIBUTE",
    title: "Adding a missing logo",
    lede: "Can’t find a logo? Request it and we’ll add it to the library, usually within a week.",
    toc: [
      ["req", "What we need"],
      ["now", "Need it today?"],
    ],
  },
  {
    slug: "faq",
    label: "FAQ",
    eyebrow: "DOCS / HELP",
    title: "FAQ",
    toc: [],
  },
];

/** Reading order, used for prev/next. */
export const SEQ = ["works", "print", "contribute", "missing", "faq"] as const;

export const GROUPS: { label: string; items: string[] }[] = [
  { label: "GET STARTED", items: ["works"] },
  { label: "PRINTING", items: ["print"] },
  { label: "CONTRIBUTE", items: ["contribute", "missing"] },
  { label: "HELP", items: ["faq"] },
];

export const getArticle = (slug: string): Article | undefined => ARTICLES.find((a) => a.slug === slug);
