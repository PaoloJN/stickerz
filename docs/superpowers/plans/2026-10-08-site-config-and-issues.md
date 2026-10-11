# Site config + GitHub-issue notifications for brand requests (2026-10-08)

Branch `feat/site-config`, worktree `/Users/paolonessim/Projects/ss-wt-config`. One agent, two parts in order. Conventional commits with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Part 1 — `src/config/site.ts` (shadcn-style `siteConfig`)

Create:
```ts
export const siteConfig = {
  name: "Stack Stickers",
  tagline: "Design your laptop at true size, then post it or print it.",
  url: "https://stackstickers.dev",
  author: { name: "Paolo Nessim", github: "PaoloJN", x: "PaoloJN" },
  /** GitHub repo; everything repo-related derives from this. Env `GITHUB_ISSUES_REPO` can override the issue target. */
  repo: { owner: "PaoloJN", name: "stack-stickers" },
  emails: { legal: "legal@stackstickers.dev", hello: "hello@stackstickers.dev" },
  /** null = not set up yet (hidden in the UI) */
  links: { x: null as string | null },
  donate: {
    githubSponsors: "PaoloJN" as string | null, // GitHub user to sponsor; null hides the card
    kofi: null as string | null,                // ko-fi.com/<user>
    openCollective: null as string | null,      // opencollective.com/<slug>
  },
  upstream: { name: "svgl", site: "https://svgl.app", repo: { owner: "pheralb", name: "svgl" }, sponsors: "pheralb" },
} as const;

export const repoUrl = `https://github.com/${siteConfig.repo.owner}/${siteConfig.repo.name}`;
export const repoSlug = `${siteConfig.repo.owner}/${siteConfig.repo.name}`;
export const upstreamRepoUrl = `https://github.com/${siteConfig.upstream.repo.owner}/${siteConfig.upstream.repo.name}`;
export const sponsorsUrl = (user: string) => `https://github.com/sponsors/${user}`;
```
Keep the shape flat and obvious; no classes, no env reads in this file (it is imported by client code).

Migrate (keep the public API of `src/lib/support.ts` so pages don't churn, but make its values derive from `siteConfig`):
- `REPO_URL = repoUrl`, `X_URL = siteConfig.links.x`, `DONATE.githubSponsors = siteConfig.donate.githubSponsors ? sponsorsUrl(...) : null` (same for kofi/openCollective URLs), `UPSTREAM = { name, site, repo: upstreamRepoUrl, sponsors: sponsorsUrl(siteConfig.upstream.sponsors) }`. Delete the now-duplicate literals in `support.ts`.
- `src/routes/legal/[doc]/+page.svelte`: both `legal@stackstickers.dev` occurrences → `siteConfig.emails.legal` (href `mailto:` + text).
- `src/routes/support/+page.svelte`: the sponsor user regex on `DONATE.githubSponsors` → use `siteConfig.donate.githubSponsors` directly; `@PaoloJN` text → from config.
- `src/lib/server/github.ts` (`getStars`): use `repoSlug`; send `Authorization: Bearer ${env.GITHUB_TOKEN}` when `GITHUB_TOKEN` is set (via `$env/dynamic/private`), so the chip works while the repo is private. Keep the 1 h cache and 2 s timeout; add a test that the header is present when the token is set and absent otherwise.
- `src/app.html` cannot import. Replace the hardcoded `@PaoloJN` (author, twitter:creator) and `https://stackstickers.dev` (og:url) with placeholders `%site.author%`, `%site.url%`, `%site.name%` and fill them in `src/hooks.server.ts` with `resolve(event, { transformPageChunk: ({ html }) => html.replaceAll(...) })`. Test `renamedPath` already exists; add a small test for a pure `fillSitePlaceholders(html)` helper in `src/lib/server/site-html.ts`.
- `src/globals.ts` (svgl-era) is still imported by `src/components/githubLink.svelte`, `layout/header.svelte`, `layout/showSidebarLinks.svelte`, `layout/homeLink.svelte`, `svgs/openWithV0.svelte`, `svgs/svgNotFound.svelte`, `editor/EditorHeader.svelte`, `editor/LibraryPanel.svelte`, `routes/+layout.svelte`. Point its repo/sponsor/getting-started/request-svg links at the right source: Stack Stickers links (github, sponsor) → `siteConfig`; svgl-specific links (request an SVG upstream, svgl docs) → `siteConfig.upstream`. Keep `globals.ts` as a thin re-export built from `siteConfig` rather than deleting it (the archived svgl UI still uses it); comment that it's legacy.
- `.env.example`: add `GITHUB_TOKEN=` and `GITHUB_ISSUES_REPO=` with one-line comments (create the file if missing; list `DATABASE_URL=` too).
- `docs/`: no doc changes needed beyond this file.

