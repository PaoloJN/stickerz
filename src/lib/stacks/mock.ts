/**
 * Mock stacks for the pages around the editor (Landing, Gallery, My stacks, Shared stack).
 *
 * There is no backend for saved stacks yet, so these are placeholder stacks built from the
 * real sticker model: each one is a genuine {@link Layout} (device + scattered stickers) that
 * renders through {@link StackLid} exactly like a real stack, and "Remix" opens it in the editor.
 *
 * Positions are generated with a seeded RNG so the server and client produce identical output
 * (no hydration mismatch on these SSR'd pages).
 */
import { getDevice } from "$lib/stickers/devices";
import { isKnownLogo, LOGO_BY_KEY, artFor } from "$lib/stickers/logos";
import { DEFAULT_STYLE } from "$lib/stickers/style";
import { gridSpots } from "$lib/stickers/ops";
import { encodeLayout } from "$lib/stickers/codec";
import type { Layout, Sticker } from "$lib/stickers/types";

export type Visibility = "Public" | "Unlisted" | "Private";

export type MockStack = {
  /** url slug, e.g. "frontend-2026" */
  id: string;
  name: string;
  /** author handle */
  by: string;
  edited: string;
  vis: Visibility;
  /** remix count, pre-formatted (e.g. "1.2k") */
  remix: string;
  /** number of stickers on the lid */
  count: number;
  /** a real layout, ready for <StackLid> and the editor */
  layout: Layout;
};

/** Every mock stack shows on a MacBook Air 13″, matching the design. */
const MODEL = "air13";

/** design color name -> real device finish id */
const COLOR: Record<string, string> = {
  silver: "silver",
  gray: "space-gray",
  midnight: "midnight",
  starlight: "starlight",
  sky: "sky-blue",
};

/** design logo id -> real StickerLogo.key */
const LOGO: Record<string, string> = {
  vercel: "vercel", next: "nextjs_icon", react: "react", tailwind: "tailwindcss",
  ts: "typescript", figma: "figma", linear: "linear", github: "github", vite: "vite",
  shadcn: "shadcn-ui", cursor: "cursor", raycast: "raycast", bun: "bun", deno: "deno",
  node: "nodejs", pg: "postgresql", prisma: "prisma", drizzle: "drizzle-orm",
  supabase: "supabase", neon: "neon", docker: "docker", stripe: "stripe",
  resend: "resend-icon-black", openai: "openai", claude: "claude-ai-icon", v0: "v0",
  svelte: "svelte", astro: "astro-icon",
};

/** small deterministic LCG so lids look identical on server and client */
function rng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/** Map design logo ids to real keys, dropping any the registry doesn't know. */
export function toKeys(ids: string[]): string[] {
  return ids.map((id) => LOGO[id] ?? id).filter(isKnownLogo);
}

/** Build a real Layout: stickers scattered over the lid with seeded jitter. */
export function buildLayout(logoKeys: string[], color: string, seed: number, name?: string): Layout {
  const lid = getDevice(MODEL);
  const rand = rng(seed * 7919 + 17);
  const spots = gridSpots(logoKeys.length, { w: lid.w, h: lid.h }, rand);
  const stickers: Sticker[] = logoKeys.map((logo, i) => ({
    id: `${seed}-${i}`,
    logo,
    variant: "icon",
    theme: LOGO_BY_KEY.get(logo)?.icon.dark ? "dark" : "light",
    locked: false,
    ...DEFAULT_STYLE,
    x: spots[i].x,
    y: spots[i].y,
    w: 28 + Math.round(rand() * 10),
    rot: spots[i].rot,
  }));
  return { v: 1, laptop: { model: MODEL, color: COLOR[color] ?? color }, stickers, ...(name ? { name } : {}) };
}

/** `/editor#l=…` — opens a fresh copy of the stack in the editor (Remix). */
export function remixHref(stack: MockStack): string {
  return "/editor#l=" + encodeLayout(stack.layout);
}

/** art url for a single logo icon (handy for grids / "how it works" tiles) */
export function iconArt(key: string, theme: "light" | "dark" = "light"): string | null {
  const logo = LOGO_BY_KEY.get(key);
  return logo ? artFor(logo, "icon", theme) : null;
}

type Seed = { name: string; by: string; color: string; ids: string[]; edited: string; vis: Visibility; remix: string };

const SEED: Seed[] = [
  { name: "Frontend 2026", by: "maya", color: "silver", ids: ["vercel", "next", "react", "tailwind", "ts", "figma", "linear", "github", "vite", "shadcn", "cursor", "raycast"], edited: "2 hours ago", vis: "Unlisted", remix: "1.2k" },
  { name: "Backend kit", by: "theo", color: "gray", ids: ["bun", "deno", "node", "pg", "prisma", "drizzle", "supabase", "neon", "docker", "stripe", "resend"], edited: "Yesterday", vis: "Public", remix: "842" },
  { name: "AI tinkering", by: "jun", color: "midnight", ids: ["openai", "claude", "v0", "cursor", "vercel", "next", "supabase"], edited: "3 days ago", vis: "Private", remix: "610" },
  { name: "Weekend projects", by: "sam", color: "starlight", ids: ["svelte", "astro", "vite", "tailwind", "bun", "deno"], edited: "Sep 28", vis: "Public", remix: "388" },
  { name: "Indie SaaS", by: "lena", color: "sky", ids: ["next", "stripe", "resend", "supabase", "tailwind", "shadcn", "vercel", "linear"], edited: "Sep 21", vis: "Unlisted", remix: "301" },
  { name: "Design engineer", by: "kai", color: "silver", ids: ["figma", "react", "tailwind", "shadcn", "raycast", "linear", "v0", "cursor", "vite"], edited: "Sep 14", vis: "Private", remix: "276" },
  { name: "Client work", by: "maya", color: "gray", ids: ["figma", "linear", "github", "vercel", "next", "ts"], edited: "Aug 30", vis: "Private", remix: "0" },
];

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** All mock stacks. Order is stable; `mine` = all, `gallery` = first 6. */
export const STACKS: MockStack[] = SEED.map((s, i) => {
  const keys = toKeys(s.ids);
  return {
    id: slug(s.name),
    name: s.name,
    by: s.by,
    edited: s.edited,
    vis: s.vis,
    remix: s.remix,
    count: keys.length,
    layout: buildLayout(keys, s.color, i + 1, s.name),
  };
});

export const galleryStacks = STACKS.slice(0, 6);
export const myStacks = STACKS;

export function getStack(id: string): MockStack | undefined {
  return STACKS.find((s) => s.id === id);
}
