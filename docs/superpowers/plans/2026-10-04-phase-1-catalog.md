# Stack Stickers — Phase 1: Foundation, Logo Catalog & `/stickers` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deployable Next.js app with svgl-style design, a build-time logo catalog merged from four open sources, and a `/stickers` catalog page with search, categories, favorites and downloads.

**Architecture:** A Node build script (`pnpm catalog:build`) loads simple-icons, Iconify `logos`, devicon and a pinned svgl checkout, merges them by normalized name, sanitizes SVGs with svgo, and commits `catalog/logos.json` + `public/logos/**`. The Next.js app reads that JSON at build time; all catalog interactivity (search, favorites, downloads) is client-side.

**Tech Stack:** Next.js 16 (App Router, TS), pnpm, Tailwind v4, shadcn/ui, Geist, next-themes, svgo 4, fuse.js 7, tsx, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-04-stack-stickers-design.md` (§3, §4, §10, §11, §14 are in scope for this phase).

## Global Constraints

- Node 22, pnpm 11. Next.js 16 App Router, TypeScript strict, no `src/` dir, import alias `@/*` → repo root.
- Styling: Tailwind v4 + shadcn/ui (base colour neutral), Geist + Geist Mono, class-based dark mode via `next-themes`. svgl look: `rounded-md`, `border-neutral-200 dark:border-neutral-800`, `hover:bg-neutral-100/80 dark:hover:bg-neutral-800/50`, logo cells `h-10`, titles `text-[15px] font-medium`. No brand accent colour.
- Never fetch logos from third-party APIs at runtime. svgl pinned commit: `ecb9adaafe41c578742e94fce90e6cc03c48a574`.
- Excluded sources: unixstickers/foss-swag-designs, worldvectorlogo.
- SVGs > 30 KB after optimization are rejected.
- localStorage key for favorites: `ss:favorites`; every storage access wrapped in try/catch.
- Footer text on every page: "Logos are trademarks of their respective owners. Not affiliated. Request removal →" (link to `/credits`; page itself is Phase 4 — link may 404 until then).
- Every commit message ends with a blank line then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Parallel workers: do **not** run `pnpm add`/`pnpm install` (all deps are installed in Task 1) and do **not** commit; the coordinator commits per wave.

## Review Focus

1. **Blocked or corrupted localStorage** (Safari private mode throws; value is `"{bad"` or `{"a":1}`) → favorites still toggle in memory, page never crashes. Pinned in Task 7 tests.
2. **Malicious or broken source SVGs** (`<script>`, `onload=`, external `href`, `<foreignObject>`, no viewBox, unparseable) → stripped or rejected, never shipped. Pinned in Task 4 tests.
3. **Gradient/`id` collisions** when two logos are inlined in one document (sticker renderer, later the laptop) → every emitted SVG has ids prefixed with its logo+slot. Pinned in Task 4 tests.
4. **Symbol-heavy search queries** (`c++`, `C#`, `.NET`, `  next  `, empty string) → sensible results, no throw. Pinned in Task 7 tests.
5. **Dark logos in dark mode** (e.g. black Next.js mark with no dark variant) → card shows it on a light chip so it is visible. Pinned in Task 8 (component logic + Playwright check).

---

## File Map

| File | Responsibility |
|---|---|
| `lib/catalog/types.ts` | `Category`, `CATEGORIES`, `Logo`, `LogoSource`, `ThemedArt` (shared by app + scripts) |
| `lib/catalog/normalize.ts` | `toId`, `toKey`, `titleize` |
| `lib/catalog/search.ts` | `createSearch(logos)` |
| `lib/catalog/favorites.ts` | `createFavoritesStore(storage)`, `browserStorage()` |
| `lib/catalog/counts.ts` | `categoryCounts(logos)` |
| `lib/catalog/download.ts` | browser helpers: `fetchText`, `downloadBlob`, `svgToPngBlob` |
| `lib/render/sticker.ts` | `parseSvg`, `renderStickerSvg` (first piece of the shared renderer) |
| `scripts/catalog/source-types.ts` | `SourceLogo`, `ThemedSvg` intermediate types |
| `scripts/catalog/categories.ts` | `mapCategories(raw, fallback)` |
| `scripts/catalog/sources/{simple-icons,iconify,devicon,svgl}.ts` | one loader per source |
| `scripts/catalog/fetch-svgl.ts` | download pinned svgl tarball to `.cache/svgl` |
| `scripts/catalog/sanitize.ts` | `sanitizeSvg(svg, idPrefix)` |
| `scripts/catalog/merge.ts` | `mergeSources(all, curation)`, `Curation`, `MergedLogo` |
| `scripts/catalog/emit.ts` | `emitCatalog(merged, root)` |
| `scripts/catalog/build.ts` | orchestrator CLI |
| `catalog/curation.json` | include / exclude / merge / preferSource / categories / titles |
| `catalog/logos.json`, `public/logos/**`, `public/catalog/*.json` | generated, committed |
| `components/site/*` | header, footer, theme provider/toggle |
| `components/catalog/*` | catalog browser, sidebar, card |
| `app/stickers/page.tsx`, `app/editor/page.tsx` | routes |

---

### Task 1: Scaffold app, design system, tooling

**Files:**
- Create: Next.js scaffold, `vitest.config.ts`, `playwright.config.ts`, `components/site/theme-provider.tsx`, `components/site/theme-toggle.tsx`, `components/site/site-header.tsx`, `components/site/site-footer.tsx`, `app/editor/page.tsx`, `LICENSE`, `TRADEMARKS.md`, `tests/sanity.test.ts`
- Modify: `app/layout.tsx`, `app/page.tsx`, `package.json`, `.gitignore`

**Interfaces:**
- Produces: working `pnpm dev|build|test|e2e`, `@/` alias, shadcn components `button input badge dropdown-menu tooltip scroll-area separator`, `SiteHeader`, `SiteFooter`, `ThemeToggle`.

- [ ] **Step 1: Scaffold Next.js** (repo already has `docs/` and `.git`)

```bash
cd ~/Projects/stackstickers
pnpm create next-app@latest ss-scaffold --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-pnpm --turbopack --yes
rsync -a --exclude .git ss-scaffold/ ./ && rm -rf ss-scaffold
pnpm install
```

- [ ] **Step 2: Install all Phase 1 dependencies**

```bash
pnpm add next-themes fuse.js
pnpm add -D svgo simple-icons @iconify-json/logos devicon tsx vitest vite-tsconfig-paths @playwright/test
pnpm exec playwright install chromium
pnpm dlx shadcn@latest init -d
pnpm dlx shadcn@latest add button input badge dropdown-menu tooltip scroll-area separator -y
```

- [ ] **Step 3: Scripts + ignore**

Add to `package.json` `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest",
"e2e": "playwright test",
"catalog:fetch": "tsx scripts/catalog/fetch-svgl.ts",
"catalog:build": "tsx scripts/catalog/build.ts"
```
Append to `.gitignore`:
```
.cache/
test-results/
playwright-report/
```

- [ ] **Step 4: Vitest + Playwright config**

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
```
`playwright.config.ts`:
```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: "http://localhost:3100" },
  webServer: { command: "pnpm build && pnpm start -p 3100", url: "http://localhost:3100", timeout: 180_000, reuseExistingServer: true },
});
```
`tests/sanity.test.ts`:
```ts
import { expect, test } from "vitest";
test("vitest runs", () => expect(1 + 1).toBe(2));
```

- [ ] **Step 5: Theme + site chrome**

`components/site/theme-provider.tsx`:
```tsx
"use client";
import { ThemeProvider as NextThemes } from "next-themes";
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <NextThemes attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>{children}</NextThemes>;
}
```
`components/site/theme-toggle.tsx`:
```tsx
"use client";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
      <Sun className="size-4 dark:hidden" /><Moon className="hidden size-4 dark:block" />
    </Button>
  );
}
```
`components/site/site-header.tsx`:
```tsx
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="font-medium tracking-tight">Stack Stickers</Link>
        <nav className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
          <Link href="/stickers" className="hover:text-neutral-950 dark:hover:text-white">Stickers</Link>
          <Link href="/editor" className="hover:text-neutral-950 dark:hover:text-white">Editor</Link>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <a href="https://github.com/stackstickers/stackstickers" className="text-sm text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white">GitHub</a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
```
`components/site/site-footer.tsx`:
```tsx
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 py-6 text-center text-xs text-neutral-500 dark:border-neutral-800">
      Logos are trademarks of their respective owners. Not affiliated.{" "}
      <Link href="/credits" className="underline underline-offset-2">Request removal →</Link>
    </footer>
  );
}
```
`app/layout.tsx` — keep the scaffold's `Geist`/`Geist_Mono` font setup; set `metadata = { title: "Stack Stickers", description: "Design your laptop stickers from your dev stack." }`; add `suppressHydrationWarning` on `<html>`; body className adds `min-h-dvh flex flex-col bg-white text-neutral-950 antialiased dark:bg-neutral-950 dark:text-neutral-50`; body content:
```tsx
<ThemeProvider>
  <SiteHeader />
  <main className="flex-1">{children}</main>
  <SiteFooter />
</ThemeProvider>
```
`app/page.tsx` (placeholder until Phase 4):
```tsx
import Link from "next/link";
export default function Home() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Stack Stickers</h1>
      <p className="mt-3 text-neutral-500">Stickers of your stack, for your laptop.</p>
      <Link href="/stickers" className="mt-8 inline-block rounded-md border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-100/80 dark:border-neutral-800 dark:hover:bg-neutral-800/50">Browse stickers</Link>
    </section>
  );
}
```
`app/editor/page.tsx`:
```tsx
import Link from "next/link";
export default function EditorPlaceholder() {
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Editor coming soon</h1>
      <Link href="/stickers" className="mt-4 inline-block text-sm underline">Back to stickers</Link>
    </section>
  );
}
```
Remove the scaffold's demo CSS/images not used. In `app/globals.css` keep the Tailwind import and shadcn tokens; ensure `@custom-variant dark (&:is(.dark *));` is present (shadcn init adds it).

- [ ] **Step 6: Legal files**

`LICENSE`: standard MIT text, `Copyright (c) 2026 Paolo Nessim`.
`TRADEMARKS.md`:
```md
# Trademarks

All logos shown on Stack Stickers are trademarks of their respective owners. They are displayed for identification only. Stack Stickers is not affiliated with or endorsed by any of them, and nothing is sold.

Logo artwork comes from open-source collections: simple-icons (CC0), Iconify "logos" (CC0), devicon (MIT) and svgl (MIT). These licenses cover the files, not the trademarks.

**Removal requests:** open an issue at https://github.com/stackstickers/stackstickers/issues or email the maintainer. Removed logos are added to `catalog/curation.json` → `exclude`.
```

- [ ] **Step 7: Verify**

Run: `pnpm test && pnpm lint && pnpm build`
Expected: 1 test passed; lint clean; build succeeds.

- [ ] **Step 8: Commit** — `chore: scaffold Next.js app with svgl-style design system`

---

### Task 2: Shared catalog types, normalization, category mapping

**Files:**
- Create: `lib/catalog/types.ts`, `lib/catalog/normalize.ts`, `scripts/catalog/categories.ts`, `scripts/catalog/source-types.ts`
- Test: `tests/catalog/normalize.test.ts`, `tests/catalog/categories.test.ts`

**Interfaces:**
- Produces (used by every later task):
  - `CATEGORIES`, `type Category`, `type LogoSource`, `type ThemedArt`, `type Logo` (from `@/lib/catalog/types`)
  - `toId(s: string): string`, `toKey(s: string): string`, `titleize(name: string): string`
  - `mapCategories(raw: string[], fallback?: Category): Category[]`
  - `type ThemedSvg`, `type SourceLogo` (from `@/scripts/catalog/source-types`)

- [ ] **Step 1: Types** — `lib/catalog/types.ts`:
```ts
export const CATEGORIES = [
  "ai", "cloud", "hosting", "framework", "library", "language", "database", "devtools",
  "testing", "design", "os", "editor", "crypto", "social", "company", "community",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  ai: "AI", cloud: "Cloud", hosting: "Hosting", framework: "Frameworks", library: "Libraries",
  language: "Languages", database: "Databases", devtools: "Dev tools", testing: "Testing",
  design: "Design", os: "OS", editor: "Editors", crypto: "Crypto", social: "Social",
  company: "Companies", community: "Community",
};

export type LogoSource = "svgl" | "iconify-logos" | "devicon" | "simple-icons";

/** Paths under /logos. `light` = art for light backgrounds, `dark` = art for dark backgrounds. */
export type ThemedArt = { light: string; dark?: string };

