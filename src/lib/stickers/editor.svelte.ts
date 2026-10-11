import { decodeLayout, encodeLayout } from "./codec";
import { clampWidth, clamp, rotatedExtents, stickerGeometry } from "./geometry";
import { History } from "./history";
import { newId } from "./id";
import { getDevice, getFinish } from "./devices";
import { stickerArt } from "./custom.svelte";
import { emptyLayout } from "./laptops";
import { LOGO_BY_KEY } from "./logos";
import * as ops from "./ops";
import { loadLayout, saveLayout } from "./storage";
import { DEFAULT_STYLE, pickStyle, TONE } from "./style";
import { DEFAULT_W, placeFor, placeStyleFor } from "./overrides";
import { TEXT_KEY } from "./source";
import { DEFAULT_TEXT } from "./text";
import type { Layout, Sticker, StickerStyle } from "./types";

type Store = Pick<Storage, "getItem" | "setItem"> | null;

const snap = (l: Layout): Layout => structuredClone($state.snapshot(l)) as Layout;

function resolveInitial(storage: Store): Layout {
  try {
    if (typeof location !== "undefined" && location.hash.startsWith("#l=")) {
      const fromHash = decodeLayout(location.hash.slice(3));
      if (fromHash) return fromHash;
    }
  } catch {
    // ignore
  }
  return loadLayout(storage) ?? emptyLayout();
}

export class EditorState {
  layout = $state<Layout>(emptyLayout());
  /** single selection; null while several are selected */
  selectedId = $state<string | null>(null);
  /** multi-selection (2+ ids); empty when zero or one sticker is selected */
  selectedIds = $state<string[]>([]);
  zoom = $state(1);
  panX = $state(0);
  panY = $state(0);
  aspects = $state<Record<string, number>>({});
  /** UI: preview hides every panel and handle to show the lid as others will see it */
  preview = $state(false);
  /** UI: dot grid behind the canvas */
  showGrid = $state(true);
  /** UI: the lid's on-screen size as a share of real size, set by the canvas */
  viewScale = $state(1);
  /** UI: the export dialog, open on a tab */
  exportDialog = $state<"download" | "share" | null>(null);
  /** UI: a multi-selection is being dragged, so its stickers track the pointer without easing */
  groupDragging = $state(false);
  /** UI: the sticker style panel is open while something is selected */
  stylePanel = $state(true);
  /** server id once this stack has been saved to My stacks; null = unsaved draft */
  savedId = $state<string | null>(null);
  /** a save request is in flight */
  saving = $state(false);

  readonly selected: Sticker | null = $derived(this.layout.stickers.find((s) => s.id === this.selectedId) ?? null);

  #history = new History<Layout>(100);
  // History is not reactive itself; this counter makes canUndo/canRedo reactive.
  #rev = $state(0);
  #gesture = false;
  #gesturePushed = false;
  #storage: Store;
  #timer: ReturnType<typeof setTimeout> | null = null;

