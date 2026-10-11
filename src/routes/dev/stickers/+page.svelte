<script lang="ts">
  /**
   * DEV ONLY sticker review. Every library art file as its real generated sticker; approve the ones that look right
   * with the default cut, flag the rest, and tune a fix (margin, smoothness, fill holes, one piece, strip masks) with a
   * live preview. Saving writes overrides.review.json, regenerates just those cut lines and marks them approved.
   * Keys: ←/→/↑/↓ move · A approve · F needs fix · U clear · Space/Enter fix panel · Esc close.
   */
  import type { PageProps } from "./$types";
  import { tick } from "svelte";
  import { cn } from "@/utils/cn";
  import type { ReviewEntry, ReviewItem, ReviewStatus } from "$lib/server/sticker-review";
  import type { BuildSettings } from "$lib/stickers/overrides";

  let { data }: PageProps = $props();

  // svelte-ignore state_referenced_locally
  let items = $state<ReviewItem[]>(data.items);
  // svelte-ignore state_referenced_locally
  let review = $state<Record<string, ReviewEntry>>(data.review);
  /** cache-buster per file, bumped after its cut is regenerated */
  let rev = $state<Record<string, number>>({});

  const FILTERS = [
    ["all", "All"],
    ["todo", "Unreviewed"],
    ["fix", "Needs fix"],
    ["ok", "Approved"],
    ["fixed", "Has a fix"],
    ["flagged", "Suspicious"],
  ] as const;
  type Filter = (typeof FILTERS)[number][0];
  let filter = $state<Filter>("todo");
  /** icons first, full logos (text) later */
  const KINDS = [
    ["all", "All"],
    ["icon", "Icons"],
    ["wordmark", "Full logos"],
  ] as const;
  let kind = $state<(typeof KINDS)[number][0]>("icon");
  let q = $state("");
  let darkLid = $state(false);
  let focus = $state(0);
  let grid: HTMLDivElement | undefined = $state();

  const statusOf = (f: string): ReviewStatus | undefined => review[f]?.status;
  const visible = $derived(
    items.filter((it) => {
      const s = statusOf(it.file);
      const match = !q.trim() || `${it.title} ${it.file} ${it.style ?? ""}`.toLowerCase().includes(q.trim().toLowerCase());
      if (!match) return false;
      if (kind !== "all" && it.variant !== kind) return false;
      if (filter === "todo") return !s;
      if (filter === "fix") return s === "fix";
      if (filter === "ok") return s === "ok";
      if (filter === "fixed") return it.fixed;
      if (filter === "flagged") return it.flags.length > 0;
      return true;
    }),
  );
  const counts = $derived({
    total: items.length,
    ok: items.filter((i) => statusOf(i.file) === "ok").length,
    fix: items.filter((i) => statusOf(i.file) === "fix").length,
    flagged: items.filter((i) => i.flags.length).length,
  });
  const done = $derived(counts.ok + counts.fix);
  /** progress per kind, for the Icons / Full logos buttons */
  const kindCount = (k: "icon" | "wordmark") => {
    const of = items.filter((i) => i.variant === k);
    return `${of.filter((i) => statusOf(i.file)).length}/${of.length}`;
  };
  const current = $derived(visible[Math.min(focus, visible.length - 1)]);

  const FLAG_TEXT: Record<string, string> = {
    "no-cut": "no cut line",
    pieces: "several pieces",
    extreme: "icon is very wide / tall",
    faint: "may vanish on its vinyl",
  };
  const sub = (it: ReviewItem) => [it.style, it.variant === "icon" ? "Icon" : "Full logo", it.onDark ? "Dark" : "Light"].filter(Boolean).join(" · ");
  const artUrl = (it: ReviewItem) => `/sticker-art/${it.onDark ? "dark/" : ""}${it.file}?v=${rev[it.file] ?? 0}`;

  async function post(body: unknown) {
    const res = await fetch("/dev/stickers/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function mark(files: string[], status: ReviewStatus | null, note?: string) {
    const prev = { ...review };
    const next = { ...review };
    for (const f of files) {
      if (status) next[f] = { status, ...(note ? { note } : {}), at: new Date().toISOString() };
      else delete next[f];
    }
    review = next;
    try {
      await post({ action: "review", files, status, note });
    } catch (e) {
      review = prev;
      alertMsg = `Couldn't save: ${(e as Error).message}`;
    }
  }
  let alertMsg = $state("");

  /** keep the focused tile in view and in range as the list changes */
  $effect(() => {
    if (focus > visible.length - 1) focus = Math.max(0, visible.length - 1);
  });
  async function show(i: number) {
    focus = Math.max(0, Math.min(visible.length - 1, i));
    await tick();
    grid?.querySelector<HTMLElement>(`[data-i="${focus}"]`)?.scrollIntoView({ block: "nearest" });
  }
  function cols() {
    const first = grid?.firstElementChild as HTMLElement | null;
    if (!grid || !first) return 1;
    return Math.max(1, Math.round(grid.clientWidth / first.offsetWidth));
  }

  // ---- fix panel ----
  let panel = $state<ReviewItem | null>(null);
  let scope = $state<"file" | "logo">("file");
  let draft = $state<Required<BuildSettings>>({ shape: "trace", margin: 3, smooth: 50, fillHoles: true, merge: true, stripMasks: false });
  let saving = $state(false);
  let previewUrl = $state("");
  let previewTimer: ReturnType<typeof setTimeout> | undefined;

  function openPanel(it: ReviewItem) {
    panel = it;
    draft = { ...it.build };
    scope = "file";
  }
  $effect(() => {
    if (!panel) return;
    const p = panel;
    const d = { ...draft };
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      const qs = new URLSearchParams({
        shape: d.shape,
        margin: String(d.margin),
        smooth: String(d.smooth),
        fillHoles: d.fillHoles ? "1" : "0",
        merge: d.merge ? "1" : "0",
        stripMasks: d.stripMasks ? "1" : "0",
        dark: p.onDark ? "1" : "0",
        t: String(Date.now()),
      });
      previewUrl = `/dev/stickers/preview/${p.file}?${qs}`;
    }, 150);
  });
  const siblings = $derived(panel ? items.filter((i) => i.key === panel!.key) : []);

  async function saveFix(remove = false) {
    if (!panel) return;
    saving = true;
    try {
      const res = (await post({ action: "fix", key: panel.key, file: scope === "file" ? panel.file : null, settings: remove ? null : draft })) as { files: string[] };
      const bump = { ...rev };
      const next = { ...review };
      for (const f of res.files) {
        bump[f] = (bump[f] ?? 0) + 1;
        next[f] = { status: "ok", note: "fixed", at: new Date().toISOString() };
      }
      rev = bump;
      review = next;
      items = items.map((it) => (res.files.includes(it.file) ? { ...it, fixed: !remove, build: remove ? it.build : { ...draft } } : it));
      panel = null;
    } catch (e) {
      alertMsg = `Couldn't save the fix: ${(e as Error).message}`;
    } finally {
      saving = false;
    }
  }

  function onkeydown(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if (panel) {
      if (e.key === "Escape") panel = null;
      return;
    }
    if (!current) return;
    const k = e.key.toLowerCase();
    if (e.key === "ArrowRight") show(focus + 1);
    else if (e.key === "ArrowLeft") show(focus - 1);
    else if (e.key === "ArrowDown") show(focus + cols());
    else if (e.key === "ArrowUp") show(focus - cols());
    else if (k === "a") {
      // approving in the Unreviewed view drops the tile from the list, so the next one slides into focus
      mark([current.file], "ok");
      if (filter !== "todo") show(focus + 1);
    } else if (k === "f") {
      mark([current.file], "fix");
      if (filter !== "todo") show(focus + 1);
    } else if (k === "u") mark([current.file], null);
    else if (e.key === " " || e.key === "Enter") openPanel(current);
    else return;
    e.preventDefault();
  }

  async function approveVisible() {
    const files = visible.filter((i) => !statusOf(i.file) && !i.flags.length).map((i) => i.file);
    if (files.length && confirm(`Approve ${files.length} unreviewed stickers with no flags in this view?`)) await mark(files, "ok");
  }
