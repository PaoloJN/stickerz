export type DesignSort = "edited" | "name" | "stickers";

export const DESIGN_SORTS: { id: DesignSort; label: string }[] = [
  { id: "edited", label: "Last edited" },
  { id: "name", label: "Name A–Z" },
  { id: "stickers", label: "Most stickers" },
];

/** Case-insensitive substring match on the design name; blank query keeps everything. */
export function filterDesigns<T extends { name: string }>(list: T[], q: string): T[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return list;
  return list.filter((d) => d.name.toLowerCase().includes(needle));
}

/** "edited" keeps the incoming order (already last-edited first). Never mutates. */
export function sortDesigns<T extends { name: string; count: number }>(list: T[], by: DesignSort): T[] {
  const out = [...list];
  if (by === "name") out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  else if (by === "stickers") out.sort((a, b) => b.count - a.count);
  return out;
}
