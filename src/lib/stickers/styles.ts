/**
 * Brands the library lists more than once. Two kinds, both hand-curated (never guessed from titles, which collide):
 *
 * - STYLE_GROUPS: the same brand in alternate designs. They become ONE sticker with a Style picker; the first style
 *   is the default (its entry keeps the sticker's key). Style ids are stored in designs and share links: never rename.
 * - TITLES: different brands that share a name; they stay separate stickers with names that tell them apart.
 *
 * Keys are logo keys (the file name without .svg and -light/-dark).
 */
export const STYLE_GROUPS: { key: string; styles: { id: string; label: string; from: string }[] }[] = [
  {
    key: "jetbrains",
    styles: [
      { id: "default", label: "Default", from: "jetbrains" },
      { id: "solid", label: "Solid", from: "jetbrainsSolid" },
    ],
  },
  ...(
    [
      ["illustrator", "ai_appicon_64_grayscale"],
      ["photoshop", "ps_appicon_64_grayscale"],
      ["acrobat-reader", "reader_appicon_64_grayscale"],
    ] as const
  ).map(([key, gray]) => ({
    key,
    styles: [
      { id: "color", label: "Color", from: key },
      { id: "grayscale", label: "Grayscale", from: gray },
    ],
  })),
];

export const TITLES: Record<string, string> = {
  arc: "Arc.dev",
  arc_fintech: "Arc (fintech)",
  arc_browser: "Arc Browser",
};
