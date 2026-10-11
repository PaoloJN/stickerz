import { sanitizeLayout } from "./codec";
import { isKnownLogo } from "./logos";
import type { Layout } from "./types";

export const LAYOUT_KEY = "ss:layout";

export function loadLayout(storage: Pick<Storage, "getItem"> | null, known: (k: string) => boolean = isKnownLogo): Layout | null {
  try {
    const raw = storage?.getItem(LAYOUT_KEY);
    return raw ? sanitizeLayout(JSON.parse(raw), known) : null;
  } catch {
    return null;
  }
}

export function saveLayout(storage: Pick<Storage, "setItem"> | null, layout: Layout): void {
  try {
    storage?.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    // storage unavailable: editor keeps working without persistence
  }
}
