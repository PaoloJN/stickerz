import { toast } from "svelte-sonner";
import type { EditorState } from "$lib/stickers/editor.svelte";

const post = (url: string, method: string, body: unknown) => fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export async function saveStack(editor: EditorState): Promise<void> {
  if (editor.saving) return;
  editor.saving = true;
  try {
    const layout = $state.snapshot(editor.layout);
    const name = editor.layout.name ?? "My design";
    if (editor.savedId) {
      const r = await post(`/api/stacks/${editor.savedId}`, "PUT", { name, layout });
      if (r.ok) {
        toast("Saved");
        return;
      }
      // deleted elsewhere: fall through and re-save as a new stack
      if (r.status !== 404) throw new Error();
      editor.savedId = null;
    }
    const r = await post(`/api/stacks`, "POST", { name, layout });
    if (r.status === 429) {
      toast.error((await r.json().catch(() => null))?.error ?? "Too many requests. Try again later.");
      return;
    }
    if (!r.ok) throw new Error();
    const { id } = await r.json();
    editor.savedId = id;
    toast("Saved to My designs");
  } catch {
    toast.error("Couldn't save");
  } finally {
    editor.saving = false;
  }
}

/** Silent PUT of the current layout for an already-saved stack. keepalive lets it survive page unload. */
async function syncStack(editor: EditorState, keepalive = false): Promise<boolean> {
  if (!editor.savedId) return false;
  const layout = $state.snapshot(editor.layout);
  const name = editor.layout.name ?? "My design";
  try {
    const r = await fetch(`/api/stacks/${editor.savedId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, layout }),
      keepalive,
    });
    if (r.status === 404) editor.savedId = null; // deleted from My designs: the draft is unsaved again
    return r.ok;
  } catch {
    /* local draft is intact; next change or reopen retries */
    return false;
  }
}

/** Debounced autosave for owned stacks + flush on tab hide/close. Returns teardown + markSynced. */
export function installAutosave(editor: EditorState): { teardown: () => void; markSynced: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let syncedRev = editor.rev; // baseline: don't sync the already-loaded content
  const markSynced = () => {
    syncedRev = editor.rev;
  }; // call after a programmatic load (id/remix)
  const stop = $effect.root(() => {
    $effect(() => {
      const rev = editor.rev; // track
      if (!editor.savedId || rev === syncedRev) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const at = editor.rev;
        syncStack(editor).then((ok) => {
          if (ok) syncedRev = at;
        });
      }, 3000);
    });
  });
  const flush = () => {
    if (editor.savedId && editor.rev !== syncedRev) {
      if (timer) clearTimeout(timer);
      syncedRev = editor.rev;
      void syncStack(editor, true);
    }
  };
  const onHide = () => {
    if (document.visibilityState === "hidden") flush();
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", flush);
  const teardown = () => {
    flush(); // in-app navigation unmounts without pagehide; do not drop a pending edit
    if (timer) clearTimeout(timer);
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", flush);
    stop();
  };
  return { teardown, markSynced };
}