</script>

<svelte:head><title>Sticker review · dev</title></svelte:head>
<svelte:window {onkeydown} />

<div class="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-6 py-6">
  <header class="flex flex-wrap items-end gap-4">
    <div class="flex flex-col gap-1">
      <span class="font-mono text-[11px] tracking-[.08em] text-muted-foreground uppercase">Dev · not in production</span>
      <h1 class="text-2xl font-semibold tracking-tight">Sticker review</h1>
    </div>
    <div class="flex min-w-[260px] flex-1 flex-col gap-1.5">
      <div class="flex justify-between text-xs text-muted-foreground">
        <span>{done} / {counts.total} reviewed</span>
        <span>{counts.ok} approved · {counts.fix} need a fix · {counts.flagged} suspicious</span>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-muted">
        <div class="h-full bg-emerald-500 transition-[width]" style:width="{(counts.ok / counts.total) * 100}%"></div>
      </div>
    </div>
  </header>

  <div class="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-y border-border bg-background py-2.5">
    {#each FILTERS as [id, label] (id)}
      <button
        type="button"
        class={cn("h-8 cursor-pointer rounded-full border px-3 text-[13px] font-medium", filter === id ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground/80 hover:text-foreground")}
        onclick={() => ((filter = id), (focus = 0))}>{label}</button
      >
    {/each}
    <div class="mx-1 flex gap-0.5 rounded-[9px] border border-border bg-muted p-0.5" role="group" aria-label="Logo type">
      {#each KINDS as [id, label] (id)}
        <button
          type="button"
          aria-pressed={kind === id}
          class={cn("flex h-7 cursor-pointer items-center gap-1.5 rounded-[7px] px-2.5 text-[12.5px] font-medium", kind === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          onclick={() => ((kind = id), (focus = 0))}
        >
          {label}{#if id !== "all"}<span class="font-mono text-[10.5px] text-muted-foreground">{kindCount(id)}</span>{/if}
        </button>
      {/each}
    </div>
    <input bind:value={q} placeholder="Search…" class="h-8 w-48 rounded-lg border border-border bg-card px-2.5 text-[13px] outline-none focus:border-foreground/40" />
    <span class="flex-1"></span>
    <label class="flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground">
      <input type="checkbox" bind:checked={darkLid} /> Dark laptop
    </label>
    <button type="button" class="h-8 cursor-pointer rounded-lg border border-border bg-card px-3 text-[13px] hover:bg-muted" onclick={approveVisible}>Approve unflagged in view</button>
  </div>

  {#if alertMsg}
    <div class="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
      {alertMsg}<button type="button" class="cursor-pointer" onclick={() => (alertMsg = "")}>✕</button>
    </div>
  {/if}

  <p class="text-xs text-muted-foreground">
    {visible.length} shown · <kbd>←→↑↓</kbd> move · <kbd>A</kbd> approve · <kbd>F</kbd> needs fix · <kbd>U</kbd> clear · <kbd>Space</kbd> fix panel
  </p>

  <div bind:this={grid} class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
    {#each visible as it, i (it.file)}
      {@const s = statusOf(it.file)}
      <button
        type="button"
        data-i={i}
        class={cn(
          "relative flex min-w-0 cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-2.5 text-left outline-none",
          i === focus ? "border-blue-500 ring-2 ring-blue-500/40" : "border-border",
          s === "ok" && "bg-emerald-500/5",
          s === "fix" && "bg-amber-500/10",
        )}
        onclick={() => ((focus = i), openPanel(it))}
      >
        <div class="grid aspect-square w-full place-items-center rounded-lg" style:background-color={darkLid ? "#2e2c2e" : "#e3e4e5"}>
          <img src={artUrl(it)} alt="" loading="lazy" class="size-[86%] object-contain" />
        </div>
        <span class="w-full truncate text-center text-[12.5px] font-medium">{it.title}</span>
        <span class="w-full truncate text-center text-[11px] text-muted-foreground">{sub(it)}</span>
        {#if it.flags.length}
          <span class="flex flex-wrap justify-center gap-1">
            {#each it.flags as f (f)}<span class="rounded bg-amber-500/15 px-1 text-[10px] text-amber-700 dark:text-amber-300">{FLAG_TEXT[f]}</span>{/each}
          </span>
        {/if}
        <span class="absolute top-1.5 right-1.5 flex gap-1">
          {#if it.fixed}<span class="rounded bg-blue-500/15 px-1 text-[10px] text-blue-600 dark:text-blue-300" title="Has a saved fix">fix</span>{/if}
          {#if s === "ok"}<span class="rounded bg-emerald-500 px-1 text-[10px] text-white">✓</span>{/if}
          {#if s === "fix"}<span class="rounded bg-amber-500 px-1 text-[10px] text-white">!</span>{/if}
        </span>
      </button>
    {/each}
  </div>
  {#if !visible.length}<p class="py-16 text-center text-muted-foreground">Nothing here. Try another filter.</p>{/if}
</div>

{#if panel}
  <!-- fix panel -->
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6" role="presentation" onclick={(e) => e.target === e.currentTarget && (panel = null)}>
    <div class="flex max-h-full w-full max-w-[880px] flex-col overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl" role="dialog" aria-label="Fix {panel.title}">
      <div class="flex items-start gap-3 border-b border-border px-5 py-4">
        <div class="flex flex-1 flex-col">
          <span class="text-lg font-semibold">{panel.title}</span>
          <span class="font-mono text-[11px] text-muted-foreground">{panel.file} · {sub(panel)}</span>
        </div>
        <button type="button" class="cursor-pointer text-muted-foreground" onclick={() => (panel = null)}>✕</button>
      </div>
      <div class="grid gap-5 p-5 md:grid-cols-2">
        <div class="flex flex-col gap-2">
          <span class="text-[12px] text-muted-foreground">Now</span>
          <div class="grid aspect-square place-items-center rounded-xl" style:background-color={darkLid ? "#2e2c2e" : "#e3e4e5"}>
            <img src={artUrl(panel)} alt="" class="size-[80%] object-contain" />
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <span class="text-[12px] text-muted-foreground">With these settings</span>
          <div class="grid aspect-square place-items-center rounded-xl" style:background-color={darkLid ? "#2e2c2e" : "#e3e4e5"}>
            {#if previewUrl}<img src={previewUrl} alt="" class="size-[80%] object-contain" />{/if}
          </div>
        </div>
      </div>
      <div class="grid gap-4 border-t border-border px-5 py-4 md:grid-cols-2">
        <div class="flex flex-col gap-1 text-[13px] md:col-span-2">
          <span class="flex justify-between"><span>Cut</span><span class="text-muted-foreground">{draft.shape === "trace" ? "follows the logo" : "the logo sits on one solid shape"}</span></span>
          <div class="flex gap-1.5" role="radiogroup" aria-label="Cut shape">
            {#each [["trace", "Trace"], ["circle", "Circle"], ["square", "Square"]] as const as [v, label] (v)}
              <button type="button" role="radio" aria-checked={draft.shape === v} onclick={() => (draft.shape = v)} class="h-8 rounded-lg border px-3 {draft.shape === v ? 'border-foreground bg-foreground text-background' : 'border-border bg-card hover:bg-muted'}">{label}</button>
            {/each}
          </div>
        </div>
        <label class="flex flex-col gap-1 text-[13px]">
          <span class="flex justify-between"><span>Margin</span><span class="font-mono text-muted-foreground">{draft.margin} mm @ 100 mm</span></span>
          <input type="range" min="0" max="10" step="0.5" bind:value={draft.margin} />
        </label>
        <label class="flex flex-col gap-1 text-[13px]" class:opacity-40={draft.shape !== "trace"}>
          <span class="flex justify-between"><span>Smoothness</span><span class="font-mono text-muted-foreground">{draft.smooth}</span></span>
          <input type="range" min="0" max="100" step="1" bind:value={draft.smooth} />
        </label>
        <div class="flex flex-wrap gap-4 text-[13px]" class:opacity-40={draft.shape !== "trace"}>
          <label class="flex items-center gap-2"><input type="checkbox" bind:checked={draft.fillHoles} /> Fill holes</label>
          <label class="flex items-center gap-2"><input type="checkbox" bind:checked={draft.merge} /> One piece</label>
          <label class="flex items-center gap-2" title="Ignore masks and clip paths that hide the logo when tracing"><input type="checkbox" bind:checked={draft.stripMasks} /> Strip masks</label>
        </div>
        <div class="flex items-center gap-2 text-[13px]">
          <span>Apply to</span>
          <select bind:value={scope} class="h-8 rounded-lg border border-border bg-card px-2">
            <option value="file">this file only</option>
            <option value="logo">all {siblings.length} files of {panel.title}</option>
          </select>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2 border-t border-border px-5 py-4">
        <button type="button" class="h-9 cursor-pointer rounded-lg bg-foreground px-4 text-[13px] font-medium text-background disabled:opacity-50" disabled={saving} onclick={() => saveFix()}>
          {saving ? "Saving…" : "Save fix and approve"}
        </button>
        {#if panel.fixed}
          <button type="button" class="h-9 cursor-pointer rounded-lg border border-border px-4 text-[13px] disabled:opacity-50" disabled={saving} onclick={() => saveFix(true)}>Remove fix</button>
        {/if}
        <span class="flex-1"></span>
        <button type="button" class="h-9 cursor-pointer rounded-lg border border-border px-4 text-[13px]" onclick={() => (mark([panel!.file], "ok"), (panel = null))}>Looks fine as is</button>
        <button type="button" class="h-9 cursor-pointer rounded-lg border border-border px-4 text-[13px]" onclick={() => (mark([panel!.file], "fix"), (panel = null))}>Needs fix later</button>
      </div>
    </div>
  </div>
{/if}
