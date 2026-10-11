import { APPLE } from "./marks";
import type { DeviceFinish, DeviceSpec } from "./types";

// Sizes: apple.com/macbook-*/specs (width × depth). Body colors are Apple's own finish swatches; the polished logo
// reads a shade darker than the lid. Logo heights are measured off front-on product shots, scaled to the lid depth.
const finish = (id: string, name: string, base: string, logo: string, dark: boolean): DeviceFinish => ({ id, name, base, logo, dark });

const SILVER = finish("silver", "Silver", "#e3e4e5", "#bfc0c3", false);
const SPACE_GRAY = finish("space-gray", "Space Gray", "#7d7e80", "#5e5f62", true);
const SPACE_BLACK = finish("space-black", "Space Black", "#2e2c2e", "#1c1b1d", true);
const MIDNIGHT = finish("midnight", "Midnight", "#2e3642", "#1d232c", true);
const STARLIGHT = finish("starlight", "Starlight", "#f0e4d3", "#d1c3ae", false);
const SKY_BLUE = finish("sky-blue", "Sky Blue", "#c9d8e3", "#a9b9c5", false);
const GOLD = finish("gold", "Gold", "#e3ccb4", "#c5ac93", false);

const AIR = [SKY_BLUE, MIDNIGHT, STARLIGHT, SILVER, SPACE_GRAY];
const PRO = [SPACE_BLACK, SILVER, SPACE_GRAY];

export const APPLE_DEVICES: DeviceSpec[] = [
  { id: "air13", brand: "Apple", noun: "laptop", family: "MacBook Air", name: "MacBook Air 13″", w: 304.1, h: 215.0, radius: 8, finishes: AIR, mark: { art: APPLE, h: 27 } },
  { id: "air15", brand: "Apple", noun: "laptop", family: "MacBook Air", name: "MacBook Air 15″", w: 340.4, h: 237.6, radius: 8.5, finishes: AIR, mark: { art: APPLE, h: 30 } },
  { id: "air13-m1", brand: "Apple", noun: "laptop", family: "MacBook Air", name: "MacBook Air 13″ (M1)", w: 304.1, h: 212.4, radius: 7, finishes: [SILVER, SPACE_GRAY, GOLD], mark: { art: APPLE, h: 26 } },
  { id: "pro14", brand: "Apple", noun: "laptop", family: "MacBook Pro", name: "MacBook Pro 14″", w: 312.6, h: 221.2, radius: 8.5, finishes: PRO, mark: { art: APPLE, h: 33 } },
  { id: "pro16", brand: "Apple", noun: "laptop", family: "MacBook Pro", name: "MacBook Pro 16″", w: 355.7, h: 248.1, radius: 9, finishes: PRO, mark: { art: APPLE, h: 36 } },
  { id: "pro13", brand: "Apple", noun: "laptop", family: "MacBook Pro", name: "MacBook Pro 13″ (M1/M2)", w: 304.1, h: 212.4, radius: 7, finishes: [SPACE_GRAY, SILVER], mark: { art: APPLE, h: 26 } },
];
