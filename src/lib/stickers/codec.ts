// lz-string ships as CommonJS; import the default and destructure so it works under Node ESM (SSR/build)
import lzString from "lz-string";
const { compressToEncodedURIComponent, decompressFromEncodedURIComponent } = lzString;
import { clamp, clampWidth, normalizeDeg } from "./geometry";
import { newId } from "./id";
import { DEFAULT_DEVICE, DEVICES, getDevice } from "./devices";
import { isKnownLogo, LOGO_BY_KEY, STYLE_ALIASES } from "./logos";
import { isCustomKey, TEXT_KEY } from "./source";
import { sanitizeText } from "./text";
import { DEFAULT_STYLE, isHex, LIMITS } from "./style";
import { CONTOURS, FINISHES, SHAPES, type Layout, type Sticker } from "./types";

export const MAX_STICKERS = 200;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const oneOf = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d);
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const ranged = (v: unknown, [lo, hi]: readonly [number, number], d: number) => clamp(num(v, d), lo, hi);
const colorOr = (v: unknown, keywords: readonly string[], d: string) => (keywords.includes(v as string) || isHex(v) ? (v as string) : d);

/** Only hex → hex pairs survive; empty maps are dropped so plain stickers stay plain. */
function colorMap(v: unknown): { colors?: Record<string, string> } {
  if (!isObj(v)) return {};
  const pairs = Object.entries(v).filter(([k, c]) => isHex(k) && isHex(c)).slice(0, 24).map(([k, c]) => [k.toLowerCase(), (c as string).toLowerCase()]);
  return pairs.length ? { colors: Object.fromEntries(pairs) } : {};
}

