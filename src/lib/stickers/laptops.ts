import { DEFAULT_DEVICE } from "./devices";
import type { Layout } from "./types";

export function emptyLayout(): Layout {
  return { v: 1, laptop: { ...DEFAULT_DEVICE }, stickers: [] };
}
