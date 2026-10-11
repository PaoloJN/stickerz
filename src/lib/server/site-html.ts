import { siteConfig } from "@/config/site";

/**
 * app.html can't import, so it carries `%site.*%` placeholders that hooks.server.ts fills on every page
 * via `transformPageChunk`. Pure, so it's testable.
 */
const PLACEHOLDERS: [string, string][] = [
  ["%site.author%", `@${siteConfig.author.x}`],
  ["%site.url%", siteConfig.url],
  ["%site.name%", siteConfig.name],
];

export function fillSitePlaceholders(html: string): string {
  return PLACEHOLDERS.reduce((out, [key, value]) => out.replaceAll(key, value), html);
}
