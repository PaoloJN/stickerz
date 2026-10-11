/**
 * Site identity in one place (shadcn-style `siteConfig`): name, URL, repo, emails, donate links.
 * Imported by client code too, so no `$env` reads here; server-only overrides (GITHUB_ISSUES_REPO, GITHUB_TOKEN)
 * are read where they're used, in $lib/server.
 */
export const siteConfig = {
  /** the wordmark: lowercase, domain as the name (cal.com style). Use `shortName` inside sentences. */
  name: "stickerz.dev",
  shortName: "Stickerz",
  /** shown next to the name in the editor */
  version: "0.1 beta",
  tagline: "Your stack, on your laptop.",
  url: "https://stickerz.dev",
  author: { name: "Paolo Nessim", github: "PaoloJN", x: "PaoloJN" },
  /** GitHub repo; everything repo-related derives from this. Env `GITHUB_ISSUES_REPO` can override the issue target. */
  repo: { owner: "PaoloJN", name: "stickerz" },
  emails: { legal: "legal@stickerz.dev", hello: "hello@stickerz.dev" },
  /** null = not set up yet (hidden in the UI) */
  links: { x: null as string | null },
  donate: {
    githubSponsors: "PaoloJN" as string | null, // GitHub user to sponsor; null hides the card
    kofi: null as string | null, // ko-fi.com/<user>
    openCollective: null as string | null, // opencollective.com/<slug>
  },
  /** where the logo library started; credited on /support and in the docs only */
  upstream: { name: "svgl", site: "https://svgl.app", repo: { owner: "pheralb", name: "svgl" }, sponsors: "pheralb" },
} as const;

export const repoUrl = `https://github.com/${siteConfig.repo.owner}/${siteConfig.repo.name}`;
export const repoSlug = `${siteConfig.repo.owner}/${siteConfig.repo.name}`;
/** "Submit a logo": a prefilled issue on our repo (.github/ISSUE_TEMPLATE/logo-request.yml) */
export const logoRequestUrl = `${repoUrl}/issues/new?template=logo-request.yml`;
export const upstreamRepoUrl = `https://github.com/${siteConfig.upstream.repo.owner}/${siteConfig.upstream.repo.name}`;
export const sponsorsUrl = (user: string) => `https://github.com/sponsors/${user}`;