Grep `src` for any other `stackstickers.dev`, `PaoloJN`, `github.com/PaoloJN`, `pheralb` literal outside `src/data/`, `src/lib/stickers/`, `docs/`; migrate what you find (skip the archived routes' copy if it's pure prose).

## Part 2 — GitHub issue per brand request

`src/lib/server/github-issues.ts`:
```ts
export type BrandIssueInput = { id: string; mode: "remove"|"update"|"feature"; company: string; name: string; logos: string[]; plan: string | null; details: string | null };
export function brandIssueBody(input: BrandIssueInput): { title: string; body: string; labels: string[] }  // pure, tested
export async function openBrandRequestIssue(input: BrandIssueInput, deps?: { fetchFn?: typeof fetch; token?: string; repo?: string }): Promise<{ url: string } | null>
```
- Title: `[${mode}] ${company} · ${id}`. Labels: `brand-request`, `brand:${mode}`. Body (markdown): a small table (Request / Company / Requester (name only) / Logos (titles via `LOGO_BY_KEY`, keys in code) / Plan / Reference), the details in a quoted block (escape nothing fancy; cap at 2000 chars, already validated), and a footer: `No email in this issue on purpose. The requester's address is on row ${id} in the brand_requests table (pnpm db:studio).`
- Target repo: `env.GITHUB_ISSUES_REPO || repoSlug`. Token: `env.GITHUB_TOKEN`. When the token is missing → return `null` and `console.warn("[brand-requests] GITHUB_TOKEN unset; no issue opened for", id)` once per process (not per request).
- `POST https://api.github.com/repos/${repo}/issues` with `Accept: application/vnd.github+json`, `Authorization: Bearer`, `X-GitHub-Api-Version: 2022-11-28`, `user-agent: stack-stickers`; 5 s abort timeout; on non-2xx or throw → `console.error` with status and return `null`. Never throw.
- Wire it in `src/lib/server/brand-requests.ts` after the successful insert (and in dev mock mode too, so it can be tested locally with a token): `void openBrandRequestIssue(...)` — do not await it in the request path. Return shape of `createBrandRequest` unchanged.
- Tests (`tests/server/github-issues.test.ts`): body/title/labels for each mode (feature with plan, remove with two logos), email never appears in the body even if passed in extra fields (pass an object with `email` and assert it's absent), returns null without token and does not call fetch, calls fetch with the right URL/headers/JSON when a token is set (mock fetch), returns null on 401, survives a throwing fetch. Also add the `repo` override test (`GITHUB_ISSUES_REPO`).
- Labels may not exist on the repo; the API creates missing labels automatically for users with write access — no extra step. Note it in a comment.

## Verify
`./node_modules/.bin/svelte-kit sync && ./node_modules/.bin/vitest run && ./node_modules/.bin/svelte-check --tsconfig ./tsconfig.json && ./node_modules/.bin/vite build`; `PORT=4193 node build/index.js &`; curl `/` and check the `<meta name="author">` and `og:url` are filled (no `%site.` left in the HTML), `/support` 200, `/legal/terms` contains the legal email; POST a valid brand request (mock mode is fine) → 201 and a `GITHUB_TOKEN unset` warning in the server log; `lsof -ti:4193 | xargs kill`. Never `pkill`.

Report to `/Users/paolonessim/Projects/stackstickers/docs/superpowers/plans/2026-10-08-site-config-and-issues-report.md`, then reply with: Status, commits, one-line test summary, concerns, report path.
