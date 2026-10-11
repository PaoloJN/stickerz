import { toast } from "svelte-sonner";
import type { EditorState } from "$lib/stickers/editor.svelte";
import { emptyLayout } from "$lib/stickers/laptops";
import { saveStack } from "./save.svelte";

/** A saved design as the header's switcher lists it. */
export type DesignSummary = { id: string; name: string; count: number; edited: string; model: string; color: string };

export async function listDesigns(): Promise<DesignSummary[]> {
  const r = await fetch("/api/stacks");
  if (!r.ok) throw new Error("could not list");
  return (await r.json()).designs as DesignSummary[];
}

/** An unsaved design with stickers on it is saved first, so switching away never loses work. */
async function keepCurrent(editor: EditorState): Promise<boolean> {
  if (editor.savedId || !editor.layout.stickers.length) return true;
  await saveStack(editor);
  return !!editor.savedId;
}

export async function openDesign(editor: EditorState, id: string) {
  if (id === editor.savedId) return;
  if (!(await keepCurrent(editor))) return;
  location.href = `/editor?id=${encodeURIComponent(id)}`;
}

export async function newDesign(editor: EditorState) {
  if (!(await keepCurrent(editor))) return;
  editor.replace(emptyLayout());
  editor.savedId = null;
}

export async function duplicateDesign(editor: EditorState) {
  const name = `Copy of ${editor.layout.name ?? "My design"}`.slice(0, 60);
  try {
    const r = await fetch("/api/stacks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, layout: { ...$state.snapshot(editor.layout), name } }),
    });
    if (!r.ok) throw new Error();
    const { id } = await r.json();
    toast(`Duplicated as "${name}"`);
    location.href = `/editor?id=${encodeURIComponent(id)}`;
  } catch {
    toast.error("Couldn't duplicate this design");
  }
}
