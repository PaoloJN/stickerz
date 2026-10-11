/**
 * Legacy link table, still used by the archived library UI and a few editor components.
 * Built from siteConfig (src/config/site.ts) so it never drifts; new code should import siteConfig directly.
 */
import { logoRequestUrl, repoSlug, repoUrl, siteConfig, sponsorsUrl } from "@/config/site";

export const globals = {
  appUrl: siteConfig.url,
  githubUrl: repoUrl,
  apiGithub: {
    url: `https://ungh.cc/repos/${repoSlug}`,
    fallback: 5000,
  },
  /** project X account; null until set up */
  twitterUrl: siteConfig.links.x,
  sponsorLink: siteConfig.donate.githubSponsors ? sponsorsUrl(siteConfig.donate.githubSponsors) : "/support",
  submitUrl: logoRequestUrl,
  requestSvgUrl: logoRequestUrl,
  registryUrl: `${siteConfig.url}/r/`,
  v0Url: "https://v0.dev/chat/api/open?url=",
};
