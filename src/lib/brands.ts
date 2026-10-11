/**
 * For Brands: copy tables and the request schema, shared by the /brands page (client-side validation)
 * and POST /api/brand-requests (server-side validation). Isomorphic — no server imports here.
 * Copy comes from docs/design/*For Brands.dc.html.
 */
import { z } from "zod";
import { isKnownLogo } from "$lib/stickers/logos";
import { BRAND_TIERS, type BrandTier } from "$lib/support";

export type BrandMode = "remove" | "update" | "feature";
export type PlanId = BrandTier["id"];

export type ModeCopy = {
  title: string;
  body: string;
  sla: string;
  form: string;
  submit: string;
  details: string;
  placeholder: string;
  note: string;
  next: string;
  stepsTitle: string;
  steps: [title: string, body: string][];
};

export const MODES: Record<BrandMode, ModeCopy> = {
  remove: {
    title: "Remove a logo",
    body: "Take your logo out of the library, the editor and every logo page.",
    sla: "HIDDEN WITHIN 48 HOURS",
    form: "Request a removal",
    submit: "Send removal request",
    details: "Anything we should know",
    placeholder: "For example, only remove the old wordmark.",
    note: "Hidden within 48 hours of checking.",
    next: "Hidden within 48 hours of checking",
    stepsTitle: "How removal works",
    steps: [
      ["Send the form", "Takes a minute. No legal letter needed."],
      ["We check the request", "We confirm it’s really from your company before acting."],
      ["We hide it", "Within 48 hours of checking. We reply when it’s done."],
    ],
  },
  update: {
    title: "Update a logo",
    body: "Swap in a new version, fix colors, or add light and dark variants.",
    sla: "LIVE WITHIN A WEEK",
    form: "Request an update",
    submit: "Send update request",
    details: "What should change",
    placeholder: "Link to your press kit or the new SVG.",
    note: "Usually live within a week.",
    next: "Live within a week",
    stepsTitle: "How updates work",
    steps: [
      ["Send the form", "Point us to the new artwork, ideally your press kit."],
      ["We update the library", "We swap in the new files and check the sticker still cuts cleanly."],
      ["It goes live", "Usually within a week. Existing designs update automatically."],
    ],
  },
  feature: {
    title: "Feature your brand",
    body: "Get the Official badge, a Sponsored spot in the logo picker, or a full partnership.",
    sla: "FROM $49 / MONTH",
    form: "Tell us about your brand",
    submit: "Get in touch",
    details: "What you have in mind",
    placeholder: "Launch dates, which logos, anything else.",
    note: "We reply within 3 business days.",
    next: "Reply within 3 business days",
    stepsTitle: "How sponsorship works",
    steps: [
      ["Pick a plan", "Verified, Featured or Partner. Not sure? Tell us what you need."],
      ["We confirm the details", "Artwork, placement and start date. Official needs a short written logo license."],
      ["Goes live", "You approve everything before it ships."],
    ],
  },
};

export const MODE_IDS = Object.keys(MODES) as BrandMode[];

/** Plans keyed by id, straight from BRAND_TIERS so the Support page and this page never disagree. */
export const PLANS = Object.fromEntries(BRAND_TIERS.map((t) => [t.id, t])) as Record<PlanId, BrandTier>;
export const PLAN_IDS = BRAND_TIERS.map((t) => t.id);

/** Personal mail providers: fine for sponsorship, not for acting on a brand's behalf. */
export const FREE_MAIL = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
];

export const MAX_DETAILS = 2000;
export const MAX_LOGOS = 20;

/** Remove and Update act on existing logos, so they need logos, a work address and authorisation. */
export const needsLogos = (mode: BrandMode) => mode !== "feature";

