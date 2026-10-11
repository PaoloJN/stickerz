/** A brand mark (logo) on the device, drawn as an SVG path so it stays crisp and exports cleanly. */
export type MarkArt = {
  /** path data */
  d: string;
  /** tight bounds of `d` in its own units: [x, y, w, h] */
  box: [number, number, number, number];
};

export type DeviceMark = {
  art: MarkArt;
  /** height on the device, mm */
  h: number;
  /** centre, mm from the top-left of the surface; defaults to the middle */
  at?: [number, number];
};

export type DeviceFinish = {
  id: string;
  name: string;
  /** body color */
  base: string;
  /** logo color */
  logo: string;
  /** dark finishes get a softer highlight and a darker outline */
  dark: boolean;
};

/**
 * One thing you can put stickers on, seen face-on (a laptop lid from behind, the back of a tablet…).
 * Dimensions are the manufacturer's published width × depth.
 */
export type DeviceSpec = {
  id: string;
  brand: string;
  /** group in the device picker, e.g. "MacBook Pro" */
  family: string;
  /** what people call it in a sentence, e.g. "laptop", "bottle": "Center on laptop", "Your bottle is empty" */
  noun: string;
  name: string;
  /** mm */
  w: number;
  h: number;
  /** corner radius, mm */
  radius: number;
  finishes: DeviceFinish[];
  mark?: DeviceMark;
};