export type Logo = {
  id: string;
  title: string;
  categories: Category[];
  aliases: string[];
  hex?: string;
  brandUrl?: string;
  tier: "curated" | "extended";
  source: LogoSource;
  art: { icon: ThemedArt; wordmark?: ThemedArt; mono?: string };
};
```
`scripts/catalog/source-types.ts`:
```ts
import type { Category, LogoSource } from "@/lib/catalog/types";

/** Raw SVG text. `light` = for light backgrounds. */
export type ThemedSvg = { light: string; dark?: string };

export type SourceLogo = {
  source: LogoSource;
  title: string;
  key: string;
  aliases: string[];
  categories: Category[];
  hex?: string;
  brandUrl?: string;
  icon?: ThemedSvg;
  wordmark?: ThemedSvg;
  mono?: string;
};
```

- [ ] **Step 2: Failing tests** — `tests/catalog/normalize.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { titleize, toId, toKey } from "@/lib/catalog/normalize";

describe("toId", () => {
  test.each([
    ["Next.js", "nextjs"], ["Node.js", "nodejs"], ["C++", "cplusplus"], ["C#", "csharp"],
    ["Visual Studio Code", "visual-studio-code"], ["  Tailwind CSS ", "tailwind-css"],
    ["AT&T", "atandt"], ["Vue_js", "vue-js"], ["--weird--", "weird"],
  ])("%s -> %s", (input, out) => expect(toId(input)).toBe(out));
});

test("toKey strips hyphens so naming styles merge", () => {
  expect(toKey("Visual Studio Code")).toBe("visualstudiocode");
  expect(toKey("visualstudiocode")).toBe("visualstudiocode");
  expect(toKey("Tailwind CSS")).toBe(toKey("tailwindcss"));
});

test("titleize", () => {
  expect(titleize("nextjs")).toBe("Nextjs");
  expect(titleize("amazon-web-services")).toBe("Amazon Web Services");
});
```
`tests/catalog/categories.test.ts`:
```ts
import { expect, test } from "vitest";
import { mapCategories } from "@/scripts/catalog/categories";

test("maps svgl and devicon labels, dedupes", () => {
  expect(mapCategories(["AI", "Framework", "framework"]).sort()).toEqual(["ai", "framework"]);
  expect(mapCategories(["programming", "language"])).toEqual(["language"]);
  expect(mapCategories(["Database", "nosql"])).toEqual(["database"]);
});