export const MESSAGES = {
  company: "Add the company or brand name.",
  name: "Add your name.",
  email: "Enter a valid email address.",
  freeMail: "Use an email at your company’s domain so we can confirm you work there.",
  logos: "Pick at least one logo.",
  unknownLogo: "We don’t have one of those logos.",
  tooManyLogos: `Pick up to ${MAX_LOGOS} logos.`,
  details: `Keep it under ${MAX_DETAILS.toLocaleString("en-US")} characters.`,
  authorized: "Please confirm you can act for the brand.",
  plan: "Pick a plan or choose Not sure yet.",
} as const;

const text = (max: number, message: string) =>
  z.string({ error: message }).trim().min(1, { error: message }).max(max, { error: message });

export const brandRequestSchema = z
  .object({
    mode: z.enum(["remove", "update", "feature"], { error: "Pick what you’d like to do." }),
    company: text(120, MESSAGES.company),
    name: text(120, MESSAGES.name),
    email: z
      .string({ error: MESSAGES.email })
      .trim()
      .toLowerCase()
      .pipe(z.email({ error: MESSAGES.email }).max(200, { error: MESSAGES.email })),
    logos: z
      .array(z.string(), { error: MESSAGES.logos })
      .max(MAX_LOGOS, { error: MESSAGES.tooManyLogos })
      .refine((keys) => keys.every(isKnownLogo), { error: MESSAGES.unknownLogo })
      .default([]),
    plan: z.enum(["verified", "featured", "partner"], { error: MESSAGES.plan }).nullable().default(null),
    details: z
      .string()
      .max(MAX_DETAILS, { error: MESSAGES.details })
      .nullable()
      .default(null)
      .transform((d) => (d && d.trim() ? d.trim() : null)),
    authorized: z.boolean().default(false),
  })
  .superRefine((r, ctx) => {
    // runs even when other fields failed (see `when`), so every field gets its message in one pass
    if (!r || typeof r !== "object" || !MODE_IDS.includes(r.mode)) return;
    if (!needsLogos(r.mode)) return;
    const email = typeof r.email === "string" ? r.email.trim().toLowerCase() : "";
    const domain = email.split("@")[1] ?? "";
    if (FREE_MAIL.includes(domain)) ctx.addIssue({ code: "custom", path: ["email"], message: MESSAGES.freeMail });
    if (Array.isArray(r.logos) && r.logos.length === 0)
      ctx.addIssue({ code: "custom", path: ["logos"], message: MESSAGES.logos });
    if (r.authorized !== true) ctx.addIssue({ code: "custom", path: ["authorized"], message: MESSAGES.authorized });
  }, { when: (p) => typeof p.value === "object" && p.value !== null })
  .transform((r) => ({
    ...r,
    // keep the stored row tidy: plans only mean something for Feature, logos/auth only for Remove/Update
    plan: r.mode === "feature" ? r.plan : null,
    logos: needsLogos(r.mode) ? [...new Set(r.logos)] : [],
    authorized: needsLogos(r.mode) ? r.authorized : false,
  }));

export type BrandRequestInput = z.input<typeof brandRequestSchema>;
export type BrandRequest = z.output<typeof brandRequestSchema>;

/** First message per top-level field, e.g. { email: "Enter a valid email address." }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : "form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/** Unambiguous uppercase alphabet (no I, L, O, U, 0, 1). */
export const REQUEST_ID_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";

/** "BR-" + 6 random chars, e.g. "BR-7KQ2MX". */
export function makeRequestId(): string {
  const n = REQUEST_ID_ALPHABET.length;
  const limit = 256 - (256 % n); // reject the top bytes so every char is equally likely
  let id = "BR-";
  while (id.length < 9) {
    for (const b of crypto.getRandomValues(new Uint8Array(8))) {
      if (b < limit && id.length < 9) id += REQUEST_ID_ALPHABET[b % n];
    }
  }
  return id;
}

/** What the page keeps after a successful POST, for the "Request received" panel. */
export type SentRequest = { id: string } & Pick<BrandRequest, "mode" | "company" | "email" | "logos" | "plan">;
