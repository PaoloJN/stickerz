export class OwnershipError extends Error {}

export function slugify(name: string): string {
  const s = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s || "stack";
}

function suffix(len = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

export function makeId(name: string): string {
  return `${slugify(name)}-${suffix()}`;
}

const ADJ = ["swift", "calm", "brave", "lucky", "quiet", "bright", "bold", "keen", "warm", "spry"];
const NOUN = ["otter", "finch", "maple", "comet", "river", "fox", "heron", "pine", "wren", "lynx"];

export function handleFor(ownerId: string): string {
  let h = 0;
  for (let i = 0; i < ownerId.length; i++) h = (h * 31 + ownerId.charCodeAt(i)) >>> 0;
  return `${ADJ[h % ADJ.length]}-${NOUN[(h >>> 8) % NOUN.length]}`;
}

export function assertOwner(row: { ownerId: string }, ownerId: string): void {
  if (row.ownerId !== ownerId) throw new OwnershipError("not the owner");
}
