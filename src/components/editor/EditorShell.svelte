<script lang="ts">
  import { setContext, onMount } from "svelte";
  import { createEditor } from "$lib/stickers/editor.svelte";
  import { isKnownLogo } from "$lib/stickers/logos";
  import { installShortcuts } from "./shortcuts";
  import { installAutosave } from "./save.svelte";
  import Canvas from "./Canvas.svelte";
  import DeviceBar from "./DeviceBar.svelte";
  import LibraryPanel from "./LibraryPanel.svelte";
  import StylePanel from "./StylePanel.svelte";
  import Dock from "./Dock.svelte";
  import StackPanel from "./StackPanel.svelte";
  import MultiDock from "./MultiDock.svelte";
  import ExportDialog from "./ExportDialog.svelte";
  import EditorHeader from "./EditorHeader.svelte";
  import { Button } from "@/components/ui/button";
  import type { Layout } from "$lib/stickers/types";
  import { setDemo } from "./demo";

  /**
   * `demo`: the home hero's embedded editor. Same shell, sandboxed: no storage (nothing read from or
   * written to localStorage), no autosave, ?id / #l= / ?add= ignored, a fixed 1152×640 box instead of
   * the viewport, and every key handler only acts while focus is inside it.
   */
  let { demo }: { demo?: { layout: Layout } } = $props();

  function safeStorage(): Pick<Storage, "getItem" | "setItem"> | null {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  // svelte-ignore state_referenced_locally
  const editor = demo
    ? createEditor(structuredClone($state.snapshot(demo.layout)) as Layout, { storage: null })
    : createEditor(undefined, { storage: safeStorage() });
  setContext("editor", editor);
  let root: HTMLDivElement | undefined = $state();
  // svelte-ignore state_referenced_locally
  setDemo(demo ? { root: () => root } : null);

  // The local draft (ss:layout) survives a reload, so its server id must too: without it the next Save or Share
  // creates a duplicate and autosave stops. Skipped when ?id= or #l= is about to load something else.
  const SAVED_ID_KEY = "ss:saved-id";
  try {
    const u = new URL(location.href);
    if (!u.searchParams.get("id") && !u.hash.startsWith("#l=")) editor.savedId = localStorage.getItem(SAVED_ID_KEY);
  } catch {
    // storage unavailable: the draft just starts unsaved
  }
  $effect(() => {
    const id = editor.savedId;
    try {
      if (id) localStorage.setItem(SAVED_ID_KEY, id);
      else localStorage.removeItem(SAVED_ID_KEY);
    } catch {
      // ignore
    }
  });

  onMount(() => {
    if (demo) return root ? installShortcuts(editor, root) : undefined;
    const removeShortcuts = installShortcuts(editor, window);
    const autosave = installAutosave(editor);
    const url = new URL(location.href);
    const key = url.searchParams.get("add");
    const id = url.searchParams.get("id");
    if (key !== null) {
      // a saved stack load replaces the layout, so skip the add when both are present
      if (!id && isKnownLogo(key)) editor.addSticker(key);
      url.searchParams.delete("add");
      history.replaceState(history.state, "", url);
    }
    if (id) {
      fetch(`/editor/saved/${encodeURIComponent(id)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.layout) {
            editor.replace(data.layout);
            editor.savedId = data.id;
            autosave.markSynced();
          }
        })
        .catch(() => {});
      url.searchParams.delete("id");
      history.replaceState(history.state, "", url);
    }
    if (!id && !editor.savedId && location.hash.startsWith("#l=")) {
      // a remix/shared copy was loaded by the constructor: create it as the user's own stack
      fetch("/api/stacks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: editor.layout.name ?? "Remixed design", layout: $state.snapshot(editor.layout) }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.id) {
            editor.savedId = d.id;
            autosave.markSynced();
          }
        })
        .catch(() => {});
      history.replaceState(history.state, "", location.pathname + location.search); // drop #l=
    }
    return () => {
      removeShortcuts();
      autosave.teardown();
    };
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex (the demo takes focus on click, so its keys stay scoped to it) -->
<div
  bind:this={root}
  role={demo ? "group" : undefined}
  aria-label={demo ? "Sticker editor demo" : undefined}
  tabindex={demo ? -1 : undefined}
  class="{demo ? 'relative h-[640px] w-[1152px] outline-none' : 'fixed inset-0 min-h-[460px] min-w-[900px]'} flex flex-col overflow-hidden bg-neutral-50 text-[13px] text-neutral-950 select-none dark:bg-neutral-950 dark:text-white">
  <EditorHeader />
  <div class="relative min-h-0 flex-1">
    <Canvas />
    <!-- soft shade rising from the bottom edge, so the dock sits on something -->
    <div class="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 bg-linear-to-t from-neutral-900/[0.06] to-transparent dark:from-black/45"></div>
    {#if editor.preview}
      <div class="pointer-events-none absolute inset-x-0 top-3.5 z-30 flex justify-center">
        <div class="pointer-events-auto flex h-9 items-center gap-2.5 rounded-[10px] border border-neutral-200 bg-white pr-1 pl-3.5 text-[12.5px] text-neutral-500 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          Previewing<kbd class="rounded border border-neutral-200 px-1.25 font-mono text-[10.5px] dark:border-neutral-700">Esc</kbd>
          <Button size="sm" class="h-7 px-2.5 text-xs dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white" onclick={() => (editor.preview = false)}>Exit preview</Button>
        </div>
      </div>
    {:else}
      <div class="pointer-events-none absolute top-3 bottom-3 left-3 z-20"><LibraryPanel /></div>
      <div class="pointer-events-none absolute top-3 right-[328px] left-[328px] z-30 flex justify-center"><DeviceBar /></div>
      <div class="pointer-events-none absolute top-3 right-3 bottom-3 z-20 flex flex-col">
        {#if editor.selected}<StylePanel />{:else}<StackPanel />{/if}
      </div>
      <div class="pointer-events-none absolute right-[328px] bottom-12 left-[328px] z-20 flex justify-center">
        {#if editor.selected}
          <Dock />
        {:else if editor.selectedIds.length > 1}
          <MultiDock />
        {/if}
      </div>
    {/if}
  </div>
</div>

<ExportDialog />
