<script lang="ts">
  import { getContext } from "svelte";
  import Fuse from "fuse.js";
  import type { EditorState } from "$lib/stickers/editor.svelte";
  import { itemNoun } from "$lib/stickers/devices";
  import { LOGOS, LOGO_BY_KEY, logoKey, type StickerLogo } from "$lib/stickers/logos";
  import { svgs } from "@/data/svgs";
  import favorites from "@/stores/favorites.store";
  import { globals } from "@/globals";
  import { Input } from "@/components/ui/input";
  import { Button } from "@/components/ui/button";
  import * as ToggleGroup from "@/components/ui/toggle-group";
  import Search from "@lucide/svelte/icons/search";
  import ArrowUpRight from "@lucide/svelte/icons/arrow-up-right";
  import Star from "@lucide/svelte/icons/star";
  import Plus from "@lucide/svelte/icons/plus";
  import LayoutGrid from "@lucide/svelte/icons/layout-grid";
  import List from "@lucide/svelte/icons/list";
  import LogoImg from "./LogoImg.svelte";
  import TypeIcon from "@lucide/svelte/icons/type";
  import Upload from "@lucide/svelte/icons/upload";
  import X from "@lucide/svelte/icons/x";
  import { toast } from "svelte-sonner";
  import { custom } from "$lib/stickers/custom.svelte";
  import { uploadKey } from "$lib/stickers/source";
  import { ACCEPT } from "$lib/stickers/uploads";
  import { addUploadSticker } from "./actions";
  import BadgeCheck from "@lucide/svelte/icons/badge-check";
  import { isOfficial, sponsoredLogos } from "$lib/stickers/sponsors";
  import { getDemo, ours } from "./demo";

  const editor = getContext<EditorState>("editor");
  // the home demo never touches storage: its view and favourites live in memory, uploads are off
  const demoScope = getDemo();
  const demo = !!demoScope;
  const noun = $derived(itemNoun(editor.layout.laptop.model));
  const PAGE = 120;
  /** most useful categories for a dev stack, in picker order */
  const CATEGORIES = ["Framework", "Library", "AI", "Database", "Devtool", "Language", "Hosting", "Platform", "Design", "Payment", "CMS", "Authentication", "Analytics", "Software"];
  const VIEW_KEY = "ss:library-view";

  const fuse = new Fuse(LOGOS, { keys: ["title", "categories"], threshold: 0.35 });
  const svgByKey = new Map(svgs.map((s) => [logoKey(s), s]));

  let scope = $state<"all" | "on" | "fav">("all");
  let category = $state("all");
  let query = $state("");
  let shown = $state(PAGE);
  let view = $state<"tile" | "list">(readView());
  let input: HTMLInputElement | null = $state(null);

  function readView(): "tile" | "list" {
    if (demo) return "tile";
    try {
      return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "tile";
    } catch {
      return "tile";
    }
  }
  $effect(() => {
    if (demo) return;
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      // storage unavailable
    }
  });

  const onLid = $derived.by(() => {
    const m: Record<string, number> = {};
    for (const s of editor.layout.stickers) m[s.logo] = (m[s.logo] ?? 0) + 1;
    return m;
  });
  let demoFavs = $state<string[]>([]);
  const favKeys = $derived(new Set(demo ? demoFavs : $favorites.map((f) => logoKey(f))));
  const favLogos = $derived([...favKeys].map((k) => LOGO_BY_KEY.get(k)).filter((l): l is StickerLogo => !!l));

  const scoped = $derived(scope === "fav" ? favLogos : scope === "on" ? LOGOS.filter((l) => onLid[l.key]) : LOGOS);
  const q = $derived(query.trim());
  const results = $derived.by(() => {
    const searched = !q ? scoped : (scope === "all" ? fuse : new Fuse(scoped, { keys: ["title", "categories"], threshold: 0.35 })).search(q).map((r) => r.item);
    return category === "all" ? searched : searched.filter((l) => l.categories.includes(category));
  });
  $effect(() => {
    void q;
    void scope;
    void category;
    shown = PAGE;
  });

  const scopes = $derived([
    ["all", "All", LOGOS.length],
    ["on", `On ${noun}`, editor.layout.stickers.length],
    ["fav", "Favorites", favLogos.length],
  ] as const);

  const firstCategory = (l: StickerLogo) => l.categories.find((c) => CATEGORIES.includes(c)) ?? l.categories[0] ?? "";

  function toggleFav(e: MouseEvent, l: StickerLogo) {
    e.stopPropagation();
    if (demo) {
      demoFavs = demoFavs.includes(l.key) ? demoFavs.filter((k) => k !== l.key) : [...demoFavs, l.key];
      return;
    }
    const svg = svgByKey.get(l.key);
    if (svg) favorites.toggleFavorite(svg);
  }
  function dragstart(e: DragEvent, l: StickerLogo) {
    e.dataTransfer?.setData("application/x-sticker-logo", l.key);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "copy";
  }
  let fileInput: HTMLInputElement | null = $state(null);
  async function pick(e: Event & { currentTarget: HTMLInputElement }) {
    const files = [...(e.currentTarget.files ?? [])];
    e.currentTarget.value = "";
    for (const f of files.slice(0, 10)) await addUploadSticker(editor, f);
  }
  async function removeUpload(id: string, name: string) {
    const ids = editor.layout.stickers.filter((s) => s.logo === uploadKey(id)).map((s) => s.id);
    await custom.remove(id);
    if (ids.length) editor.removeMany(ids);
    toast(`Removed ${name}${ids.length ? ` and ${ids.length} sticker${ids.length > 1 ? "s" : ""} using it` : ""}`);
  }
  const browsing = $derived(scope === "all" && !q && category === "all");
  const showUploads = $derived(!demo && browsing && custom.uploads.length > 0);
  // paid placement: its own labeled row, never mixed into search or the regular grid order
  const sponsored = sponsoredLogos()
    .map((k) => LOGO_BY_KEY.get(k))
    .filter((l): l is StickerLogo => !!l);

  function keydown(e: KeyboardEvent) {
    if (!ours(demoScope, e)) return;
    const t = e.target as HTMLElement | null;
    const typing = !!t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
    if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !typing)) {
      e.preventDefault();
      input?.focus();
      input?.select();
    }
  }

  const badge = "rounded bg-neutral-200 px-1 font-mono text-[10px] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
  const wordmarkBadge = "rounded border border-neutral-200 px-1 font-mono text-[9.5px] text-neutral-400 dark:border-neutral-800 dark:text-neutral-500";

  // soften the category row where it scrolls off the edge, only on the side that has more
  let catEl: HTMLDivElement | null = $state(null);
  let catL = $state(false);
  let catR = $state(false);
  function measureCat() {
    if (!catEl) return;
    catL = catEl.scrollLeft > 1;
    catR = catEl.scrollLeft + catEl.clientWidth < catEl.scrollWidth - 1;
  }
  $effect(() => {
    if (catEl) measureCat();
  });
  const catMask = $derived(
    !catL && !catR
      ? "none"
      : `linear-gradient(to right, ${catL ? "transparent, #000 24px" : "#000 0"}, ${catR ? "#000 calc(100% - 24px), transparent" : "#000 100%"})`,
  );
