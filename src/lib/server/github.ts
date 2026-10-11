import { env } from "$env/dynamic/private";
import { repoSlug } from "@/config/site";

/**
 * Live GitHub star count for the stats bar. Cached in memory for an hour; null on any failure (also cached).
 * Sends GITHUB_TOKEN when set, so the count still loads while the repo is private.
 */
const TTL = 60 * 60 * 1000;
let cache: { at: number; value: number | null } | null = null;

export async function getStars(
  fetchFn: typeof fetch = fetch,
  now = Date.now(),
): Promise<number | null> {
  if (cache && now - cache.at < TTL) return cache.value;
  // the 2 s budget covers the headers AND the body: the abort also cancels a stalled r.json()
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 2000);
  try {
    const headers: Record<string, string> = {
      accept: "application/vnd.github+json",
      "user-agent": "stickerz",
    };
    if (env.GITHUB_TOKEN) headers.authorization = `Bearer ${env.GITHUB_TOKEN}`;
    const r = await fetchFn(`https://api.github.com/repos/${repoSlug}`, {
      headers,
      signal: ctrl.signal,
    });
    const value = r.ok
      ? Number((await r.json()).stargazers_count) || null
      : null;
    cache = { at: now, value };
    return value;
  } catch {
    cache = { at: now, value: null };
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Test hook. */
export const _resetStarsCache = () => (cache = null);
