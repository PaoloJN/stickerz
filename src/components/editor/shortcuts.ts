import type { EditorState } from "$lib/stickers/editor.svelte";

export type ShortcutAction =
  | { type: "undo" }
  | { type: "redo" }
  | { type: "duplicate" }
  | { type: "delete" }
  | { type: "nudge"; dx: number; dy: number }
  | { type: "backward" }
  | { type: "forward" }
  | { type: "toBack" }
  | { type: "toFront" }
  | { type: "deselect" }
  | { type: "shuffle" }
  | { type: "lock" }
  | { type: "selectAll" };

type KeyLike = { key: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey?: boolean };

/** Pure key -> action mapping. Returns null for unhandled keys. */
export function keyToAction(e: KeyLike): ShortcutAction | null {
  const mod = e.metaKey || e.ctrlKey;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (mod) {
    if (k === "z") return e.shiftKey ? { type: "redo" } : { type: "undo" };
    if (k === "y") return { type: "redo" };
    if (k === "d") return { type: "duplicate" };
    if (k === "a") return { type: "selectAll" };
    if (k === "[") return { type: "toBack" };
    if (k === "]") return { type: "toFront" };
    return null;
  }
  if (e.altKey) return null;
  const step = e.shiftKey ? 10 : 1;
  switch (k) {
    case "Delete":
    case "Backspace":
      return { type: "delete" };
    case "ArrowLeft":
      return { type: "nudge", dx: -step, dy: 0 };
    case "ArrowRight":
      return { type: "nudge", dx: step, dy: 0 };
    case "ArrowUp":
      return { type: "nudge", dx: 0, dy: -step };
    case "ArrowDown":
      return { type: "nudge", dx: 0, dy: step };
    case "[":
      return { type: "backward" };
    case "]":
      return { type: "forward" };
    // shift+[ / shift+] arrive as { and } on most layouts
    case "{":
      return { type: "toBack" };
    case "}":
      return { type: "toFront" };
    case "Escape":
      return { type: "deselect" };
    case "s":
      return { type: "shuffle" };
    case "l":
      return { type: "lock" };
    default:
      return null;
  }
}

export function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || typeof el.tagName !== "string") return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

/**
 * Installs the editor's keyboard shortcuts on `target`. The full editor passes `window`; an embedded
 * editor (the home demo) passes its canvas element, so keys only act while focus is inside it and
 * nothing is flushed on pagehide (the demo has no storage).
 */
export function installShortcuts(editor: EditorState, target: Window | HTMLElement): () => void {
  const scoped = !("document" in target);
  const doc = scoped ? (target as HTMLElement).ownerDocument : (target as Window).document;
  const handler = (ev: Event) => {
    const e = ev as KeyboardEvent;
    if (isTypingTarget(e.target) || editor.preview || doc.querySelector("[role=dialog][aria-modal=true]")) return;
    const a = keyToAction(e);
    if (!a) return;
    const ids = editor.selection;
    const id = editor.selectedId;
    // z-order moves one sticker at a time; the rest work on the whole selection
    const single = ["backward", "forward", "toBack", "toFront"].includes(a.type);
    const needsSel = !["undo", "redo", "deselect", "shuffle", "selectAll"].includes(a.type);
    if (needsSel && (single ? !id : !ids.length)) return;
    e.preventDefault();
    switch (a.type) {
      case "undo":
        editor.undo();
        break;
      case "redo":
        editor.redo();
        break;
      case "selectAll":
        editor.selectAll();
        break;
      case "duplicate":
        editor.duplicateMany(ids);
        break;
      case "delete":
        editor.removeMany(ids);
        break;
      case "nudge":
        editor.moveBy(ids, a.dx, a.dy);
        break;
      case "shuffle":
        editor.shuffle();
        break;
      case "lock": {
        const lock = !editor.layout.stickers.filter((s) => ids.includes(s.id)).every((s) => s.locked);
        editor.updateMany(ids, { locked: lock });
        break;
      }
      case "backward":
        editor.sendBackward(id!);
        break;
      case "forward":
        editor.bringForward(id!);
        break;
      case "toBack":
        editor.toBack(id!);
        break;
      case "toFront":
        editor.toFront(id!);
        break;
      case "deselect":
        editor.select(null);
        break;
    }
  };
  const flush = () => editor.flush();
  const vis = () => {
    if (doc.visibilityState === "hidden") editor.flush();
  };
  target.addEventListener("keydown", handler);
  if (scoped) return () => target.removeEventListener("keydown", handler);
  target.addEventListener("pagehide", flush);
  doc.addEventListener("visibilitychange", vis);
  return () => {
    target.removeEventListener("keydown", handler);
    target.removeEventListener("pagehide", flush);
    doc.removeEventListener("visibilitychange", vis);
  };
}
