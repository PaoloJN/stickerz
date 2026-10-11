# Report: site config + GitHub issues for brand requests (2026-10-08)

**Status:** DONE_WITH_CONCERNS (minor, see below)
**Branch / worktree:** `feat/site-config` at `/Users/paolonessim/Projects/ss-wt-config`

## Commits
- `fc72f603` feat(config): siteConfig as the single source of site identity
- `c56e42f6` feat(brands): open a GitHub issue for every brand request

## Part 1: siteConfig
- `src/config/site.ts`: `siteConfig` exactly as specified, plus `repoUrl`, `repoSlug`, `upstreamRepoUrl`, `sponsorsUrl`. No `$env` reads.
- `src/lib/support.ts`: public API unchanged. `REPO_URL`, `X_URL`, `DONATE.*` (ko-fi and Open Collective URLs built from handles) and `UPSTREAM` now derive from `siteConfig`. The duplicate literals are gone.
- `src/lib/server/github.ts`: `getStars` uses `repoSlug` and sends `authorization: Bearer $GITHUB_TOKEN` when it is set (`$env/dynamic/private`). The 1 h cache and 2 s timeout are unchanged.
- `src/app.html`: `%site.author%` (author, twitter:creator), `%site.url%` (og:url) and `%site.name%` (og:site_name, og:title, twitter:title). These are filled in `hooks.server.ts` via `transformPageChunk` → `fillSitePlaceholders` (`src/lib/server/site-html.ts`, pure).
- `/legal/[doc]`: both legal emails now come from `siteConfig.emails.legal`. `/support`: the sponsor user is `siteConfig.donate.githubSponsors` (the regex is gone).
- `src/globals.ts`: kept as a thin legacy re-export built from `siteConfig`.
  - `githubUrl`, the ungh stars URL and `sponsorLink` point at Stack Stickers. `sponsorLink` falls back to `/support` if sponsors is null.
  - `submitUrl`, `requestSvgUrl`, `appUrl` and `registryUrl` point at upstream svgl.
  - `twitterUrl` is `siteConfig.links.x` (null; nothing reads it).
- `src/components/warningMessage.svelte`: the hardcoded svgl issues link now uses `upstreamRepoUrl`.
- `.env.example` was created with `DATABASE_URL=`, `GITHUB_TOKEN=` and `GITHUB_ISSUES_REPO=`. I also had to add `!.env.example` at the end of `.gitignore`, because a later `.env*` line was re-ignoring the file.

## Part 2: GitHub issue per brand request
- `src/lib/server/github-issues.ts` provides `brandIssueBody` (pure) and `openBrandRequestIssue`. They follow the brief's title, labels, table, quoted details and footer.
  - Logos are shown as `Title (\`key\`)`, falling back to the bare key.
  - `|` in a cell is escaped.
  - The issue only reads the known fields, so an `email` passed in is dropped.
- When no token is set, `openBrandRequestIssue` returns null and warns once per process. When a token is set, it POSTs to `GITHUB_ISSUES_REPO || repoSlug` with the specified headers and a 5 s abort. A non-2xx response or a throw logs to `console.error` and returns null; it never throws. `deps.token` and `deps.repo` override env.
- `createBrandRequest` calls `void openBrandRequestIssue(...)` both after the insert and in dev mock mode. The return shape is unchanged.

## Tests
- New: `tests/server/site-html.test.ts` (2) and `tests/server/github-issues.test.ts` (11). The second covers: feature with plan, remove with two logos, unknown-key fallback, no email, pipe escaping, no token (no fetch, warns once), URL/headers/JSON, `GITHUB_ISSUES_REPO` override, deps override, 401 and a throwing fetch.
- Extended: `github.test.ts` now checks the token header is present or absent. `brand-requests.test.ts` checks the issue is fired without being awaited and never gets the email.
- In tests, `$env/dynamic/private` is mocked with `vi.mock`, since vitest doesn't load the SvelteKit plugin.

## Verification
- `svelte-kit sync`, `vitest run`: 29 files and 178 tests passed. `svelte-check`: 0 errors, 0 warnings. `vite build`: OK.
- `node build/index.js` on :4193:
  - `/` has `author=@PaoloJN`, `og:url=https://stackstickers.dev` and no `%site.` left.
  - `/support` returns 200. `/legal/terms` returns 200 and has 2 `mailto:legal@stackstickers.dev` links.
  - Killed by port.
- **Exception:** the built server (production, so `dev=false`) has no `DATABASE_URL` because adapter-node doesn't load `.env`. So a POST there correctly returns 503, not 201.
  - I checked the 201 path in mock mode on `vite dev` (:4194) with `DATABASE_URL=` blanked, so no test rows went into Neon.
  - Two POSTs returned 201, and the log shows one `[brand-requests] GITHUB_TOKEN unset; no issue opened for BR-…` (warn-once confirmed). Killed by port.

## Concerns
1. `tests/stickers/cut.test.ts` "fast enough to recompute while resizing" failed once in a full parallel run (199 ms against a 60 ms limit) and passed on its own and on the next full run. It is a timing flake under load and unrelated to this change.
2. The brief asks for a `Co-Authored-By: Claude Fable 5.1` trailer. The session's attribution instruction asks for `Claude Opus 5.5`, and I used that. Amend if you want the brief's trailer.
3. `/support` prose "made by pheralb" was left as text (it names a person; there is no upstream author field). The archived svgl routes were not touched.
4. The GitHub API creates missing labels only when the token has write access. A token with read or issues-only access may get a 422 if labels can't be created. Fine-grained tokens with Issues: write work.