test("falls back when nothing maps", () => {
  expect(mapCategories(["Banana"])).toEqual(["company"]);
  expect(mapCategories([], "devtools")).toEqual(["devtools"]);
});
```

- [ ] **Step 3: Run** `pnpm test tests/catalog` → FAIL (modules missing).

- [ ] **Step 4: Implement** — `lib/catalog/normalize.ts`:
```ts
export function toId(s: string): string {
  return s
    .toLowerCase()
    .replace(/\+\+/g, "plusplus").replace(/\+/g, "plus")
    .replace(/#/g, "sharp").replace(/&/g, "and")
    .replace(/\./g, "")
    .trim()
    .replace(/[\s_/]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function toKey(s: string): string {
  return toId(s).replace(/-/g, "");
}

export function titleize(name: string): string {
  return name.split(/[-_\s]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}
```
`scripts/catalog/categories.ts`:
```ts
import type { Category } from "@/lib/catalog/types";

const MAP: Record<string, Category> = {
  // svgl
  ai: "ai", software: "company", hardware: "company", library: "library", hosting: "hosting",
  framework: "framework", devtool: "devtools", monorepo: "devtools", cms: "devtools",
  database: "database", compiler: "devtools", crypto: "crypto", cybersecurity: "devtools",
  social: "social", entertainment: "company", browser: "devtools", language: "language",
  education: "community", design: "design", community: "community", marketplace: "company",
  music: "company", vercel: "hosting", google: "company", payment: "company", voidzero: "devtools",
  authentication: "devtools", iot: "devtools", config: "devtools", secrets: "devtools", iac: "cloud",
  analytics: "devtools", "sync engine": "database", platform: "cloud", automation: "devtools",
  nuxt: "framework", microsoft: "company", privacy: "devtools", communications: "company",
  themes: "design", adobe: "design",
  // devicon tags
  nosql: "database", sql: "database", db: "database", relational: "database",
  cloud: "cloud", "cloud-computing-platform": "cloud", serverless: "cloud", kubernetes: "cloud",
  container: "cloud", docker: "cloud", infrastructure: "cloud", "infrastructure-as-code": "cloud",
  editor: "editor", ide: "editor", "text editor": "editor",
  os: "os", "operating system": "os", "operating-system": "os", linux: "os",
  testing: "testing", "test-runner": "testing",
  "machine-learning": "ai", "deep-learning": "ai",
  blockchain: "crypto", ethereum: "crypto", web3: "crypto",
  tool: "devtools", devops: "devtools", "version control": "devtools", "version-control": "devtools",
  git: "devtools", bundler: "devtools", linter: "devtools", "package-manager": "devtools", cli: "devtools",
};

export function mapCategories(raw: string[], fallback: Category = "company"): Category[] {
  const out = new Set<Category>();
  for (const r of raw) {
    const c = MAP[r.trim().toLowerCase()];
    if (c) out.add(c);
  }
  return out.size ? [...out] : [fallback];
}
```

- [ ] **Step 5: Run** `pnpm test tests/catalog` → PASS.

- [ ] **Step 6: Commit** — `feat(catalog): shared types, name normalization, category mapping`

---

### Task 3: Source loaders + svgl fetcher

**Files:**
- Create: `scripts/catalog/sources/simple-icons.ts`, `scripts/catalog/sources/iconify.ts`, `scripts/catalog/sources/devicon.ts`, `scripts/catalog/sources/svgl.ts`, `scripts/catalog/sources/fs.ts`, `scripts/catalog/fetch-svgl.ts`
- Test: `tests/catalog/sources.test.ts`

**Interfaces:**
- Consumes: `SourceLogo`, `toKey`, `titleize`, `mapCategories` (Task 2).
- Produces:
  - `loadSimpleIcons(dir?: string): SourceLogo[]`
  - `loadIconifyLogos(dir?: string): SourceLogo[]`
  - `loadDevicon(dir?: string): SourceLogo[]`
  - `loadSvgl(dir?: string): Promise<SourceLogo[]>`
  - `SVGL_COMMIT: string`, `fetchSvgl(cacheDir?: string): string` (returns dir)

- [ ] **Step 1: Failing tests** — `tests/catalog/sources.test.ts` builds tiny fake package dirs in a temp folder:
```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, test } from "vitest";
import { loadSimpleIcons } from "@/scripts/catalog/sources/simple-icons";
import { loadIconifyLogos } from "@/scripts/catalog/sources/iconify";
import { loadDevicon } from "@/scripts/catalog/sources/devicon";
import { loadSvgl } from "@/scripts/catalog/sources/svgl";

const svg = (label: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>${label}</title><path d="M0 0h24v24H0z"/></svg>`;
let root: string;
const write = (rel: string, content: string) => {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
};

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "ss-sources-"));
  write("si/data/simple-icons.json", JSON.stringify([
    { title: "Next.js", slug: "nextdotjs", hex: "000000", source: "x", guidelines: "https://vercel.com/design/brands" },
    { title: ".ENV", slug: "dotenv", hex: "ECD53F", source: "x", aliases: { aka: ["Dotenv"] } },
  ]));
  write("si/icons/nextdotjs.svg", svg("si-next"));
  write("si/icons/dotenv.svg", svg("si-dotenv"));

  write("iconify/icons.json", JSON.stringify({
    prefix: "logos", width: 256, height: 256,
    icons: {
      "nextjs-icon": { body: "<path d='icon'/>" },
      nextjs: { body: "<path d='wordmark'/>", width: 512, height: 128 },
      docker: { body: "<path d='docker'/>" },
      secret: { body: "<path/>", hidden: true },
    },
  }));

  write("devicon/devicon.json", JSON.stringify([
    { name: "nextjs", altnames: [], tags: ["framework"], versions: { svg: ["original", "original-wordmark", "plain"] }, color: "#000" },
    { name: "fontonly", altnames: [], tags: [], versions: { svg: [], font: ["plain"] }, color: "#fff" },
    { name: "ghostwm", altnames: [], tags: ["tool"], versions: { svg: ["plain", "plain-wordmark"] }, color: "#111" },
  ]));
  write("devicon/icons/nextjs/nextjs-original.svg", svg("dv-next"));
  write("devicon/icons/nextjs/nextjs-original-wordmark.svg", svg("dv-next-wm"));
  write("devicon/icons/ghostwm/ghostwm-plain.svg", svg("dv-ghost")); // wordmark file intentionally missing

  write("svgl/src/data/svgs.ts", `export const svgs = [
    { title: "Next.js", category: ["Framework", "Vercel"], route: { light: "/library/next-light.svg", dark: "/library/next-dark.svg" }, wordmark: "/library/next-wm.svg", url: "https://nextjs.org", brandUrl: "https://vercel.com/geist/brands" },
    { title: "Supabase", category: "Database", route: "/library/supabase.svg", url: "https://supabase.com" },
  ];`);
  write("svgl/static/library/next-light.svg", svg("svgl-next-light"));
  write("svgl/static/library/next-dark.svg", svg("svgl-next-dark"));
  write("svgl/static/library/next-wm.svg", svg("svgl-next-wm"));
  write("svgl/static/library/supabase.svg", svg("svgl-supabase"));
});

describe("simple-icons", () => {
  test("loads title, key, hex, guidelines, mono art, aliases", () => {
    const out = loadSimpleIcons(path.join(root, "si"));
    const next = out.find((l) => l.key === "nextjs")!;
    expect(next).toMatchObject({ source: "simple-icons", title: "Next.js", hex: "000000", brandUrl: "https://vercel.com/design/brands" });
    expect(next.mono).toContain("si-next");
    expect(next.icon).toBeUndefined();
    expect(out.find((l) => l.key === "env")!.aliases).toEqual(["dotenv", "Dotenv"]);
  });
});

describe("iconify logos", () => {
  test("prefers -icon as icon, base as wordmark, skips hidden", () => {
    const out = loadIconifyLogos(path.join(root, "iconify"));
    const next = out.find((l) => l.key === "nextjs")!;
    expect(next.icon!.light).toContain("icon");
    expect(next.icon!.light).toContain('viewBox="0 0 256 256"');
    expect(next.wordmark!.light).toContain('viewBox="0 0 512 128"');
    expect(out.find((l) => l.key === "docker")!.wordmark).toBeUndefined();
    expect(out.find((l) => l.key === "secret")).toBeUndefined();
  });
});

describe("devicon", () => {
  test("picks original then plain, wordmark only when file exists, skips font-only", () => {
    const out = loadDevicon(path.join(root, "devicon"));
    const next = out.find((l) => l.key === "nextjs")!;
    expect(next.icon!.light).toContain("dv-next");
    expect(next.wordmark!.light).toContain("dv-next-wm");
    expect(next.categories).toEqual(["framework"]);
    expect(next.hex).toBe("000");
    expect(out.find((l) => l.key === "fontonly")).toBeUndefined();
    expect(out.find((l) => l.key === "ghostwm")!.wordmark).toBeUndefined();
  });
});

describe("svgl", () => {
  test("loads themed routes, wordmarks, categories", async () => {
    const out = await loadSvgl(path.join(root, "svgl"));
    const next = out.find((l) => l.key === "nextjs")!;
    expect(next.icon!.light).toContain("svgl-next-light");
    expect(next.icon!.dark).toContain("svgl-next-dark");
    expect(next.wordmark!.light).toContain("svgl-next-wm");
    expect(next.categories.sort()).toEqual(["framework", "hosting"]);
    expect(next.brandUrl).toBe("https://vercel.com/geist/brands");
    expect(out.find((l) => l.key === "supabase")!.categories).toEqual(["database"]);
  });
});
```

- [ ] **Step 2: Run** `pnpm test tests/catalog/sources.test.ts` → FAIL.

- [ ] **Step 3: Implement**

`scripts/catalog/sources/fs.ts`:
```ts
import fs from "node:fs";
import path from "node:path";

export const pkgDir = (name: string) => path.join(process.cwd(), "node_modules", name);
export const readText = (p: string) => fs.readFileSync(p, "utf8");
export const readIfExists = (p: string) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : undefined);
```
`scripts/catalog/sources/simple-icons.ts`:
```ts
import path from "node:path";
import { toKey } from "@/lib/catalog/normalize";
import type { SourceLogo } from "../source-types";
import { pkgDir, readIfExists, readText } from "./fs";

type Entry = { title: string; slug: string; hex: string; guidelines?: string; aliases?: { aka?: string[] } };

export function loadSimpleIcons(dir = pkgDir("simple-icons")): SourceLogo[] {
  const entries: Entry[] = JSON.parse(readText(path.join(dir, "data", "simple-icons.json")));
  return entries.flatMap((e) => {
    const mono = readIfExists(path.join(dir, "icons", `${e.slug}.svg`));
    if (!mono) return [];
    return [{
      source: "simple-icons" as const,
      title: e.title,
      key: toKey(e.title),
      aliases: [e.slug, ...(e.aliases?.aka ?? [])],
      categories: [],
      hex: e.hex,
      brandUrl: e.guidelines,
      mono,
    }];
  });
}
```
`scripts/catalog/sources/iconify.ts`:
```ts
import path from "node:path";
import { titleize, toKey } from "@/lib/catalog/normalize";
import type { SourceLogo } from "../source-types";
import { pkgDir, readText } from "./fs";

type Icon = { body: string; width?: number; height?: number; left?: number; top?: number; hidden?: boolean };
type IconSet = { icons: Record<string, Icon>; width?: number; height?: number };

export function loadIconifyLogos(dir = pkgDir("@iconify-json/logos")): SourceLogo[] {
  const set: IconSet = JSON.parse(readText(path.join(dir, "icons.json")));
  const visible = Object.keys(set.icons).filter((n) => !set.icons[n].hidden);
  const toSvg = (name: string) => {
    const ic = set.icons[name];
    const w = ic.width ?? set.width ?? 16;
    const h = ic.height ?? set.height ?? 16;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ic.left ?? 0} ${ic.top ?? 0} ${w} ${h}">${ic.body}</svg>`;
  };
  const bases = [...new Set(visible.map((n) => n.replace(/-icon$/, "")))];
  return bases.map((base) => {
    const iconName = visible.includes(`${base}-icon`) ? `${base}-icon` : base;
    const hasWordmark = iconName !== base && visible.includes(base);
    return {
      source: "iconify-logos" as const,
      title: titleize(base),
      key: toKey(base),
      aliases: [base],
      categories: [],
      icon: { light: toSvg(iconName) },
      wordmark: hasWordmark ? { light: toSvg(base) } : undefined,
    };
  });
}
```
`scripts/catalog/sources/devicon.ts`:
```ts
import path from "node:path";
import { titleize, toKey } from "@/lib/catalog/normalize";
import { mapCategories } from "../categories";
import type { SourceLogo } from "../source-types";
import { pkgDir, readIfExists, readText } from "./fs";

type Entry = { name: string; altnames: string[]; tags: string[]; versions: { svg: string[] }; color?: string };

export function loadDevicon(dir = pkgDir("devicon")): SourceLogo[] {
  const entries: Entry[] = JSON.parse(readText(path.join(dir, "devicon.json")));
  return entries.flatMap((e) => {
    const file = (v: string) => readIfExists(path.join(dir, "icons", e.name, `${e.name}-${v}.svg`));
    const icon = ["original", "plain"].filter((v) => e.versions.svg.includes(v)).map(file).find(Boolean);
    if (!icon) return [];
    const wordmark = ["original-wordmark", "plain-wordmark"].filter((v) => e.versions.svg.includes(v)).map(file).find(Boolean);
    return [{
      source: "devicon" as const,
      title: titleize(e.name),
      key: toKey(e.name),
      aliases: [e.name, ...e.altnames],
      categories: mapCategories(e.tags, "devtools"),
      hex: e.color?.replace(/^#/, ""),
      icon: { light: icon },
      wordmark: wordmark ? { light: wordmark } : undefined,
    }];
  });
}
```
`scripts/catalog/sources/svgl.ts`:
```ts
import path from "node:path";
import { pathToFileURL } from "node:url";
import { toKey } from "@/lib/catalog/normalize";
import { mapCategories } from "../categories";
import type { SourceLogo, ThemedSvg } from "../source-types";
import { readIfExists } from "./fs";

type Route = string | { light: string; dark: string };
type Entry = { title: string; category: string | string[]; route: Route; wordmark?: Route; brandUrl?: string };

export async function loadSvgl(dir = path.join(process.cwd(), ".cache", "svgl")): Promise<SourceLogo[]> {
  const mod = await import(pathToFileURL(path.join(dir, "src", "data", "svgs.ts")).href);
  const entries: Entry[] = mod.svgs;
  const read = (r: string) => readIfExists(path.join(dir, "static", r.replace(/^\//, "")));
  const themed = (r: Route): ThemedSvg | undefined => {
    if (typeof r === "string") {
      const light = read(r);
      return light ? { light } : undefined;
    }
    const light = read(r.light);
    if (!light) return undefined;
    return { light, dark: read(r.dark) };
  };
  return entries.flatMap((e) => {
    const icon = themed(e.route);
    if (!icon) return [];
    return [{
      source: "svgl" as const,
      title: e.title,
      key: toKey(e.title),
      aliases: [],
      categories: mapCategories(Array.isArray(e.category) ? e.category : [e.category]),
      brandUrl: e.brandUrl,
      icon,
      wordmark: e.wordmark ? themed(e.wordmark) : undefined,
    }];
  });
}
```
`scripts/catalog/fetch-svgl.ts`:
```ts
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const SVGL_COMMIT = "ecb9adaafe41c578742e94fce90e6cc03c48a574";

export function fetchSvgl(cacheDir = path.join(process.cwd(), ".cache", "svgl")): string {
  const marker = path.join(cacheDir, ".commit");
  if (fs.existsSync(marker) && fs.readFileSync(marker, "utf8").trim() === SVGL_COMMIT) return cacheDir;
  fs.rmSync(cacheDir, { recursive: true, force: true });
  fs.mkdirSync(cacheDir, { recursive: true });
  const url = `https://codeload.github.com/pheralb/svgl/tar.gz/${SVGL_COMMIT}`;
  execFileSync("bash", ["-c", `curl -fsSL "${url}" | tar -xz -C "${cacheDir}" --strip-components=1`], { stdio: "inherit" });
  fs.writeFileSync(marker, SVGL_COMMIT);
  return cacheDir;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`svgl ready at ${fetchSvgl()}`);
}
```

- [ ] **Step 4: Run** `pnpm test tests/catalog/sources.test.ts` → PASS. Then `pnpm catalog:fetch` → prints `svgl ready at …/.cache/svgl` and `.cache/svgl/src/data/svgs.ts` exists.

- [ ] **Step 5: Commit** — `feat(catalog): source loaders for simple-icons, iconify, devicon, svgl`

---

### Task 4: SVG sanitize + optimize

**Files:**
- Create: `scripts/catalog/sanitize.ts`
- Test: `tests/catalog/sanitize.test.ts`

**Interfaces:**
- Produces: `MAX_SVG_BYTES = 30 * 1024`; `sanitizeSvg(svg: string, idPrefix: string): string | null` — returns optimized SVG with a `viewBox`, no width/height, no scripts/event handlers/external refs/foreignObject, all ids prefixed with `idPrefix`; `null` when unparseable, no derivable viewBox, or > 30 KB.

- [ ] **Step 1: Failing tests** — `tests/catalog/sanitize.test.ts`:
```ts
import { expect, test } from "vitest";
import { MAX_SVG_BYTES, sanitizeSvg } from "@/scripts/catalog/sanitize";

const wrap = (inner: string, attrs = 'viewBox="0 0 24 24"') => `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${inner}</svg>`;

test("strips scripts, event handlers, external refs, foreignObject", () => {
  const out = sanitizeSvg(wrap(
    `<script>alert(1)</script><rect width="10" height="10" onload="alert(1)"/>` +
    `<image href="https://evil.example/x.png" width="5" height="5"/>` +
    `<foreignObject><div>hi</div></foreignObject><path d="M0 0h24v24H0z"/>`), "t-")!;
  expect(out).not.toMatch(/script|onload|evil\.example|foreignObject/i);
  expect(out).toContain("<path");
});

test("prefixes ids and their references", () => {
  const out = sanitizeSvg(wrap(
    `<defs><linearGradient id="g"><stop offset="0" stop-color="#f00"/><stop offset="1" stop-color="#00f"/></linearGradient></defs>` +
    `<rect width="24" height="24" fill="url(#g)"/>`), "nextjs-icon-light-")!;
  expect(out).toMatch(/id="nextjs-icon-light-/);
  expect(out).toMatch(/url\(#nextjs-icon-light-/);
});

test("derives viewBox from width/height and drops dimensions", () => {
  const out = sanitizeSvg(wrap(`<path d="M0 0h48v48H0z"/>`, 'width="48" height="48"'), "t-")!;
  expect(out).toContain('viewBox="0 0 48 48"');
  expect(out).not.toMatch(/\swidth="48"/);
});

test("rejects svg without derivable viewBox, garbage, and oversize", () => {
  expect(sanitizeSvg(wrap(`<path d="M0 0h1v1z"/>`, ""), "t-")).toBeNull();
  expect(sanitizeSvg("not an svg <<<", "t-")).toBeNull();
  const huge = wrap(Array.from({ length: 4000 }, (_, i) => `<circle cx="${i}" cy="${i * 7 % 997}" r="${i % 13 + 1}" fill="#${(i * 2654435761 % 0xffffff).toString(16).padStart(6, "0")}"/>`).join(""));
  expect(huge.length).toBeGreaterThan(MAX_SVG_BYTES);
  expect(sanitizeSvg(huge, "t-")).toBeNull();
});

test("two logos with the same internal id no longer collide", () => {
  const src = wrap(`<defs><clipPath id="a"><rect width="5" height="5"/></clipPath></defs><path clip-path="url(#a)" d="M0 0h24v24H0z"/>`);
  const a = sanitizeSvg(src, "one-")!;
  const b = sanitizeSvg(src, "two-")!;
  const ids = (s: string) => [...s.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  expect(ids(a).some((id) => ids(b).includes(id))).toBe(false);
});
```

- [ ] **Step 2: Run** `pnpm test tests/catalog/sanitize.test.ts` → FAIL.

- [ ] **Step 3: Implement** — `scripts/catalog/sanitize.ts`:
```ts
import { optimize, type CustomPlugin } from "svgo";

export const MAX_SVG_BYTES = 30 * 1024;

const ensureViewBox: CustomPlugin = {
  name: "ensureViewBox",
  fn: () => ({
    element: {
      enter(node, parent) {
        if (node.name !== "svg" || parent.type !== "root" || node.attributes.viewBox) return;
        const w = parseFloat(node.attributes.width ?? "");
        const h = parseFloat(node.attributes.height ?? "");
        if (w > 0 && h > 0) node.attributes.viewBox = `0 0 ${w} ${h}`;
      },
    },
  }),
};

const removeExternalRefs: CustomPlugin = {
  name: "removeExternalRefs",
  fn: () => ({
    element: {
      enter(node, parent) {
        if (node.name === "foreignObject") {
          parent.children = parent.children.filter((c) => c !== node);
          return;
        }
        for (const attr of ["href", "xlink:href"]) {
          const v = node.attributes[attr];
          if (v !== undefined && !v.startsWith("#") && !v.startsWith("data:image/")) delete node.attributes[attr];
        }
      },
    },
  }),
};

export function sanitizeSvg(svg: string, idPrefix: string): string | null {
  let data: string;
  try {
    data = optimize(svg, {
      multipass: true,
      plugins: [
        ensureViewBox,
        removeExternalRefs,
        "preset-default",
        "removeScripts",
        "removeDimensions",
        { name: "prefixIds", params: { prefix: idPrefix, delim: "" } },
      ],
    }).data;
  } catch {
    return null;
  }
  if (!/^<svg\b[^>]*\sviewBox="/.test(data)) return null;
  if (Buffer.byteLength(data, "utf8") > MAX_SVG_BYTES) return null;
  return data;
}
```
If `removeScripts` is not a valid builtin name in the installed svgo (check `node_modules/svgo/plugins/`), use `removeScriptElement` instead and keep the test unchanged.

- [ ] **Step 4: Run** → PASS.

- [ ] **Step 5: Commit** — `feat(catalog): svgo-based SVG sanitizer with id prefixing`

---

### Task 5: Merge sources + curation

**Files:**
- Create: `scripts/catalog/merge.ts`, `catalog/curation.json`
- Test: `tests/catalog/merge.test.ts`

**Interfaces:**
- Consumes: `SourceLogo`, `ThemedSvg`, `Category`, `LogoSource` (Task 2).
- Produces:
```ts
export type Curation = {
  include: string[]; exclude: string[];
  merge: Record<string, string>;            // key -> canonical key
  preferSource: Record<string, LogoSource>; // id -> art source to try first
  categories: Record<string, Category[]>;   // id -> override
  titles: Record<string, string>;           // id -> override
};
export type ArtCandidate = { source: LogoSource; art: ThemedSvg };
export type MergedLogo = {
  id: string; title: string; categories: Category[]; aliases: string[];
  hex?: string; brandUrl?: string; tier: "curated" | "extended";
  sources: LogoSource[]; icon: ArtCandidate[]; wordmark: ArtCandidate[]; mono?: string;
};
export const ART_ORDER: LogoSource[]; // ["svgl","iconify-logos","devicon","simple-icons"]
export function mergeSources(all: SourceLogo[], curation: Curation): MergedLogo[];
```

- [ ] **Step 1: Failing tests** — `tests/catalog/merge.test.ts`:
```ts
import { expect, test } from "vitest";
import { mergeSources, type Curation } from "@/scripts/catalog/merge";
import type { SourceLogo } from "@/scripts/catalog/source-types";

const empty: Curation = { include: [], exclude: [], merge: {}, preferSource: {}, categories: {}, titles: {} };
const s = (p: Partial<SourceLogo> & Pick<SourceLogo, "source" | "key">): SourceLogo =>
  ({ title: p.key, aliases: [], categories: [], ...p });

const next = [
  s({ source: "simple-icons", key: "nextjs", title: "Next.js", hex: "000000", brandUrl: "si-brand", mono: "<svg>mono</svg>", aliases: ["nextdotjs"] }),
  s({ source: "iconify-logos", key: "nextjs", title: "Nextjs", icon: { light: "<svg>iconify</svg>" } }),
  s({ source: "devicon", key: "nextjs", title: "Nextjs", categories: ["framework"], icon: { light: "<svg>devicon</svg>" } }),
  s({ source: "svgl", key: "nextjs", title: "Next.js", categories: ["framework", "hosting"], brandUrl: "svgl-brand", icon: { light: "<svg>svgl-l</svg>", dark: "<svg>svgl-d</svg>" } }),
];

test("merges by key with art order svgl > iconify > devicon, title/hex/brand from simple-icons", () => {
  const [m] = mergeSources(next, empty);
  expect(m.id).toBe("nextjs");
  expect(m.title).toBe("Next.js");
  expect(m.hex).toBe("000000");
  expect(m.brandUrl).toBe("si-brand");
  expect(m.icon.map((c) => c.source)).toEqual(["svgl", "iconify-logos", "devicon"]);
  expect(m.mono).toBe("<svg>mono</svg>");
  expect(m.categories.sort()).toEqual(["framework", "hosting"]);
  expect(m.aliases).toContain("nextdotjs");
  expect(m.sources.sort()).toEqual(["devicon", "iconify-logos", "simple-icons", "svgl"]);
  expect(m.tier).toBe("curated");
});

test("curation.merge folds keys together", () => {
  const out = mergeSources([
    s({ source: "svgl", key: "aws", title: "AWS", icon: { light: "<svg/>" } }),
    s({ source: "simple-icons", key: "amazonwebservices", title: "Amazon Web Services", mono: "<svg/>" }),
  ], { ...empty, merge: { aws: "amazonwebservices" } });
  expect(out).toHaveLength(1);
  expect(out[0].id).toBe("amazonwebservices");
});

test("exclude removes; mono-only is extended; devicon-only colour is curated; include promotes", () => {
  const out = mergeSources([
    s({ source: "simple-icons", key: "monoonly", mono: "<svg/>" }),
    s({ source: "devicon", key: "dvonly", icon: { light: "<svg/>" } }),
    s({ source: "iconify-logos", key: "iconifyonly", icon: { light: "<svg/>" } }),
    s({ source: "iconify-logos", key: "promoted", icon: { light: "<svg/>" } }),
    s({ source: "svgl", key: "gone", icon: { light: "<svg/>" } }),
  ], { ...empty, exclude: ["gone"], include: ["promoted"] });
  const tier = (id: string) => out.find((l) => l.id === id)?.tier;
  expect(tier("gone")).toBeUndefined();
  expect(tier("monoonly")).toBe("extended");
  expect(tier("dvonly")).toBe("curated");
  expect(tier("iconifyonly")).toBe("extended");
  expect(tier("promoted")).toBe("curated");
});

test("preferSource, category and title overrides; no categories -> company", () => {
  const [m] = mergeSources(next, { ...empty, preferSource: { nextjs: "devicon" }, categories: { nextjs: ["framework"] }, titles: { nextjs: "Next" } });
  expect(m.icon[0].source).toBe("devicon");
  expect(m.categories).toEqual(["framework"]);
  expect(m.title).toBe("Next");
  const [plain] = mergeSources([s({ source: "simple-icons", key: "x", mono: "<svg/>" })], empty);
  expect(plain.categories).toEqual(["company"]);
});

test("drops entries with no art at all; keeps first duplicate per source", () => {
  const out = mergeSources([
    s({ source: "svgl", key: "dup", title: "First", icon: { light: "<svg>1</svg>" } }),
    s({ source: "svgl", key: "dup", title: "Second", icon: { light: "<svg>2</svg>" } }),
    s({ source: "svgl", key: "noart" }),
  ], empty);
  expect(out.map((l) => l.id)).toEqual(["dup"]);
  expect(out[0].icon).toHaveLength(1);
  expect(out[0].icon[0].art.light).toBe("<svg>1</svg>");
});
```

- [ ] **Step 2: Run** `pnpm test tests/catalog/merge.test.ts` → FAIL.

- [ ] **Step 3: Implement** — `scripts/catalog/merge.ts`:
```ts
import type { Category, LogoSource } from "@/lib/catalog/types";
import type { SourceLogo, ThemedSvg } from "./source-types";

export type Curation = {
  include: string[]; exclude: string[];
  merge: Record<string, string>;
  preferSource: Record<string, LogoSource>;
  categories: Record<string, Category[]>;
  titles: Record<string, string>;
};
export type ArtCandidate = { source: LogoSource; art: ThemedSvg };
export type MergedLogo = {
  id: string; title: string; categories: Category[]; aliases: string[];
  hex?: string; brandUrl?: string; tier: "curated" | "extended";
  sources: LogoSource[]; icon: ArtCandidate[]; wordmark: ArtCandidate[]; mono?: string;
};

export const ART_ORDER: LogoSource[] = ["svgl", "iconify-logos", "devicon", "simple-icons"];
const TITLE_ORDER: LogoSource[] = ["simple-icons", "svgl", "devicon", "iconify-logos"];
const CURATED_SOURCES: LogoSource[] = ["svgl", "devicon"];

export function mergeSources(all: SourceLogo[], curation: Curation): MergedLogo[] {
  const groups = new Map<string, Map<LogoSource, SourceLogo>>();
  for (const entry of all) {
    const id = curation.merge[entry.key] ?? entry.key;
    if (!id || curation.exclude.includes(id)) continue;
    const group = groups.get(id) ?? new Map<LogoSource, SourceLogo>();
    if (!group.has(entry.source)) group.set(entry.source, entry);
    groups.set(id, group);
  }

  const out: MergedLogo[] = [];
  for (const [id, group] of groups) {
    const pick = (order: LogoSource[]) => order.map((src) => group.get(src)).filter((e): e is SourceLogo => !!e);
    const preferred = curation.preferSource[id];
    const artOrder = preferred ? [preferred, ...ART_ORDER.filter((s) => s !== preferred)] : ART_ORDER;
    const icon = pick(artOrder).filter((e) => e.icon).map((e) => ({ source: e.source, art: e.icon! }));
    const wordmark = pick(artOrder).filter((e) => e.wordmark).map((e) => ({ source: e.source, art: e.wordmark! }));
    const mono = group.get("simple-icons")?.mono;
    if (!icon.length && !mono) continue;

    const byTitle = pick(TITLE_ORDER);
    const categories = curation.categories[id] ?? [...new Set(byTitle.flatMap((e) => e.categories))];
    const sources = [...group.keys()];
    const curated = curation.include.includes(id) || (icon.length > 0 && sources.some((s) => CURATED_SOURCES.includes(s)));

    out.push({
      id,
      title: curation.titles[id] ?? byTitle[0].title,
      categories: categories.length ? categories : ["company"],
      aliases: [...new Set(byTitle.flatMap((e) => e.aliases))],
      hex: byTitle.find((e) => e.hex)?.hex,
      brandUrl: byTitle.find((e) => e.brandUrl)?.brandUrl,
      tier: curated ? "curated" : "extended",
      sources,
      icon,
      wordmark,
      mono,
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}
```
`catalog/curation.json`:
```json
{
  "include": [],
  "exclude": [],
  "merge": {
    "aws": "amazonwebservices",
    "vscode": "visualstudiocode",
    "golang": "go",
    "postgres": "postgresql",
    "k8s": "kubernetes",
    "tailwind": "tailwindcss"
  },
  "preferSource": {},
  "categories": {},
  "titles": {}
}
```

- [ ] **Step 4: Run** → PASS.

- [ ] **Step 5: Commit** — `feat(catalog): merge sources with curation overrides`

---

### Task 6: Emit catalog + build script + generated assets

**Files:**
- Create: `scripts/catalog/emit.ts`, `scripts/catalog/build.ts`
- Test: `tests/catalog/emit.test.ts`, `tests/catalog/catalog.test.ts`
- Generated (commit): `catalog/logos.json`, `public/catalog/curated.json`, `public/catalog/extended.json`, `public/logos/**`

**Interfaces:**
- Consumes: Tasks 2–5 (`mergeSources`, `sanitizeSvg`, loaders, `fetchSvgl`, `Curation`, `MergedLogo`, `Logo`).
- Produces: `emitCatalog(merged: MergedLogo[], root: string): Logo[]`; committed `catalog/logos.json` (all `Logo[]`, sorted by id) consumed by the app.

- [ ] **Step 1: Failing test** — `tests/catalog/emit.test.ts`:
```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { emitCatalog } from "@/scripts/catalog/emit";
import type { MergedLogo } from "@/scripts/catalog/merge";

const ok = (label: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/><desc>${label}</desc></svg>`;
const base = { categories: ["framework" as const], aliases: [], wordmark: [], sources: [] as MergedLogo["sources"] };

test("writes files, picks first sanitizable candidate, falls back to mono, demotes curated without colour art", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ss-emit-"));
  const logos = emitCatalog([
    { ...base, id: "alpha", title: "Alpha", tier: "curated",
      icon: [{ source: "svgl", art: { light: "<<broken", dark: ok("d") } }, { source: "devicon", art: { light: ok("dv") } }],
      wordmark: [{ source: "svgl", art: { light: ok("wm") } }], mono: ok("mono") },
    { ...base, id: "beta", title: "Beta", tier: "curated", icon: [{ source: "svgl", art: { light: "<<broken" } }], mono: ok("mono") },
  ], root);

  const alpha = logos.find((l) => l.id === "alpha")!;
  expect(alpha.source).toBe("devicon");
  expect(alpha.art.icon).toEqual({ light: "/logos/alpha/icon-light.svg" });
  expect(alpha.art.wordmark).toEqual({ light: "/logos/alpha/wordmark-light.svg" });
  expect(alpha.art.mono).toBe("/logos/alpha/mono.svg");
  expect(fs.existsSync(path.join(root, "public/logos/alpha/icon-light.svg"))).toBe(true);

  const beta = logos.find((l) => l.id === "beta")!;
  expect(beta.source).toBe("simple-icons");
  expect(beta.art.icon.light).toBe("/logos/beta/mono.svg");
  expect(beta.tier).toBe("extended");

  const all = JSON.parse(fs.readFileSync(path.join(root, "catalog/logos.json"), "utf8"));
  expect(all).toHaveLength(2);
  const curated = JSON.parse(fs.readFileSync(path.join(root, "public/catalog/curated.json"), "utf8"));
  expect(curated.map((l: { id: string }) => l.id)).toEqual(["alpha"]);
});
```
`tests/catalog/catalog.test.ts` (runs against the committed catalog):
```ts
import fs from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import logos from "@/catalog/logos.json";
import { CATEGORIES, type Logo } from "@/lib/catalog/types";

const all = logos as Logo[];
const paths = (l: Logo) => [l.art.icon.light, l.art.icon.dark, l.art.wordmark?.light, l.art.wordmark?.dark, l.art.mono].filter(Boolean) as string[];

test("ids are unique", () => expect(new Set(all.map((l) => l.id)).size).toBe(all.length));
test("every art file exists", () => {
  for (const l of all) for (const p of paths(l)) expect(fs.existsSync(path.join("public", p)), `${l.id}: ${p}`).toBe(true);
});
test("categories are from the fixed list", () => {
  for (const l of all) for (const c of l.categories) expect(CATEGORIES).toContain(c);
});
test("curated set is a useful size and all colour", () => {
  const curated = all.filter((l) => l.tier === "curated");
  expect(curated.length).toBeGreaterThanOrEqual(400);
  for (const l of curated) expect(l.source, l.id).not.toBe("simple-icons");
});
test("key dev brands are present and curated", () => {
  for (const id of ["nextjs", "react", "typescript", "vercel", "github", "supabase", "tailwindcss", "docker", "python", "nodejs"]) {
    expect(all.find((l) => l.id === id)?.tier, id).toBe("curated");
  }
});
```

- [ ] **Step 2: Run** `pnpm test tests/catalog/emit.test.ts` → FAIL.

- [ ] **Step 3: Implement** — `scripts/catalog/emit.ts`:
```ts
import fs from "node:fs";
import path from "node:path";
import type { Logo, ThemedArt } from "@/lib/catalog/types";
import type { ArtCandidate, MergedLogo } from "./merge";
import { sanitizeSvg } from "./sanitize";

export function emitCatalog(merged: MergedLogo[], root: string): Logo[] {
  const logosDir = path.join(root, "public", "logos");
  fs.rmSync(logosDir, { recursive: true, force: true });

  const write = (id: string, slot: string, svg: string | undefined): string | undefined => {
    if (!svg) return undefined;
    const clean = sanitizeSvg(svg, `${id}-${slot}-`);
    if (!clean) return undefined;
    fs.mkdirSync(path.join(logosDir, id), { recursive: true });
    fs.writeFileSync(path.join(logosDir, id, `${slot}.svg`), clean);
    return `/logos/${id}/${slot}.svg`;
  };
  const firstThemed = (id: string, kind: "icon" | "wordmark", cands: ArtCandidate[]) => {
    for (const c of cands) {
      const light = write(id, `${kind}-light`, c.art.light);
      if (!light) continue;
      const dark = write(id, `${kind}-dark`, c.art.dark);
      const art: ThemedArt = dark ? { light, dark } : { light };
      return { source: c.source, art };
    }
    return undefined;
  };

  const logos: Logo[] = [];
  for (const m of merged) {
    const icon = firstThemed(m.id, "icon", m.icon);
    const wordmark = firstThemed(m.id, "wordmark", m.wordmark);
    const mono = write(m.id, "mono", m.mono);
    if (!icon && !mono) continue;
    logos.push({
      id: m.id,
      title: m.title,
      categories: m.categories,
      aliases: m.aliases,
      ...(m.hex ? { hex: m.hex } : {}),
      ...(m.brandUrl ? { brandUrl: m.brandUrl } : {}),
      tier: icon ? m.tier : "extended",
      source: icon ? icon.source : "simple-icons",
      art: {
        icon: icon ? icon.art : { light: mono! },
        ...(wordmark ? { wordmark: wordmark.art } : {}),
        ...(mono ? { mono } : {}),
      },
    });
  }

  const writeJson = (rel: string, data: unknown) => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), JSON.stringify(data));
  };
  writeJson("catalog/logos.json", logos);
  writeJson("public/catalog/curated.json", logos.filter((l) => l.tier === "curated"));
  writeJson("public/catalog/extended.json", logos.filter((l) => l.tier === "extended"));
  return logos;
}
```
`scripts/catalog/build.ts`:
```ts
import fs from "node:fs";
import path from "node:path";
import { emitCatalog } from "./emit";
import { fetchSvgl } from "./fetch-svgl";
import { mergeSources, type Curation } from "./merge";
import { loadDevicon } from "./sources/devicon";
import { loadIconifyLogos } from "./sources/iconify";
import { loadSimpleIcons } from "./sources/simple-icons";
import { loadSvgl } from "./sources/svgl";

async function main() {
  const root = process.cwd();
  const svglDir = fetchSvgl();
  const all = [...loadSimpleIcons(), ...loadIconifyLogos(), ...loadDevicon(), ...(await loadSvgl(svglDir))];
  const curation: Curation = JSON.parse(fs.readFileSync(path.join(root, "catalog", "curation.json"), "utf8"));
  const merged = mergeSources(all, curation);
  const logos = emitCatalog(merged, root);
  const curated = logos.filter((l) => l.tier === "curated").length;
  const bySource = Object.groupBy(logos, (l) => l.source);
  console.log(`source entries: ${all.length}`);
  console.log(`logos: ${logos.length} (curated ${curated}, extended ${logos.length - curated})`);
  console.log(`art source: ${Object.entries(bySource).map(([k, v]) => `${k}=${v?.length}`).join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 4: Run** `pnpm test tests/catalog/emit.test.ts` → PASS.

- [ ] **Step 5: Build the real catalog** — `pnpm catalog:build`
Expected: prints counts; `catalog/logos.json` exists. Then `pnpm test tests/catalog/catalog.test.ts`.
If "key dev brands" fails for an id, find the actual id with `node -e "const l=require('./catalog/logos.json');console.log(l.filter(x=>/next|tailwind|node/i.test(x.title)).map(x=>x.id+' '+x.tier+' '+x.source))"` and add a `merge` entry (e.g. `"tailwind-css": "tailwindcss"`) or `include` entry to `catalog/curation.json`, rebuild, re-run. If curated < 400 add the most common iconify-only dev brands to `include`. If curated > 1500, that is acceptable for v1 — note the number in the commit message.

- [ ] **Step 6: Run full suite** `pnpm test` → all PASS.

- [ ] **Step 7: Commit** — `feat(catalog): emit pipeline and generated logo catalog` (include generated files).

---

### Task 7: Client catalog libraries + sticker renderer

**Files:**
- Create: `lib/catalog/search.ts`, `lib/catalog/favorites.ts`, `lib/catalog/counts.ts`, `lib/catalog/download.ts`, `lib/render/sticker.ts`
- Test: `tests/catalog/search.test.ts`, `tests/catalog/favorites.test.ts`, `tests/catalog/counts.test.ts`, `tests/render/sticker.test.ts`

**Interfaces:**
- Consumes: `Logo`, `Category`, `CATEGORIES` (Task 2), `toKey` (Task 2).
- Produces:
  - `createSearch(logos: Logo[]): (query: string) => Logo[]`
  - `FAVORITES_KEY = "ss:favorites"`; `createFavoritesStore(storage: Pick<Storage, "getItem" | "setItem"> | null): { list(): string[]; has(id: string): boolean; toggle(id: string): boolean }`; `browserStorage(): Storage | null`
  - `categoryCounts(logos: Logo[]): Record<Category, number>`
  - `fetchText(url: string): Promise<string>`, `downloadBlob(blob: Blob, filename: string): void`, `svgToPngBlob(svg: string, px?: number): Promise<Blob>`
  - `type StickerShape = "diecut" | "circle" | "hex" | "square"`; `parseSvg(svg: string): { viewBox: string; inner: string } | null`; `renderStickerSvg(artSvg: string, opts: { shape: StickerShape; size?: number }): string`

- [ ] **Step 1: Failing tests**

`tests/catalog/search.test.ts`:
```ts
import { expect, test } from "vitest";
import { createSearch } from "@/lib/catalog/search";
import type { Logo } from "@/lib/catalog/types";

const logo = (id: string, title: string, aliases: string[] = []): Logo =>
  ({ id, title, aliases, categories: ["language"], tier: "curated", source: "devicon", art: { icon: { light: `/logos/${id}/icon-light.svg` } } });
const logos = [logo("cplusplus", "C++"), logo("csharp", "C#"), logo("c", "C"), logo("dotnet", ".NET"), logo("nextjs", "Next.js", ["nextdotjs"]), logo("nuxt", "Nuxt")];
const search = createSearch(logos);

test("empty or whitespace returns everything in order", () => {
  expect(search("")).toEqual(logos);
  expect(search("   ")).toEqual(logos);
});
test("symbol-heavy queries hit the exact logo first", () => {
  expect(search("c++")[0].id).toBe("cplusplus");
  expect(search("C#")[0].id).toBe("csharp");
  expect(search(".NET")[0].id).toBe("dotnet");
});
test("trims, fuzzy-matches titles and aliases, no duplicates", () => {
  expect(search("  next  ")[0].id).toBe("nextjs");
  expect(search("nextdotjs")[0].id).toBe("nextjs");
  const r = search("next.js");
  expect(new Set(r.map((l) => l.id)).size).toBe(r.length);
});
test("nonsense returns empty", () => expect(search("zzzzqqqq")).toEqual([]));
```
`tests/catalog/favorites.test.ts`:
```ts
import { expect, test } from "vitest";
import { createFavoritesStore, FAVORITES_KEY } from "@/lib/catalog/favorites";

const memStorage = (init?: string) => {
  const m = new Map<string, string>(init !== undefined ? [[FAVORITES_KEY, init]] : []);
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
};

test("toggle persists and round-trips", () => {
  const s = memStorage();
  const fav = createFavoritesStore(s);
  expect(fav.toggle("nextjs")).toBe(true);
  expect(fav.has("nextjs")).toBe(true);
  expect(JSON.parse(s.m.get(FAVORITES_KEY)!)).toEqual(["nextjs"]);
  expect(createFavoritesStore(s).list()).toEqual(["nextjs"]);
  expect(fav.toggle("nextjs")).toBe(false);
  expect(fav.list()).toEqual([]);
});

test("garbage or wrong-shaped stored value is ignored", () => {
  expect(createFavoritesStore(memStorage("{bad")).list()).toEqual([]);
  expect(createFavoritesStore(memStorage('{"a":1}')).list()).toEqual([]);
  expect(createFavoritesStore(memStorage('["ok", 3, null]')).list()).toEqual(["ok"]);
});

test("throwing storage (private mode) still works in memory", () => {
  const throwing = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); } };
  const fav = createFavoritesStore(throwing);
  expect(fav.toggle("react")).toBe(true);
  expect(fav.list()).toEqual(["react"]);
  expect(createFavoritesStore(null).toggle("x")).toBe(true);
});
```
`tests/catalog/counts.test.ts`:
```ts
import { expect, test } from "vitest";
import { categoryCounts } from "@/lib/catalog/counts";
import type { Logo } from "@/lib/catalog/types";

test("counts every category, multi-category logos count in each", () => {
  const l = (id: string, categories: Logo["categories"]): Logo => ({ id, title: id, aliases: [], categories, tier: "curated", source: "svgl", art: { icon: { light: "" } } });
  const counts = categoryCounts([l("a", ["ai"]), l("b", ["ai", "cloud"])]);
  expect(counts.ai).toBe(2);
  expect(counts.cloud).toBe(1);
  expect(counts.database).toBe(0);
});
```
`tests/render/sticker.test.ts`:
```ts
import { expect, test } from "vitest";
import { parseSvg, renderStickerSvg } from "@/lib/render/sticker";

const art = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 24"><path id="nextjs-icon-light-a" d="M0 0h48v24H0z"/></svg>`;

test("parseSvg extracts viewBox and inner markup", () => {
  expect(parseSvg(art)).toEqual({ viewBox: "0 0 48 24", inner: `<path id="nextjs-icon-light-a" d="M0 0h48v24H0z"/>` });
  expect(parseSvg("<div/>")).toBeNull();
  expect(parseSvg(`<svg><path/></svg>`)).toBeNull();
});

test("diecut uses a dilate filter and keeps the art", () => {
  const out = renderStickerSvg(art, { shape: "diecut" });
  expect(out).toMatch(/^<svg[^>]+width="512" height="512"/);
  expect(out).toContain('operator="dilate"');
  expect(out).toContain('viewBox="0 0 48 24"');
  expect(out).toContain("nextjs-icon-light-a");
});

test("circle, hex, square add a white background shape", () => {
  expect(renderStickerSvg(art, { shape: "circle" })).toMatch(/<circle[^>]+fill="#fff"/);
  const hex = renderStickerSvg(art, { shape: "hex", size: 300 });
  expect(hex).toContain('width="300"');
  expect(hex.match(/<polygon points="([^"]+)"/)![1].trim().split(" ")).toHaveLength(6);
  expect(renderStickerSvg(art, { shape: "square" })).toMatch(/<rect[^>]+rx=/);
});

test("invalid art throws a clear error", () => {
  expect(() => renderStickerSvg("nope", { shape: "circle" })).toThrow("Invalid logo SVG");
});
```

- [ ] **Step 2: Run** `pnpm test tests/catalog/search.test.ts tests/catalog/favorites.test.ts tests/catalog/counts.test.ts tests/render` → FAIL.

- [ ] **Step 3: Implement**

`lib/catalog/search.ts`:
```ts
import Fuse from "fuse.js";
import { toKey } from "./normalize";
import type { Logo } from "./types";

export function createSearch(logos: Logo[]): (query: string) => Logo[] {
  const fuse = new Fuse(logos, {
    keys: [{ name: "title", weight: 2 }, { name: "aliases", weight: 1 }],
    threshold: 0.3,
    ignoreLocation: true,
  });
  return (query) => {
    const q = query.trim();
    if (!q) return logos;
    const key = toKey(q);
    const exact = key ? logos.filter((l) => l.id === key || toKey(l.title) === key || l.aliases.some((a) => toKey(a) === key)) : [];
    const seen = new Set<string>();
    return [...exact, ...fuse.search(q).map((r) => r.item)].filter((l) => !seen.has(l.id) && !!seen.add(l.id));
  };
}
```
`lib/catalog/favorites.ts`:
```ts
export const FAVORITES_KEY = "ss:favorites";
type MiniStorage = Pick<Storage, "getItem" | "setItem">;

export function createFavoritesStore(storage: MiniStorage | null) {
  const read = (): string[] => {
    try {
      const raw = storage?.getItem(FAVORITES_KEY);
      const value: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  };
  let ids = read();
  const write = () => {
    try {
      storage?.setItem(FAVORITES_KEY, JSON.stringify(ids));
    } catch {
      // storage unavailable: keep favorites in memory only
    }
  };
  return {
    list: () => [...ids],
    has: (id: string) => ids.includes(id),
    toggle(id: string) {
      ids = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      write();
      return ids.includes(id);
    },
  };
}

export function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
```
`lib/catalog/counts.ts`:
```ts
import { CATEGORIES, type Category, type Logo } from "./types";

export function categoryCounts(logos: Logo[]): Record<Category, number> {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  for (const l of logos) for (const c of l.categories) counts[c]++;
  return counts;
}
```
`lib/catalog/download.ts`:
```ts
export async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.text();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function svgToPngBlob(svg: string, px = 1024): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not render SVG"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = px;
    canvas.height = px;
    canvas.getContext("2d")!.drawImage(img, 0, 0, px, px);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encoding failed"))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
```
`lib/render/sticker.ts`:
```ts
export type StickerShape = "diecut" | "circle" | "hex" | "square";

const PADDING: Record<StickerShape, number> = { diecut: 0.1, circle: 0.22, hex: 0.24, square: 0.16 };

export function parseSvg(svg: string): { viewBox: string; inner: string } | null {
  const m = svg.match(/<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/i);
  if (!m) return null;
  const vb = m[1].match(/viewBox\s*=\s*["']([^"']+)["']/i);
  return vb ? { viewBox: vb[1], inner: m[2] } : null;
}

function hexPoints(s: number): string {
  const r = s / 2 - 2;
  const c = s / 2;
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 90);
    return `${(c + r * Math.cos(a)).toFixed(2)},${(c + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

export function renderStickerSvg(artSvg: string, opts: { shape: StickerShape; size?: number }): string {
  const art = parseSvg(artSvg);
  if (!art) throw new Error("Invalid logo SVG");
  const s = opts.size ?? 512;
  const pad = PADDING[opts.shape] * s;
  const box = s - pad * 2;
  const nested = `<svg x="${pad}" y="${pad}" width="${box}" height="${box}" viewBox="${art.viewBox}" preserveAspectRatio="xMidYMid meet">${art.inner}</svg>`;
  const open = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">`;

  if (opts.shape === "diecut") {
    const r = Math.round(s * 0.035);
    return `${open}<defs><filter id="ss-diecut" x="-20%" y="-20%" width="140%" height="140%">` +
      `<feMorphology in="SourceAlpha" operator="dilate" radius="${r}" result="spread"/>` +
      `<feFlood flood-color="#ffffff"/><feComposite in2="spread" operator="in" result="border"/>` +
      `<feMerge><feMergeNode in="border"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>` +
      `<g filter="url(#ss-diecut)">${nested}</g></svg>`;
  }
  const bg = {
    circle: `<circle cx="${s / 2}" cy="${s / 2}" r="${s / 2 - 2}" fill="#fff"/>`,
    hex: `<polygon points="${hexPoints(s)}" fill="#fff"/>`,
    square: `<rect x="2" y="2" width="${s - 4}" height="${s - 4}" rx="${s * 0.18}" fill="#fff"/>`,
  }[opts.shape];
  return `${open}${bg}${nested}</svg>`;
}
```

- [ ] **Step 4: Run** the same tests → PASS.

- [ ] **Step 5: Commit** — `feat(catalog): search, favorites, counts, sticker renderer`

---

### Task 8: `/stickers` catalog page

**Files:**
- Create: `app/stickers/page.tsx`, `components/catalog/catalog-browser.tsx`, `components/catalog/category-sidebar.tsx`, `components/catalog/logo-card.tsx`, `components/catalog/logo-art.tsx`, `components/catalog/use-favorites.ts`
- Test: `tests/catalog/logo-art.test.ts`, `tests/e2e/stickers.spec.ts`

**Interfaces:**
- Consumes: `catalog/logos.json`, `public/catalog/extended.json`, `createSearch`, `createFavoritesStore`, `browserStorage`, `categoryCounts`, `renderStickerSvg`, `fetchText`, `downloadBlob`, `svgToPngBlob`, `CATEGORIES`, `CATEGORY_LABELS`.
- Produces: `/stickers` route; `artChipClass(art: ThemedArt): string` (exported from `logo-art.tsx` helper module `components/catalog/logo-art.tsx`).

- [ ] **Step 1: Failing unit test for dark-mode visibility rule** — `tests/catalog/logo-art.test.ts`:
```ts
import { expect, test } from "vitest";
import { artChipClass } from "@/components/catalog/art-chip";

test("logos without a dark variant get a light chip in dark mode", () => {
  expect(artChipClass({ light: "/a.svg" })).toContain("dark:bg-neutral-100");
  expect(artChipClass({ light: "/a.svg", dark: "/b.svg" })).toBe("");
});
```
Create `components/catalog/art-chip.ts` (plain TS, testable in node):
```ts
import type { ThemedArt } from "@/lib/catalog/types";
export function artChipClass(art: ThemedArt): string {
  return art.dark ? "" : "dark:rounded-md dark:bg-neutral-100 dark:p-1";
}
```
Run `pnpm test tests/catalog/logo-art.test.ts` → FAIL before creating the file, PASS after.

- [ ] **Step 2: Components**

`components/catalog/logo-art.tsx`:
```tsx
import type { ThemedArt } from "@/lib/catalog/types";
import { artChipClass } from "./art-chip";

export function LogoArt({ art, title, className = "h-10" }: { art: ThemedArt; title: string; className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center ${artChipClass(art)}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={art.light} alt={title} loading="lazy" className={`${className} w-auto ${art.dark ? "dark:hidden" : ""}`} />
      {art.dark && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art.dark} alt={title} loading="lazy" className={`${className} hidden w-auto dark:block`} />
      )}
    </span>
  );
}
```
`components/catalog/use-favorites.ts`:
```ts
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { browserStorage, createFavoritesStore } from "@/lib/catalog/favorites";

export function useFavorites() {
  const store = useRef<ReturnType<typeof createFavoritesStore> | null>(null);
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    store.current = createFavoritesStore(browserStorage());
    setIds(store.current.list());
  }, []);
  const toggle = useCallback((id: string) => {
    if (!store.current) return;
    store.current.toggle(id);
    setIds(store.current.list());
  }, []);
  return { ids, has: (id: string) => ids.includes(id), toggle };
}
```
`components/catalog/logo-card.tsx`:
```tsx
"use client";
import Link from "next/link";
import { Download, ExternalLink, Heart, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { downloadBlob, fetchText, svgToPngBlob } from "@/lib/catalog/download";
import { CATEGORY_LABELS, type Logo } from "@/lib/catalog/types";
import { renderStickerSvg } from "@/lib/render/sticker";
import { LogoArt } from "./logo-art";

export function LogoCard({ logo, favorite, onToggleFavorite }: { logo: Logo; favorite: boolean; onToggleFavorite: () => void }) {
  const run = (fn: () => Promise<void>) => fn().catch((e: Error) => toast.error(e.message));
  const svgFile = (svg: string, name: string) => downloadBlob(new Blob([svg], { type: "image/svg+xml" }), name);

  return (
    <div data-testid={`logo-${logo.id}`} className="group flex flex-col items-center gap-3 rounded-md border border-neutral-200 p-4 transition-colors hover:bg-neutral-100/80 dark:border-neutral-800 dark:hover:bg-neutral-800/50">
      <div className="flex h-16 items-center"><LogoArt art={logo.art.icon} title={logo.title} /></div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-[15px] font-medium leading-tight">{logo.title}</p>
        <Badge variant="outline" className="font-normal text-neutral-500">{CATEGORY_LABELS[logo.categories[0]]}</Badge>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label={favorite ? `Unfavorite ${logo.title}` : `Favorite ${logo.title}`} aria-pressed={favorite} onClick={onToggleFavorite}>
          <Heart className={`size-4 ${favorite ? "fill-red-500 text-red-500" : ""}`} />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Download ${logo.title}`}><Download className="size-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => run(async () => svgFile(await fetchText(logo.art.icon.light), `${logo.id}.svg`))}>Logo SVG</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => run(async () => svgFile(renderStickerSvg(await fetchText(logo.art.icon.light), { shape: "diecut" }), `${logo.id}-sticker.svg`))}>Sticker SVG</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => run(async () => downloadBlob(await svgToPngBlob(renderStickerSvg(await fetchText(logo.art.icon.light), { shape: "diecut", size: 1024 })), `${logo.id}-sticker.png`))}>Sticker PNG</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon" asChild aria-label={`Add ${logo.title} to laptop`}>
          <Link href={`/editor?add=${logo.id}`}><Plus className="size-4" /></Link>
        </Button>
        {logo.brandUrl && (
          <Button variant="ghost" size="icon" asChild aria-label={`${logo.title} brand guidelines`}>
            <a href={logo.brandUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /></a>
          </Button>
        )}
      </div>
    </div>
  );
}
```
Install sonner via shadcn if not present: this is the one allowed dependency addition in this task — `pnpm dlx shadcn@latest add sonner -y` — and mount `<Toaster />` from `@/components/ui/sonner` in `app/layout.tsx` inside `ThemeProvider`.

`components/catalog/category-sidebar.tsx`:
```tsx
"use client";
import { Heart } from "lucide-react";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/catalog/types";

export type Filter = "all" | "favorites" | Category;

export function CategorySidebar({ value, onChange, counts, total, favorites }: {
  value: Filter; onChange: (f: Filter) => void; counts: Record<Category, number>; total: number; favorites: number;
}) {
  const item = (f: Filter, label: React.ReactNode, count: number) => (
    <button key={f} onClick={() => onChange(f)} aria-current={value === f}
      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-neutral-100/80 dark:hover:bg-neutral-800/50 ${value === f ? "bg-neutral-100 font-medium dark:bg-neutral-800" : "text-neutral-600 dark:text-neutral-400"}`}>
      <span className="flex items-center gap-2">{label}</span>
      <span className="font-mono text-xs text-neutral-400">{count}</span>
    </button>
  );
  return (
    <nav className="flex flex-col gap-0.5">
      {item("all", "All", total)}
      {item("favorites", <><Heart className="size-3.5" />Favorites</>, favorites)}
      <div className="my-2 h-px bg-neutral-200 dark:bg-neutral-800" />
      {CATEGORIES.filter((c) => counts[c] > 0).map((c) => item(c, CATEGORY_LABELS[c], counts[c]))}
    </nav>
  );
}
```
`components/catalog/catalog-browser.tsx`:
```tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { categoryCounts } from "@/lib/catalog/counts";
import { createSearch } from "@/lib/catalog/search";
import type { Logo } from "@/lib/catalog/types";
import { CategorySidebar, type Filter } from "./category-sidebar";
import { LogoCard } from "./logo-card";
import { useFavorites } from "./use-favorites";

const PAGE = 120;

export function CatalogBrowser({ curated }: { curated: Logo[] }) {
  const [extended, setExtended] = useState<Logo[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [limit, setLimit] = useState(PAGE);
  const fav = useFavorites();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showAll || extended) return;
    fetch("/catalog/extended.json").then((r) => r.json()).then(setExtended).catch(() => setShowAll(false));
  }, [showAll, extended]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pool = useMemo(() => (showAll && extended ? [...curated, ...extended] : curated), [showAll, extended, curated]);
  const search = useMemo(() => createSearch(pool), [pool]);
  const counts = useMemo(() => categoryCounts(pool), [pool]);
  const results = useMemo(() => {
    const matched = search(query);
    if (filter === "all") return matched;
    if (filter === "favorites") return matched.filter((l) => fav.ids.includes(l.id));
    return matched.filter((l) => l.categories.includes(filter));
  }, [search, query, filter, fav.ids]);

  useEffect(() => setLimit(PAGE), [query, filter, showAll]);

  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8">
      <aside className="sticky top-20 hidden h-[calc(100dvh-6rem)] w-52 shrink-0 overflow-y-auto md:block">
        <CategorySidebar value={filter} onChange={setFilter} counts={counts} total={pool.length} favorites={fav.ids.length} />
      </aside>
      <section className="min-w-0 flex-1">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <Input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${pool.length} stickers…`} className="pl-9" aria-label="Search stickers" />
            <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 font-mono text-xs text-neutral-400 sm:block">⌘K</kbd>
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Show all logos
          </label>
        </div>
        <select className="mb-4 w-full rounded-md border border-neutral-200 bg-transparent px-2 py-1.5 text-sm md:hidden dark:border-neutral-800"
          value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Category">
          <option value="all">All</option><option value="favorites">Favorites</option>
          {Object.entries(counts).filter(([, n]) => n > 0).map(([c]) => <option key={c} value={c}>{c}</option>)}
        </select>
        {results.length === 0 ? (
          <p className="py-24 text-center text-sm text-neutral-500">
            {filter === "favorites" ? "No favorites yet — tap the heart on any sticker." : `No stickers match “${query}”.`}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {results.slice(0, limit).map((logo) => (
              <LogoCard key={logo.id} logo={logo} favorite={fav.has(logo.id)} onToggleFavorite={() => fav.toggle(logo.id)} />
            ))}
          </div>
        )}
        {results.length > limit && (
          <div className="mt-8 text-center">
            <button onClick={() => setLimit((n) => n + PAGE)} className="rounded-md border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-100/80 dark:border-neutral-800 dark:hover:bg-neutral-800/50">
              Show more ({results.length - limit} left)
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
```
`app/stickers/page.tsx`:
```tsx
import type { Metadata } from "next";
import logos from "@/catalog/logos.json";
import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import type { Logo } from "@/lib/catalog/types";

export const metadata: Metadata = { title: "Stickers — Stack Stickers", description: "Browse, favorite and download dev logo stickers." };

export default function StickersPage() {
  const curated = (logos as Logo[]).filter((l) => l.tier === "curated");
  return <CatalogBrowser curated={curated} />;
}
```

- [ ] **Step 3: E2E smoke** — `tests/e2e/stickers.spec.ts`:
```ts
import { expect, test } from "@playwright/test";

test("search, favorite persists across reload, favorites filter", async ({ page }) => {
  await page.goto("/stickers");
  await page.getByLabel("Search stickers").fill("next.js");
  const card = page.getByTestId("logo-nextjs");
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Favorite Next.js" }).click();
  await page.reload();
  await page.getByRole("button", { name: /^Favorites/ }).click();
  await expect(page.getByTestId("logo-nextjs")).toBeVisible();
});

test("dark-only-light logo gets a visible chip in dark mode", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/stickers");
  await page.getByLabel("Search stickers").fill("python");
  await expect(page.getByTestId("logo-python")).toBeVisible();
});

test("sticker SVG download works", async ({ page }) => {
  await page.goto("/stickers");
  await page.getByLabel("Search stickers").fill("react");
  await page.getByTestId("logo-react").getByRole("button", { name: "Download React" }).click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: "Sticker SVG" }).click()]);
  expect(download.suggestedFilename()).toBe("react-sticker.svg");
});
```

- [ ] **Step 4: Verify**

Run: `pnpm test && pnpm lint && pnpm build && pnpm e2e`
Expected: all unit tests pass, lint clean, build OK, 3 e2e tests pass. Then `pnpm dev`, open http://localhost:3000/stickers, check light + dark mode by eye: grid looks like svgl, hearts persist, downloads produce files.

- [ ] **Step 5: Commit** — `feat(stickers): svgl-style catalog page with search, favorites, downloads`

---

## Execution waves (coordinator)

| Wave | Tasks | Parallel? |
|---|---|---|
| 1 | Task 1 → Task 2 | sequential, one worker |
| 2 | Tasks 3, 4, 5, 7 | parallel (disjoint files) |
| 3 | Task 6 | one worker (needs 3–5) |
| 4 | Task 8 | one worker (needs 6–7) |

Review after each wave; commit per task.
