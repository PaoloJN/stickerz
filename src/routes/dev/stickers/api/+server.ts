import { dev } from "$app/environment";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { saveFix, setReview, type ReviewStatus } from "$lib/server/sticker-review";
import type { BuildSettings } from "$lib/stickers/overrides";

type Body =
  | { action: "review"; files: string[]; status: ReviewStatus | null; note?: string }
  | { action: "fix"; key: string; file: string | null; settings: BuildSettings | null };

const FILE = /^[\w.-]+\.svg$/;

function cleanSettings(s: BuildSettings | null): BuildSettings | null {
  if (!s) return null;
  const n = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : undefined);
  const b = (v: unknown) => (typeof v === "boolean" ? v : undefined);
  const shape = s.shape === "circle" || s.shape === "square" ? s.shape : undefined;
  const out: BuildSettings = { shape, margin: n(s.margin, 0, 12), smooth: n(s.smooth, 0, 100), fillHoles: b(s.fillHoles), merge: b(s.merge), stripMasks: b(s.stripMasks) };
  return JSON.parse(JSON.stringify(out));
}

// DEV ONLY: writes review.json, overrides.review.json and cuts.json in the repo
export const POST: RequestHandler = async ({ request }) => {
  if (!dev) error(404, "Not found");
  const body = (await request.json()) as Body;
  if (body.action === "review") {
    const files = (body.files ?? []).filter((f) => FILE.test(f));
    for (const f of files) setReview(f, body.status === "ok" || body.status === "fix" ? body.status : null, body.note?.slice(0, 200));
    return json({ ok: true, files });
  }
  if (body.action === "fix") {
    if (typeof body.key !== "string" || (body.file !== null && !FILE.test(body.file))) error(400, "bad fix");
    const files = await saveFix(body.key, body.file, cleanSettings(body.settings));
    return json({ ok: true, files });
  }
  error(400, "unknown action");
};