  constructor(initial?: Layout, opts?: { storage?: Store }) {
    this.#storage = opts?.storage ?? null;
    this.layout = initial ?? resolveInitial(this.#storage);
  }

  /** every selected id, whether one or many */
  get selection(): string[] {
    return this.selectedIds.length ? this.selectedIds : this.selectedId ? [this.selectedId] : [];
  }

  /** One id selects it alone, two or more become a multi-selection, none clears. Unknown ids are dropped. */
  setSelection(ids: string[]) {
    const known = this.layout.stickers.map((s) => s.id);
    const next = ids.filter((id, i) => ids.indexOf(id) === i && known.includes(id));
    this.selectedIds = next.length >= 2 ? next : [];
    this.selectedId = next.length === 1 ? next[0] : null;
  }

  /** shift-click: add or remove one sticker from the selection */
  toggleSelected(id: string) {
    const cur = this.selection;
    this.setSelection(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  }

  selectAll() {
    this.setSelection(this.layout.stickers.map((s) => s.id));
  }

  /** a sticker's centre and rotated half extents, mm */
  boxOf(s: Sticker) {
    const href = stickerArt(s).href;
    const aspect = href ? (this.aspects[href] ?? 1) : 1;
    const g = stickerGeometry(s, aspect);
    const { hw, hh } = rotatedExtents(g.w, g.h, s.rot);
    return { id: s.id, x: s.x, y: s.y, hw, hh, locked: s.locked };
  }

  /** number of committed changes; autosave uses this as a cheap dirty signal */
  get rev(): number {
    return this.#rev;
  }

  get canUndo() {
    void this.#rev;
    return this.#history.canUndo;
  }
  get canRedo() {
    void this.#rev;
    return this.#history.canRedo;
  }

  #persist() {
    if (!this.#storage) return;
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.flush(), 300);
  }

  /** Write any pending debounced save immediately. */
  flush() {
    if (!this.#timer) return;
    clearTimeout(this.#timer);
    this.#timer = null;
    saveLayout(this.#storage, $state.snapshot(this.layout) as Layout);
  }

  /** Apply a new layout; records one history entry unless inside a gesture. Same reference = no-op. */
  #commit(next: Layout) {
    if (next === this.layout) return;
    if (!this.#gesture || !this.#gesturePushed) {
      this.#history.push(snap(this.layout));
      this.#rev++;
      if (this.#gesture) this.#gesturePushed = true;
    }
    this.layout = next;
    this.#persist();
  }

  addSticker(logo: string, at?: { x: number; y: number }, extra: Partial<Sticker> = {}): Sticker {
    const lid = getDevice(this.layout.laptop.model);
    const jitter = () => (Math.random() - 0.5) * 20;
    const s: Sticker = {
      id: newId(),
      logo,
      variant: "icon",
      // dark backing unless the logo has no art drawn for dark backgrounds
      theme: LOGO_BY_KEY.get(logo)?.icon.dark ? "dark" : "light",
      locked: false,
      ...DEFAULT_STYLE,
      x: at?.x ?? lid.w / 2 + jitter(),
      y: at?.y ?? lid.h / 2 + jitter(),
      // default size — matches the "Default" preset in the dock's size menu
      w: DEFAULT_W,
      rot: Math.round((Math.random() - 0.5) * 24),
      // hand-tuned defaults for this logo (overrides.ts), then whatever the caller asked for
      ...placeFor(logo),
      ...extra,
    };
    this.#commit({ ...this.layout, stickers: [...this.layout.stickers, s] });
    this.selectedId = s.id;
    return s;
  }

  /** A text sticker; the text contrasts the default border, which contrasts the device. */
  addText(at?: { x: number; y: number }): Sticker {
    const lid = this.layout.laptop;
    const dark = getFinish(getDevice(lid.model), lid.color).dark;
    return this.addSticker(TEXT_KEY, at, { w: 60, rot: 0, text: { ...DEFAULT_TEXT, color: dark ? TONE.dark : TONE.light } });
  }

  /** Patch several stickers as one undo step; `patch` may depend on the sticker. */
  updateMany(ids: string[], patch: Partial<Omit<Sticker, "id">> | ((s: Sticker) => Partial<Omit<Sticker, "id">>)) {
    let changed = false;
    const stickers = this.layout.stickers.map((s) => {
      if (!ids.includes(s.id)) return s;
      const p = typeof patch === "function" ? patch(s) : patch;
      const next = { ...s, ...p };
      if (p.w !== undefined) next.w = clampWidth(p.w);
      if ((Object.keys(p) as (keyof Sticker)[]).every((k) => next[k] === s[k])) return s;
      changed = true;
      return next;
    });
    if (changed) this.#commit({ ...this.layout, stickers });
  }

  /** Move unlocked stickers by a delta, kept on the lid. */
  moveBy(ids: string[], dx: number, dy: number) {
    const lid = getDevice(this.layout.laptop.model);
    this.updateMany(ids, (s) => (s.locked ? {} : { x: clamp(s.x + dx, 0, lid.w), y: clamp(s.y + dy, 0, lid.h) }));
  }

  align(kind: ops.AlignKind) {
    this.#place(ops.align(this.#boxes(), kind));
  }

  distribute(axis: "x" | "y"): boolean {
    const boxes = this.#boxes();
    if (boxes.length < 3) return false;
    this.#place(ops.distribute(boxes, axis));
    return true;
  }

  #boxes() {
    const sel = this.selection;
    return this.layout.stickers.filter((s) => sel.includes(s.id)).map((s) => this.boxOf(s));
  }
  #place(pos: Record<string, { x?: number; y?: number }>) {
    this.updateMany(Object.keys(pos), (s) => pos[s.id]);
  }

  removeMany(ids: string[]) {
    if (!this.layout.stickers.some((s) => ids.includes(s.id))) return;
    this.#commit({ ...this.layout, stickers: this.layout.stickers.filter((s) => !ids.includes(s.id)) });
    this.setSelection(this.selection.filter((id) => !ids.includes(id)));
  }

  /** Copies offset by 5mm, selected afterwards. */
  duplicateMany(ids: string[]) {
    const copies = this.layout.stickers
      .filter((s) => ids.includes(s.id))
      .map((s): Sticker => ({ ...$state.snapshot(s), id: newId(), x: s.x + 5, y: s.y + 5, locked: false }));
    if (!copies.length) return;
    this.#commit({ ...this.layout, stickers: [...this.layout.stickers, ...copies] });
    this.setSelection(copies.map((c) => c.id));
  }

  /** Add a set of logos spread over the lid (starter packs), as one undo step. */
  addMany(logos: string[]) {
    const lid = getDevice(this.layout.laptop.model);
    const spots = ops.gridSpots(logos.length, lid);
    const made = logos.map(
      (logo, i): Sticker => ({
        id: newId(),
        logo,
        variant: "icon",
        theme: LOGO_BY_KEY.get(logo)?.icon.dark ? "dark" : "light",
        locked: false,
        ...DEFAULT_STYLE,
        ...spots[i],
        w: 30 + Math.round(Math.random() * 8),
        ...placeFor(logo),
      }),
    );
    if (!made.length) return;
    this.#commit({ ...this.layout, stickers: [...this.layout.stickers, ...made] });
    this.setSelection([]);
  }

  update(id: string, patch: Partial<Omit<Sticker, "id">>) {
    const i = this.layout.stickers.findIndex((s) => s.id === id);
    if (i < 0) return;
    const cur = this.layout.stickers[i];
    const next = { ...cur, ...patch };
    if (patch.w !== undefined) next.w = clampWidth(patch.w);
    if ((Object.keys(next) as (keyof Sticker)[]).every((k) => next[k] === cur[k])) return;
    const stickers = this.layout.stickers.slice();
    stickers[i] = next;
    this.#commit({ ...this.layout, stickers });
  }

  remove(id: string) {
    if (!this.layout.stickers.some((s) => s.id === id)) return;
    this.#commit({ ...this.layout, stickers: this.layout.stickers.filter((s) => s.id !== id) });
    if (this.selection.includes(id)) this.setSelection(this.selection.filter((x) => x !== id));
  }

  duplicate(id: string): Sticker | null {
    const src = this.layout.stickers.find((s) => s.id === id);
    if (!src) return null;
    const copy: Sticker = { ...$state.snapshot(src), id: newId(), x: src.x + 5, y: src.y + 5, locked: false };
    this.#commit({ ...this.layout, stickers: [...this.layout.stickers, copy] });
    this.selectedId = copy.id;
    return copy;
  }

  bringForward(id: string) {
    this.#commit(ops.bringForward(this.layout, id));
  }
  sendBackward(id: string) {
    this.#commit(ops.sendBackward(this.layout, id));
  }
  toFront(id: string) {
    this.#commit(ops.toFront(this.layout, id));
  }
  toBack(id: string) {
    this.#commit(ops.toBack(this.layout, id));
  }

  setLaptop(patch: Partial<Layout["laptop"]>) {
    const laptop = { ...this.layout.laptop, ...patch };
    // keep the color when the new device offers it, else its first finish
    const device = getDevice(laptop.model);
    if (!device.finishes.some((f) => f.id === laptop.color)) laptop.color = device.finishes[0].id;
    if (laptop.model === this.layout.laptop.model && laptop.color === this.layout.laptop.color) return;
    const moved = ops.rescale(this.layout, getDevice(this.layout.laptop.model), getDevice(laptop.model));
    this.#commit({ ...moved, laptop });
  }

  rename(name: string) {
    const next = name.trim().slice(0, 60);
    if (next === (this.layout.name ?? "")) return;
    const layout: Layout = { ...this.layout, name: next };
    if (!next) delete layout.name;
    this.#commit(layout);
  }

  shuffle() {
    this.#commit(ops.shuffle(this.layout, getDevice(this.layout.laptop.model)));
  }

  /** Copy one sticker's style (shape, backing, border, finish…) onto every sticker. */
  applyStyleToAll(id: string) {
    const src = this.layout.stickers.find((s) => s.id === id);
    if (!src) return;
    const style = pickStyle(src);
    this.#commit({ ...this.layout, stickers: this.layout.stickers.map((s) => ({ ...s, ...style })) });
  }

  /** Patch every sticker (style, rotation…) as one undo step. */
  updateAll(patch: Partial<Omit<Sticker, "id">>) {
    this.updateMany(
      this.layout.stickers.map((s) => s.id),
      patch,
    );
  }

  resetStyle(id: string) {
    const s = this.layout.stickers.find((x) => x.id === id);
    this.update(id, { ...DEFAULT_STYLE, ...(s ? placeStyleFor(s.logo) : {}) } satisfies StickerStyle);
  }

  clear() {
    this.#commit({ ...this.layout, stickers: [] });
    this.setSelection([]);
  }

  replace(layout: Layout) {
    this.#commit(layout);
    this.setSelection([]);
  }

  select(id: string | null) {
    this.selectedIds = [];
    this.selectedId = id;
  }

  /** Starts a gesture; the single history entry is recorded lazily on the first real change. */
  beginGesture() {
    if (this.#gesture) return;
    this.#gesture = true;
    this.#gesturePushed = false;
  }
  endGesture() {
    this.#gesture = false;
    this.#gesturePushed = false;
  }

  #restore(l: Layout | null) {
    if (!l) return;
    this.layout = l;
    this.#rev++;
    if (this.selection.some((id) => !l.stickers.some((s) => s.id === id))) this.setSelection(this.selection);
    this.#persist();
  }
  undo() {
    this.#restore(this.#history.undo(snap(this.layout)));
  }
  redo() {
    this.#restore(this.#history.redo(snap(this.layout)));
  }

  setZoom(z: number) {
    this.zoom = clamp(z, 0.25, 4);
  }

  shareHash(): string {
    return "#l=" + encodeLayout($state.snapshot(this.layout) as Layout);
  }
}

export function createEditor(initial?: Layout, opts?: { storage?: Store }): EditorState {
  return new EditorState(initial, opts);
}