</script>

<svelte:window onkeydown={keydown} onresize={measureCat} />

<aside
  data-panel
  data-ui
  class="pointer-events-auto flex h-full w-76 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
>
  <div class="flex flex-col gap-2.5 border-b border-neutral-200 p-3 pb-2.5 dark:border-neutral-800">
    <div class="relative">
      <Search class="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-neutral-500" />
      <Input bind:ref={input} bind:value={query} placeholder="Search {LOGOS.length} stickers…" class="h-9 pr-10 pl-8.5" aria-label="Search stickers" />
      <kbd class="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 font-mono text-[11px] text-neutral-400 dark:text-neutral-500">⌘K</kbd>
    </div>
    <div class="grid {demo ? 'grid-cols-1' : 'grid-cols-2'} gap-1.5">
      <Button variant="outline" size="sm" class="h-8 gap-1.5 text-[12.5px]" title="Add a text sticker" onclick={() => editor.addText()}>
        <TypeIcon class="size-3.5" />Text
      </Button>
      {#if !demo}
        <Button variant="outline" size="sm" class="h-8 gap-1.5 text-[12.5px]" title="Your own SVG or image · stays in this browser" onclick={() => fileInput?.click()}>
          <Upload class="size-3.5" />Upload
        </Button>
        <input bind:this={fileInput} type="file" accept={ACCEPT} multiple class="hidden" onchange={pick} />
      {/if}
    </div>
    <ToggleGroup.Root type="single" class="grid grid-cols-3" value={scope} onValueChange={(v) => v && (scope = v as typeof scope)} aria-label="Show">
      {#each scopes as [id, label, n] (id)}
        <ToggleGroup.Item value={id} class="group h-7 text-[12.5px]">
          {label}<span class="font-mono text-[10.5px] text-neutral-400 group-data-[state=on]:text-neutral-500 dark:text-neutral-600 dark:group-data-[state=on]:text-neutral-400">{n}</span>
        </ToggleGroup.Item>
      {/each}
    </ToggleGroup.Root>
    <div
      bind:this={catEl}
      onscroll={measureCat}
      class="flex gap-1 overflow-x-auto [scrollbar-width:none]"
      style="mask-image: {catMask}; -webkit-mask-image: {catMask};"
      role="radiogroup"
      aria-label="Category"
    >
      {#each ["all", ...CATEGORIES] as c (c)}
        <button
          type="button"
          role="radio"
          aria-checked={category === c}
          class="h-6.5 flex-none cursor-pointer rounded-md border border-neutral-200 bg-neutral-50 px-2.5 text-xs whitespace-nowrap text-neutral-500 hover:text-neutral-900 aria-checked:border-neutral-900 aria-checked:bg-neutral-900 aria-checked:font-medium aria-checked:text-white dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-white dark:aria-checked:border-neutral-100 dark:aria-checked:bg-neutral-100 dark:aria-checked:text-neutral-950"
          onclick={() => (category = category === c && c !== "all" ? "all" : c)}>{c === "all" ? "All types" : c}</button
        >
      {/each}
    </div>
  </div>

  <div class="min-h-0 flex-1 overflow-y-auto p-2.5 [scrollbar-width:thin]">
    {#if showUploads}
      <div class="mb-2.5 flex flex-col gap-1.5">
        <div class="flex items-baseline justify-between px-0.5">
          <span class="text-[11.5px] font-medium text-neutral-700 dark:text-neutral-300">Your uploads</span>
          <span class="text-[10.5px] text-neutral-400 dark:text-neutral-500">This browser only</span>
        </div>
        <div class="grid grid-cols-4 gap-1.5">
          {#each custom.uploads as u (u.id)}
            {@const count = onLid[uploadKey(u.id)] ?? 0}
            <div
              role="button"
              tabindex="0"
              title="Add {u.name}"
              aria-label="Add {u.name}"
              class="group relative grid aspect-square cursor-pointer place-items-center rounded-lg border border-neutral-200 bg-neutral-50 p-2 transition-colors hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950/40 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/60"
              onclick={() => editor.addSticker(uploadKey(u.id), undefined, { theme: "light" })}
              onkeydown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), editor.addSticker(uploadKey(u.id), undefined, { theme: "light" }))}
            >
              <img src={u.href} alt="" draggable="false" class="pointer-events-none max-h-full max-w-full object-contain" />
              {#if count}<span class="absolute right-1 bottom-1 {badge}">×{count}</span>{/if}
              <button
                type="button"
                title="Remove upload"
                aria-label="Remove {u.name}"
                class="absolute top-0.5 right-0.5 grid size-4.5 cursor-pointer place-items-center rounded text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 focus-visible:opacity-100 dark:hover:bg-red-950/50"
                onclick={(e) => (e.stopPropagation(), removeUpload(u.id, u.name))}
              >
                <X class="size-3" />
              </button>
            </div>
          {/each}
        </div>
      </div>
    {/if}
    {#if browsing && sponsored.length}
      <div class="mb-2.5 flex flex-col gap-1.5">
        <div class="flex items-baseline justify-between px-0.5">
          <span class="text-[11.5px] font-medium text-neutral-700 dark:text-neutral-300">Sponsored</span>
          <a href="/support#brands" class="text-[10.5px] text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300">Paid placement</a>
        </div>
        <div class="grid grid-cols-3 gap-1.5">
          {#each sponsored as l (l.key)}
            <div
              role="button"
              tabindex="0"
              title="Add {l.title} · Sponsored"
              aria-label="Add {l.title} (sponsored)"
              draggable="true"
              class="relative flex h-19 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-2 transition-colors hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950/40 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/60"
              ondragstart={(e) => dragstart(e, l)}
              onclick={() => editor.addSticker(l.key)}
              onkeydown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), editor.addSticker(l.key))}
            >
              <LogoImg art={l.icon} class="pointer-events-none size-6.5" />
              <span class="flex max-w-full items-center gap-1 truncate text-[11.5px] text-neutral-500 dark:text-neutral-400"><BadgeCheck class="size-3 flex-none text-blue-500" />{l.title}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
    {#if results.length === 0}
      <p class="px-2 py-7 text-center text-[12.5px] leading-relaxed text-neutral-500">
        {#if scope === "fav" && !q}
          No favorites yet. Star stickers to keep them here.
        {:else if scope === "on" && !q}
          Nothing on your {noun} yet.
        {:else}
          No stickers match. Missing one? <a href={globals.submitUrl} target="_blank" rel="noreferrer" class="text-neutral-900 underline dark:text-neutral-200">Request it</a>
        {/if}
      </p>
    {:else if view === "list"}
      <div class="-mx-1 flex flex-col gap-px">
        {#each results.slice(0, shown) as l (l.key)}
          {@const count = onLid[l.key] ?? 0}
          {@const fav = favKeys.has(l.key)}
          <div
            role="button"
            tabindex="0"
            title="Add {l.title}"
            draggable="true"
            class="group flex h-11 cursor-pointer items-center gap-2.5 rounded-lg px-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
            ondragstart={(e) => dragstart(e, l)}
            onclick={() => editor.addSticker(l.key)}
            onkeydown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), editor.addSticker(l.key))}
          >
            <div class="grid size-8 flex-none place-items-center rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
              <LogoImg art={l.icon} class="pointer-events-none size-4.5" />
            </div>
            <div class="flex min-w-0 flex-1 flex-col">
              <span class="flex items-center gap-1 truncate text-[13px] font-medium text-neutral-800 dark:text-neutral-200">{l.title}{#if isOfficial(l.key)}<BadgeCheck class="size-3.5 flex-none text-blue-500" aria-label="Official, brand-approved" />{/if}</span>
              <span class="truncate text-[11px] text-neutral-500">{firstCategory(l)}</span>
            </div>
            {#if l.wordmark}<span title="Wordmark variant available" class={wordmarkBadge}>+Aa</span>{/if}
            {#if count}<span title="Already on your {noun}" class={badge}>×{count}</span>{/if}
            <button
              type="button"
              title={fav ? "Remove from favorites" : "Add to favorites"}
              aria-label={fav ? "Remove from favorites" : "Add to favorites"}
              aria-pressed={fav}
              class="grid size-6.5 flex-none cursor-pointer place-items-center rounded-md text-neutral-300 hover:bg-neutral-200 hover:text-yellow-400 aria-pressed:text-yellow-400 dark:text-neutral-700 dark:hover:bg-neutral-800"
              onclick={(e) => toggleFav(e, l)}
            >
              <Star class="size-3.5" fill={fav ? "currentColor" : "none"} />
            </button>
            <span class="grid size-6.5 flex-none place-items-center rounded-md border border-neutral-200 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400"><Plus class="size-3" /></span>
          </div>
        {/each}
      </div>
    {:else}
      <div class="grid grid-cols-3 gap-1.5">
        {#each results.slice(0, shown) as l (l.key)}
          {@const count = onLid[l.key] ?? 0}
          {@const fav = favKeys.has(l.key)}
          <div
            role="button"
            tabindex="0"
            title="Add {l.title} · {firstCategory(l)}"
            aria-label="Add {l.title}"
            draggable="true"
            class="group relative flex h-19 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-2 transition-colors hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950/40 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/60"
            ondragstart={(e) => dragstart(e, l)}
            onclick={() => editor.addSticker(l.key)}
            onkeydown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), editor.addSticker(l.key))}
          >
            <LogoImg art={l.icon} class="pointer-events-none size-6.5" />
            <div class="flex max-w-full items-center justify-center gap-1">
              {#if l.wordmark}<span title="Wordmark variant available" class={wordmarkBadge}>+Aa</span>{/if}
              {#if isOfficial(l.key)}<BadgeCheck class="size-3 flex-none text-blue-500" aria-label="Official, brand-approved" />{/if}
              <span class="truncate text-[11.5px] text-neutral-500 dark:text-neutral-400">{l.title}</span>
            </div>
            {#if count}<span title="Already on your {noun}" class="absolute top-1.5 right-1.5 {badge}">×{count}</span>{/if}
            <button
              type="button"
              title={fav ? "Remove from favorites" : "Add to favorites"}
              aria-label={fav ? "Remove from favorites" : "Add to favorites"}
              aria-pressed={fav}
              class="absolute top-1 left-1 grid size-4.5 cursor-pointer place-items-center rounded text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-yellow-400 focus-visible:opacity-100 aria-pressed:text-yellow-400 aria-pressed:opacity-100 dark:text-neutral-600 dark:hover:text-yellow-400"
              onclick={(e) => toggleFav(e, l)}
            >
              <Star class="size-3" fill={fav ? "currentColor" : "none"} />
            </button>
          </div>
        {/each}
      </div>
    {/if}
    {#if results.length > shown}
      <Button variant="ghost" size="sm" class="mt-2 w-full" onclick={() => (shown += PAGE)}>Show more ({results.length - shown})</Button>
    {/if}
  </div>

  <div class="flex items-center justify-between border-t border-neutral-200 px-3.5 py-2.5 text-xs text-neutral-500 dark:border-neutral-800">
    <ToggleGroup.Root type="single" value={view} onValueChange={(v) => v && (view = v as typeof view)} aria-label="Library view" title="Library view">
      <ToggleGroup.Item value="tile" class="h-6 px-2" aria-label="Tiles" title="Tiles"><LayoutGrid class="size-3.5" /></ToggleGroup.Item>
      <ToggleGroup.Item value="list" class="h-6 px-2" aria-label="List" title="List"><List class="size-3.5" /></ToggleGroup.Item>
    </ToggleGroup.Root>
    <a href={globals.submitUrl} target="_blank" rel="noreferrer" class="flex items-center gap-1 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
      Request a logo<ArrowUpRight class="size-3" />
    </a>
  </div>
</aside>
