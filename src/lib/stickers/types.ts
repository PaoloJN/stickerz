import type { TextSpec } from "./text";

/** a `DeviceSpec` id from `devices/` */
export type LaptopModel = string;
/** a `DeviceFinish` id of that device */
export type LaptopColor = string;

/** order is part of the share-link format; "square" is shown as "Rounded" and uses `radius` */
export const SHAPES = ["diecut", "circle", "hex", "square"] as const;
export type StickerShape = (typeof SHAPES)[number];

/** die-cut border: "smooth" traces a soft cut line, "tight" grows the logo's own vector shape */
export const CONTOURS = ["smooth", "tight"] as const;
export type Contour = (typeof CONTOURS)[number];

export const FINISHES = ["matte", "gloss", "holo"] as const;
export type Finish = (typeof FINISHES)[number];

/** hex color, or a keyword resolved at render time */
export type Fill = "auto" | "clear" | string;
export type LogoColor = "original" | "mono" | string;
export type BorderColor = "device" | "auto" | "holo" | string;
export type OutlineColor = "auto" | "holo" | string;

export type StickerStyle = {
  shape: StickerShape;
  /** corner radius for "square", % of the short side (0 sharp – 50 pill) */
  radius: number;
  fill: Fill;
  logoColor: LogoColor;
  /** logo size inside shaped stickers, % of the sticker */
  pad: number;
  /** vinyl around the logo (die-cut) or around the shape */
  border: boolean;
  borderColor: BorderColor;
  /** border width in mm */
  borderWidth: number;
  /** thin keyline on the sticker's outer edge */
  outline: boolean;
  outlineColor: OutlineColor;
  /** mm */
  outlineWidth: number;
  contour: Contour;
  /** die-cut: how much the cut line rounds off notches, 0 tight – 100 soft */
  smooth: number;
  /** die-cut: fill holes inside the logo with vinyl */
  fillHoles: boolean;
  /** die-cut: join separate parts into one piece */
  merge: boolean;
  finish: Finish;
  /** 0 flat – 100 thick vinyl */
  lift: number;
};

export type Sticker = StickerStyle & {
  id: string;
  logo: string;
  variant: "icon" | "wordmark";
  /** alternate design of the brand (StickerLogo.styles id); unset = the default style */
  style?: string;
  theme: "light" | "dark";
  locked: boolean;
  /** centre, mm from lid top-left */
  x: number;
  y: number;
  /** width in mm; height derived from art aspect */
  w: number;
  /** degrees */
  rot: number;
  /** set when `logo` is "@text" */
  text?: TextSpec;
  /** logo recolouring: original hex → new hex (lowercase) */
  colors?: Record<string, string>;
};

/** stickers array order = z-order (last on top) */
export type Layout = { v: 1; laptop: { model: LaptopModel; color: LaptopColor }; stickers: Sticker[]; /** design name; "My design" when unset */ name?: string };
