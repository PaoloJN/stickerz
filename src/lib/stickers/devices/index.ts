import { APPLE_DEVICES } from "./apple";
import type { DeviceFinish, DeviceSpec } from "./types";

export type { DeviceFinish, DeviceMark, DeviceSpec, MarkArt } from "./types";

/**
 * Every surface you can put stickers on.
 *
 * To add a device: add a `DeviceSpec` to a brand file (e.g. `lenovo.ts`, copy `apple.ts`), put its logo path in
 * `marks.ts`, and spread the list in here. Ids are stored in share links, so never rename one.
 */
export const DEVICE_LIST: DeviceSpec[] = [...APPLE_DEVICES];

export const DEVICES: Record<string, DeviceSpec> = Object.fromEntries(DEVICE_LIST.map((d) => [d.id, d]));

export const DEFAULT_DEVICE = { model: "pro14", color: "space-black" } as const;

/** Unknown ids fall back to the default device, so old or hand-edited layouts still open. */
export const getDevice = (id: string): DeviceSpec => DEVICES[id] ?? DEVICES[DEFAULT_DEVICE.model];

/** The item's everyday name for UI text ("laptop"). Use this instead of hard-coding a surface word. */
export const itemNoun = (id: string): string => getDevice(id).noun;

export const getFinish = (d: DeviceSpec, id: string): DeviceFinish => d.finishes.find((f) => f.id === id) ?? d.finishes[0];

/** Devices grouped for the picker, in registry order. */
export function deviceGroups(): { family: string; devices: DeviceSpec[] }[] {
  const groups: { family: string; devices: DeviceSpec[] }[] = [];
  for (const d of DEVICE_LIST) {
    const g = groups.find((x) => x.family === d.family);
    if (g) g.devices.push(d);
    else groups.push({ family: d.family, devices: [d] });
  }
  return groups;
}