export function sanitizeLayout(input: unknown, known: (k: string) => boolean = isKnownLogo): Layout | null {
  if (!isObj(input) || input.v !== 1) return null;
  const lap = isObj(input.laptop) ? input.laptop : {};
  const model = typeof lap.model === "string" && DEVICES[lap.model] ? lap.model : DEFAULT_DEVICE.model;
  const lid = getDevice(model);
  const color = lid.finishes.some((f) => f.id === lap.color) ? (lap.color as string) : model === DEFAULT_DEVICE.model ? DEFAULT_DEVICE.color : lid.finishes[0].id;
  const raw = Array.isArray(input.stickers) ? input.stickers : [];
  const stickers: Sticker[] = [];
  for (const s of raw) {
    if (stickers.length >= MAX_STICKERS) break;
    if (!isObj(s) || typeof s.logo !== "string") continue;
    // a brand entry that was folded into another sticker's styles (styles.ts) opens as that sticker + style
    const alias = known(s.logo) ? undefined : STYLE_ALIASES[s.logo];
    const logo = alias ? alias.logo : s.logo;
    if (!(alias || known(logo) || isCustomKey(logo))) continue;
    const styles = LOGO_BY_KEY.get(logo)?.styles;
    const style = alias?.style ?? (typeof s.style === "string" && styles?.some((x, i) => i > 0 && x.id === s.style) ? s.style : undefined);
    const text = s.logo === TEXT_KEY ? sanitizeText(s.text) : null;
    if (s.logo === TEXT_KEY && !text) continue;
    stickers.push({
      id: typeof s.id === "string" && s.id ? s.id : newId(),
      logo,
      ...(style ? { style } : {}),
      variant: oneOf(s.variant, ["icon", "wordmark"] as const, "icon"),
      theme: oneOf(s.theme, ["light", "dark"] as const, "light"),
      locked: s.locked === true,
      shape: oneOf(s.shape, SHAPES, DEFAULT_STYLE.shape),
      radius: ranged(s.radius, LIMITS.radius, DEFAULT_STYLE.radius),
      fill: colorOr(s.fill, ["auto", "clear"], DEFAULT_STYLE.fill),
      logoColor: colorOr(s.logoColor, ["original", "mono"], DEFAULT_STYLE.logoColor),
      pad: ranged(s.pad, LIMITS.pad, DEFAULT_STYLE.pad),
      border: typeof s.border === "boolean" ? s.border : DEFAULT_STYLE.border,
      borderColor: colorOr(s.borderColor, ["device", "auto", "holo"], DEFAULT_STYLE.borderColor),
      borderWidth: ranged(s.borderWidth, LIMITS.borderWidth, DEFAULT_STYLE.borderWidth),
      outline: typeof s.outline === "boolean" ? s.outline : DEFAULT_STYLE.outline,
      outlineColor: colorOr(s.outlineColor, ["auto", "holo"], DEFAULT_STYLE.outlineColor),
      outlineWidth: ranged(s.outlineWidth, LIMITS.outlineWidth, DEFAULT_STYLE.outlineWidth),
      smooth: ranged(s.smooth, LIMITS.smooth, DEFAULT_STYLE.smooth),
      fillHoles: typeof s.fillHoles === "boolean" ? s.fillHoles : DEFAULT_STYLE.fillHoles,
      merge: typeof s.merge === "boolean" ? s.merge : DEFAULT_STYLE.merge,
      contour: oneOf(s.contour, CONTOURS, DEFAULT_STYLE.contour),
      ...colorMap(s.colors),
      ...(text ? { text } : {}),
      // `holo: true` is the pre-finish format
      finish: oneOf(s.finish, FINISHES, s.holo === true ? "holo" : DEFAULT_STYLE.finish),
      lift: ranged(s.lift, LIMITS.lift, DEFAULT_STYLE.lift),
      x: clamp(num(s.x, lid.w / 2), 0, lid.w),
      y: clamp(num(s.y, lid.h / 2), 0, lid.h),
      w: clampWidth(num(s.w, Number.NaN)),
      rot: normalizeDeg(num(s.rot, 0)),
    });
  }
  const name = typeof input.name === "string" ? input.name.trim().slice(0, MAX_NAME) : "";
  return { v: 1, laptop: { model, color }, stickers, ...(name ? { name } : {}) };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export const MAX_NAME = 60;

export function encodeLayout(l: Layout): string {
  const compact = [
    1,
    l.laptop.model,
    l.laptop.color,
    // fields after rot were added later; old links decode with defaults
    l.stickers.map((s) => [
      s.logo, s.variant === "wordmark" ? 1 : 0, s.theme === "dark" ? 1 : 0, SHAPES.indexOf(s.shape), s.finish === "holo" ? 1 : 0, r1(s.x), r1(s.y), r1(s.w), Math.round(s.rot),
      s.locked ? 1 : 0, Math.round(s.radius), s.fill, s.logoColor, Math.round(s.pad), s.border ? 1 : 0, s.borderColor, s.borderWidth, FINISHES.indexOf(s.finish), Math.round(s.lift),
      s.outline ? 1 : 0, s.outlineColor, s.outlineWidth, Math.round(s.smooth), s.fillHoles ? 1 : 0, s.merge ? 1 : 0,
      CONTOURS.indexOf(s.contour), s.colors ?? 0,
      s.text ? [s.text.value, s.text.font, s.text.color, s.text.align, s.text.spacing] : 0,
      s.style ?? 0,
    ]),
    ...(l.name ? [l.name] : []),
  ];
  return compressToEncodedURIComponent(JSON.stringify(compact));
}

export function decodeLayout(str: string, known: (k: string) => boolean = isKnownLogo): Layout | null {
  try {
    const json = decompressFromEncodedURIComponent(str);
    if (!json) return null;
    const c: unknown = JSON.parse(json);
    if (!Array.isArray(c) || c[0] !== 1 || !Array.isArray(c[3])) return null;
    return sanitizeLayout(
      {
        v: 1,
        laptop: { model: c[1], color: c[2] },
        name: c[4],
        stickers: (c[3] as unknown[]).slice(0, MAX_STICKERS).map((t) =>
          Array.isArray(t)
            ? {
                logo: t[0],
                variant: t[1] === 1 ? "wordmark" : "icon",
                theme: t[2] === 1 ? "dark" : "light",
                shape: SHAPES[t[3] as number],
                holo: t[4] === 1,
                x: t[5],
                y: t[6],
                w: t[7],
                rot: t[8],
                ...(t.length > 9
                  ? { locked: t[9] === 1, radius: t[10], fill: t[11], logoColor: t[12], pad: t[13], border: t[14] === 1, borderColor: t[15], borderWidth: t[16], finish: FINISHES[t[17] as number], lift: t[18] }
                  : {}),
                ...(t.length > 19
                  ? { outline: t[19] === 1, outlineColor: t[20], outlineWidth: t[21], smooth: t[22], fillHoles: t[23] === 1, merge: t[24] === 1 }
                  : {}),
                ...(t.length > 25 ? { contour: CONTOURS[t[25] as number], colors: t[26] } : {}),
                ...(Array.isArray(t[27]) ? { text: { value: t[27][0], font: t[27][1], color: t[27][2], align: t[27][3], spacing: t[27][4] } } : {}),
                ...(typeof t[28] === "string" ? { style: t[28] } : {}),
              }
            : null
        ),
      },
      known
    );
  } catch {
    return null;
  }
}
