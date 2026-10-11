import { env } from "$env/dynamic/private";
import { repoSlug } from "@/config/site";
import { LOGO_BY_KEY } from "$lib/stickers/logos";

/**
 * One GitHub issue per brand request, so new requests show up in notifications. Server-only (needs GITHUB_TOKEN).
 * Deliberately no email: issues may be public or shared, so the address stays in the database.
 */
export type BrandIssueInput = {
  id: string;
  mode: "remove" | "update" | "feature";
  company: string;
  name: string;
  logos: string[];
  plan: string | null;
  details: string | null;
};

/** user text can't ping people: a zero-width space after `@` disarms @mentions without changing how it reads */
const noMention = (s: string) => s.replace(/@/g, "@\u200b");
/** keep table cells on one line and stop a `|` from splitting a cell */
const cell = (s: string) => noMention(s).replace(/\r?\n/g, " ").replace(/\|/g, "\\|");

/** Pure: the issue's title, markdown body and labels. Only reads the known fields, so an `email` passed in is ignored. */
export function brandIssueBody(input: BrandIssueInput): { title: string; body: string; labels: string[] } {
  const { id, mode, company, name, logos, plan, details } = input;
  const logoList = logos.length
    ? logos
        .map((k) => {
          const title = LOGO_BY_KEY.get(k)?.title;
          return title ? `${cell(title)} (\`${k}\`)` : `\`${k}\``;
        })
        .join(", ")
    : "—";
  const rows: [string, string][] = [
    ["Request", mode],
    ["Company", cell(company)],
    ["Requester", cell(name)],
    ["Logos", logoList],
    ["Plan", plan ?? "—"],
    ["Reference", `\`${id}\``],
  ];
  const table = ["| | |", "| --- | --- |", ...rows.map(([k, v]) => `| ${k} | ${v} |`)].join("\n");
  // details are validated (≤ 2000 chars) before they get here; quote every line
  const quoted = details?.trim()
    ? noMention(details.trim()).split(/\r?\n/).map((l) => `> ${l}`).join("\n")
    : "_No details._";
  const footer = `No email in this issue on purpose. The requester's address is on row ${id} in the brand_requests table (pnpm db:studio).`;
  return {
    title: `[${mode}] ${noMention(company)} · ${id}`,
    body: `${table}\n\n### Details\n\n${quoted}\n\n---\n\n${footer}\n`,
    // labels that don't exist yet are created by the API for tokens with write access; no setup step needed
    labels: ["brand-request", `brand:${mode}`],
  };
}

let warned = false;
/** Test hook. */
export const _resetIssueWarning = () => (warned = false);

/**
 * Open the issue. Never throws: returns `{ url }` on success, null when there's no token or on any failure.
 * Callers fire and forget (`void openBrandRequestIssue(...)`) so the request path never waits on GitHub.
 */
export async function openBrandRequestIssue(
  input: BrandIssueInput,
  deps: { fetchFn?: typeof fetch; token?: string; repo?: string } = {},
): Promise<{ url: string } | null> {
  const token = deps.token ?? env.GITHUB_TOKEN;
  const repo = deps.repo ?? (env.GITHUB_ISSUES_REPO || repoSlug);
  if (!token) {
    if (!warned) {
      warned = true;
      console.warn("[brand-requests] GITHUB_TOKEN unset; no issue opened for", input.id);
    }
    return null;
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await (deps.fetchFn ?? fetch)(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "x-github-api-version": "2022-11-28",
        "user-agent": "stickerz",
        "content-type": "application/json",
      },
      body: JSON.stringify(brandIssueBody(input)),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      console.error(`[brand-requests] GitHub issue for ${input.id} failed: ${r.status} ${r.statusText}`);
      return null;
    }
    const data = (await r.json()) as { html_url?: string };
    return data.html_url ? { url: data.html_url } : null;
  } catch (e) {
    console.error(`[brand-requests] GitHub issue for ${input.id} failed:`, e instanceof Error ? e.message : e);
    return null;
  } finally {
    clearTimeout(t);
  }
}
