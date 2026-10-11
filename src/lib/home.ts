/**
 * Data for the Home page (`/`), lifted from `docs/design/*Home.dc.html` (its <script> block).
 * Client-safe: plain lists + a tiny helper. The server load turns the files into die-cut paths.
 */

/** decorative sticker: [library file, left px, top px, box size px, rotate deg, far (blurred)] */
export type Scatter = [file: string, left: number, top: number, size: number, rot: number, far?: 0 | 1];

/** hero scatter, px inside the 1096 px hero card (mock `HSTK`) */
export const HSTK: Scatter[] = [
  ["tailwindcss.svg", 30, 150, 52, -12, 1],
  ["react_light.svg", 48, 262, 112, -9, 0],
  ["figma.svg", 150, 420, 72, 8, 0],
  ["typescript.svg", 22, 500, 46, 14, 1],
  ["supabase.svg", 1018, 140, 50, 10, 1],
  ["vercel.svg", 958, 256, 104, 8, 0],
  ["linear.svg", 890, 404, 74, -7, 0],
  ["stripe.svg", 1030, 486, 44, -10, 1],
];

/** CTA block scatter (mock `CSTK`) */
export const CSTK: Scatter[] = [
  ["github_light.svg", 70, 70, 88, -10, 0],
  ["openai.svg", 190, 230, 60, 9, 1],
  ["cursor_light.svg", 930, 64, 84, 8, 0],
  ["shadcn-ui.svg", 860, 236, 58, -8, 1],
];

/** "How it works" 01: stickers on the device card (mock inline imgs; box = art size) */
export const HOW1: Scatter[] = [
  ["vercel.svg", 270, 80, 62, 8],
  ["figma.svg", 330, 170, 48, -8],
];

/** "How it works" 02: the loose pile above the search pill */
export const HOW2: Scatter[] = [
  ["react_light.svg", 40, 150, 62, -14],
  ["vercel.svg", 100, 68, 58, -8],
  ["figma.svg", 184, 24, 54, -3],
  ["supabase.svg", 262, 20, 60, 5],
  ["tailwindcss.svg", 338, 62, 58, 10],
  ["linear.svg", 388, 146, 56, 14],
  ["stripe.svg", 200, 112, 44, -6],
  ["github_light.svg", 272, 106, 46, 8],
];

/** "Layers" card, bottom to top (mock `LAY`: file, name, left, top, size, rotate) */
export const LAY: [file: string, name: string, left: number, top: number, size: number, rot: number][] = [
  ["figma.svg", "Figma", 24, 30, 96, -12],
  ["supabase.svg", "Supabase", 140, 18, 92, 10],
  ["vercel.svg", "Vercel", 40, 100, 100, 6],
  ["react_light.svg", "React", 112, 82, 118, -6],
];

/** A4 print sheet tiles (mock `SHEET`, already mapped to files) */
export const SHEET = [
  "vercel.svg", "nextjs_icon_dark.svg", "react_light.svg", "tailwindcss.svg", "typescript.svg", "figma.svg",
  "linear.svg", "github_light.svg", "vite.svg", "shadcn-ui.svg", "cursor_light.svg", "raycast.svg",
];

/** logo marquee (mock `MQ`) */
export const MQ: [file: string, name: string][] = [
  ["vercel.svg", "Vercel"], ["nextjs_icon_dark.svg", "Next.js"], ["react_light.svg", "React"],
  ["tailwindcss.svg", "Tailwind"], ["typescript.svg", "TypeScript"], ["figma.svg", "Figma"],
  ["linear.svg", "Linear"], ["supabase.svg", "Supabase"], ["docker.svg", "Docker"], ["github_light.svg", "GitHub"],
  ["stripe.svg", "Stripe"], ["bun.svg", "Bun"], ["deno.svg", "Deno"], ["nodejs.svg", "Node.js"],
  ["postgresql.svg", "PostgreSQL"], ["prisma.svg", "Prisma"], ["neon.svg", "Neon"], ["openai.svg", "OpenAI"],
  ["claude-ai-icon.svg", "Claude"], ["cursor_light.svg", "Cursor"], ["raycast.svg", "Raycast"], ["vite.svg", "Vite"],
  ["svelte.svg", "Svelte"], ["astro-icon-light.svg", "Astro"], ["shadcn-ui.svg", "shadcn/ui"],
  ["resend-icon-black.svg", "Resend"],
];

/** the headline's inline sticker cycles through these (mock `HS`), each at its own resting angle */
export const HEADLINE_CYCLE: { file: string; rot: number }[] = [
  { file: "react_light.svg", rot: -8 },
  { file: "vercel.svg", rot: 6 },
  { file: "figma.svg", rot: -6 },
  { file: "supabase.svg", rot: 8 },
  { file: "tailwindcss.svg", rot: -10 },
  { file: "linear.svg", rot: 7 },
  { file: "github_light.svg", rot: -5 },
  { file: "typescript.svg", rot: 9 },
];

/** design ids of the mock's GAL[0] "Frontend 2026", the demo lid when the gallery is empty */
export const HERO_IDS = ["vercel", "next", "react", "tailwind", "ts", "figma", "linear", "github", "vite", "shadcn", "cursor", "raycast"];
/** GAL[3] "Weekend projects", the lid on the Shuffle card */
export const SHUFFLE_IDS = ["svelte", "astro", "vite", "tailwind", "bun", "deno"];

export const lib = (file: string) => `/library/${file}`;

/** every library href the page's decorative stickers use (for `cutsFor` in the load) */
export const decorativeHrefs = (): string[] => [
  ...new Set(
    [...HSTK, ...CSTK, ...HOW1, ...HOW2].map((s) => s[0])
      .concat(LAY.map((l) => l[0]), SHEET, HEADLINE_CYCLE.map((h) => h.file))
      .map(lib),
  ),
];

/** The gallery teaser: the first `n` real stacks, or the first `n` mocks when the gallery is empty. */
export function pickTeaser<T>(stacks: T[], mock: T[], n = 4): T[] {
  return (stacks.length > 0 ? stacks : mock).slice(0, n);
}
