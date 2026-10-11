<script lang="ts">
  /**
   * Stickers: every library logo laid out as a sticker sheet. Search + category chips + sort filter client-side. While
   * browsing (All, no search) each category shows one row and a "+N more" tile. Clicking a sticker opens a quick-look
   * dialog (URL hash = its key); + / ✓ toggles the pick, and the floating tray hands the picks to the editor.
   */
  import type { PageProps } from "./$types";
  import { page } from "$app/state";
  import { replaceState } from "$app/navigation";
  import { onMount } from "svelte";
  import SiteChrome from "@/components/site/SiteChrome.svelte";
  import SiteFrame from "@/components/site/SiteFrame.svelte";
  import SiteFooter from "@/components/site/SiteFooter.svelte";
  import StickerCell from "@/components/logos-page/StickerCell.svelte";
  import StickerDialog from "@/components/logos-page/StickerDialog.svelte";
  import PicksTray from "@/components/logos-page/PicksTray.svelte";
  import Segmented from "@/components/logos-page/Segmented.svelte";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { cn } from "@/utils/cn";
  import {
    DEFAULT_COLS,
    SHEET_PAD,
    filterLogos,
    loadPicks,
    preview,
    rowCapacity,
    savePicks,
    sections,
    sheetOrder,
    stepKey,
    togglePick,
    type Sort,
  } from "@/lib/logos-page";
  import { encodeLayout } from "$lib/stickers/codec";
  import { buildLayout } from "$lib/stacks/mock";
  import { logoRequestUrl } from "@/config/site";
  import { siteConfig } from "@/config/site";
  import SearchIcon from "@lucide/svelte/icons/search";

  let { data }: PageProps = $props();

  const byKey = $derived(new Map(data.logos.map((l) => [l.key, l])));

  /** ?category=<name>, case-insensitive; unknown → All */
  function categoryFromUrl(url: URL): string {
    const wanted = url.searchParams.get("category")?.trim().toLowerCase();
    return (wanted && data.categories.find((c) => c.name.toLowerCase() === wanted)?.name) || "All";
  }

  let q = $state("");
  let cat = $state(categoryFromUrl(page.url));
  let sort = $state<Sort>("category");
  let picked = $state<string[]>([]);
  let color = $state("silver");
  let loaded = $state(false);
  let openKey = $state<string | null>(null);
  let expanded = $state<Record<string, boolean>>({});
  let cols = $state(DEFAULT_COLS);
  let search = $state<HTMLInputElement | null>(null);
  let sheetsEl = $state<HTMLDivElement | null>(null);

  // the URL drives the category (section links, back/forward); chips write it back
  $effect(() => {
    cat = categoryFromUrl(page.url);
  });

  const pickedSet = $derived(new Set(picked));
  const pickedLogos = $derived(picked.map((k) => byKey.get(k)).filter((l) => l !== undefined));
  const sheets = $derived(sections(filterLogos(data.logos, q, cat), data.categories, sort));
  const capped = $derived(cat === "All" && !q.trim() && sort === "category");
  const order = $derived(sheetOrder(sheets).map((l) => l.key));
  const editorHref = $derived(picked.length ? "/editor#l=" + encodeLayout(buildLayout(picked, color, 3)) : "/editor");

  const openLogo = $derived(openKey ? (byKey.get(openKey) ?? null) : null);
  // step through what's on screen; a sticker opened from elsewhere (hash, related chip) steps through everything
  const stepOrder = $derived(openKey && order.includes(openKey) ? order : data.logos.map((l) => l.key));
  const position = $derived(openKey ? `${stepOrder.indexOf(openKey) + 1} / ${stepOrder.length}` : "");

  const chips = $derived([{ name: "All", count: data.logos.length }, ...data.categories]);
  const sorts: { id: Sort; label: string }[] = [
    { id: "category", label: "Category" },
    { id: "az", label: "A–Z" },
    { id: "used", label: "Most used" },
  ];

  function toggle(key: string) {
    picked = togglePick(picked, key);
  }

  /** keep the address bar in sync without a navigation (shallow: no load, no scroll) */
  function syncUrl(category: string, hash: string | null) {
    const url = new URL(page.url);
    if (category === "All") url.searchParams.delete("category");
    else url.searchParams.set("category", category);
    url.hash = hash ? hash : "";
    try {
      replaceState(url, page.state);
    } catch {
      // router not ready yet (very first frame): the next change syncs it
    }
  }

  function pickCategory(name: string) {
    cat = name;
    syncUrl(name, openKey);
  }
  function open(key: string) {
    openKey = key;
    syncUrl(cat, key);
  }
  function close() {
    openKey = null;
    syncUrl(cat, null);
  }
  function step(dir: 1 | -1) {
    if (!openKey) return;
    const next = stepKey(stepOrder, openKey, dir);
    if (next) open(next);
  }
  function clearSearch() {
    q = "";
    pickCategory("All");
  }

  onMount(() => {
    const saved = loadPicks((k) => byKey.has(k));
    picked = saved.picked;
    color = saved.color;
    loaded = true;
    const h = decodeURIComponent(location.hash.slice(1));
    if (byKey.has(h)) openKey = h;
  });
  $effect(() => {
    const value = { picked, color };
    if (loaded) savePicks(value);
  });

  // one row = however many 146 px columns the grid really fits right now
  $effect(() => {
    if (!sheetsEl) return;
    const el = sheetsEl;
    const measure = () => (cols = rowCapacity(el.clientWidth - 2 * SHEET_PAD));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  });

  function onkeydown(e: KeyboardEvent) {
    if (openKey) return; // the dialog handles its own keys
    const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      search?.focus();
    } else if (e.key === "/" && !typing) {
      e.preventDefault();
      search?.focus();
    } else if (e.key === "Escape" && e.target === search) {
      q = "";
      search?.blur();
    }
  }

  const eyebrow = "font-mono text-[11.5px] uppercase tracking-[.08em] text-muted-foreground";
</script>

<svelte:window {onkeydown} />

<svelte:head>
  <title>Stickers · {siteConfig.name}</title>
  <meta
    name="description"
    content="Every developer logo as a laptop sticker, laid out like a sticker sheet. Open one to see it at true size, or add it to your laptop and open it in the editor."
  />
  <link rel="canonical" href="{siteConfig.url}/stickers" />
</svelte:head>

<SiteChrome stars={data.stars} />

<SiteFrame>
  <main>
    <!-- Hero -->
    <section class="grid grid-cols-1 items-end gap-6 px-4 pt-10 pb-8 sm:px-8 lg:gap-10 lg:pt-[72px] lg:pb-10 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div class="flex flex-col gap-4">
        <span class={eyebrow}>Stickers · {data.logos.length}</span>
        <h1 class="text-[36px] leading-none font-semibold tracking-[-.05em] text-foreground sm:text-[44px] lg:text-[60px]">Every sticker, ready to peel</h1>
        <p class="max-w-[520px] text-[17px] leading-[1.55] text-pretty text-muted-foreground">
          Developer logos, laid out like a sticker sheet. Open one to see it up close, or hit + to put it on your laptop.
        </p>
      </div>
      <label
        class="flex h-[52px] cursor-text items-center gap-3 rounded-xl border border-border bg-card pr-2.5 pl-[18px] shadow-sm transition-shadow focus-within:border-foreground/30 focus-within:ring-[3px] focus-within:ring-ring/30"
      >
        <SearchIcon class="size-4 flex-none text-muted-foreground" strokeWidth={2.2} aria-hidden="true" />
        <span class="sr-only">Search stickers</span>
        <Input
          bind:ref={search}
          bind:value={q}
          type="search"
          autocomplete="off"
          spellcheck={false}
          placeholder="Search stickers, like Vercel or Postgres"
          class="h-auto flex-1 border-0 bg-transparent px-0 py-0 text-base shadow-none focus-visible:ring-0 md:text-base dark:bg-transparent dark:focus-visible:ring-0 [&::-webkit-search-cancel-button]:hidden"
        />
        <kbd class="hidden flex-none rounded-md sm:block border border-border px-[7px] py-[3px] font-mono text-[11.5px] text-muted-foreground">⌘K</kbd>
      </label>
    </section>

    <!-- Filter bar: sticks under the 64 px nav -->
    <!-- solid, not backdrop-blur: a blurred sticky bar re-blurs every filtered sticker under it on each scroll frame -->
    <div class="sticky top-16 z-10 flex flex-wrap items-center gap-x-3.5 gap-y-2.5 sm:flex-nowrap border-y border-border bg-background px-4 py-3 sm:px-8">
      <div class="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto max-sm:basis-full" role="group" aria-label="Category">
        {#each chips as c (c.name)}
          {@const active = cat === c.name}
          <button
            type="button"
            aria-pressed={active}
            class={cn(
              "flex h-8 flex-none cursor-pointer items-center gap-[7px] rounded-full border pr-2.5 pl-3 text-[13px] font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground/80 hover:text-foreground",
            )}
            onclick={() => pickCategory(c.name)}
          >
            {c.name}<span class={cn("font-mono text-[11px]", active ? "text-background/60" : "text-muted-foreground")}>{c.count}</span>
          </button>
        {/each}
      </div>
      <Segmented options={sorts} value={sort} onchange={(s) => (sort = s)} label="Sort" class="flex-none" />
    </div>

    <!-- Sheets -->
    <div class="flex flex-col gap-10 px-4 pt-8 pb-[120px] sm:px-8">
      <div bind:this={sheetsEl} class="flex flex-col gap-10">
        {#each sheets as sheet (sheet.title)}
          {@const key = sheet.category ?? sheet.title}
          {@const p = preview(sheet.items, cols, capped, !!expanded[key])}
          {@const n = sheet.items.length}
          <section class="sheet-section flex flex-col gap-3" aria-label={sheet.title}>
            <div class="flex items-baseline gap-2.5 px-1">
              <h2 class="text-[17px] font-semibold tracking-[-.02em] text-foreground">{sheet.title}</h2>
              <span class="font-mono text-[11.5px] text-muted-foreground">{n} {n === 1 ? "STICKER" : "STICKERS"}</span>
              <span class="flex-1"></span>
              {#if sheet.category && cat === "All"}
                <a
                  href="/stickers?category={encodeURIComponent(sheet.category)}"
                  class="flex gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span aria-hidden="true">→</span>{sheet.category} stickers
                </a>
              {/if}
            </div>
            <div class="sheet grid grid-cols-[repeat(auto-fill,minmax(146px,1fr))] gap-1 rounded-2xl bg-muted p-2 ring-1 ring-border ring-inset">
              {#each p.shown as logo (logo.key)}
                <StickerCell {logo} picked={pickedSet.has(logo.key)} ontoggle={toggle} onopen={open} />
              {/each}
              {#if p.hasMore}
                <button
                  type="button"
                  class="flex min-w-0 cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl bg-card/55 px-2.5 pt-[22px] pb-4 ring-1 ring-border ring-inset transition-colors outline-none hover:bg-card hover:ring-foreground/20 focus-visible:ring-2 focus-visible:ring-ring"
                  aria-expanded={p.expanded}
                  onclick={() => (expanded = { ...expanded, [key]: !expanded[key] })}
                >
                  <span class="flex h-14 items-center pl-2.5" aria-hidden="true">
                    {#each p.hidden.slice(0, 3) as h, i (h.key)}
                      <span
                        class="relative grid size-10 place-items-center rounded-full bg-white shadow-md ring-2 ring-muted"
                        style:margin-left={i ? "-12px" : "0"}
                        style:z-index={3 - i}
                        style:transform="rotate({(i - 1) * 8}deg)"
                      >
                        <img src={h.href} alt="" loading="lazy" class="size-5 object-contain" />
                      </span>
                    {/each}
                  </span>
                  <span class="text-[13.5px] font-medium text-foreground">{p.expanded ? "Show fewer" : `+${p.hidden.length} more`}</span>
                  <span class="font-mono text-[10.5px] tracking-[.03em] text-muted-foreground uppercase">
                    {p.expanded ? `Collapse ${sheet.title}` : `Show all ${n}`}
                  </span>
                </button>
              {/if}
            </div>
          </section>
        {:else}
          <div class="flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
            <span class="text-[22px] font-semibold tracking-[-.03em] text-foreground">No sticker called “{q.trim()}” yet.</span>
            <span class="max-w-[400px] text-sm leading-normal text-pretty text-muted-foreground">
              Request it and we’ll add it to the library, or upload your own SVG in the editor.
            </span>
            <div class="flex gap-2 pt-2">
              <Button href={logoRequestUrl} target="_blank" rel="noopener noreferrer">Request a logo</Button>
              <Button variant="outline" onclick={clearSearch}>Clear search</Button>
            </div>
          </div>
        {/each}
      </div>

      <div class="flex items-start gap-2.5 rounded-xl bg-muted px-4 py-3.5 text-[13px] leading-normal text-muted-foreground">
        <span class="flex-none pt-px font-mono text-[11px] tracking-[.06em] text-foreground" aria-hidden="true">™</span>
        <span class="text-pretty">
          Logos belong to their owners. Showing them here isn’t an endorsement, and nothing here is for sale. Own one of these marks?
          <a href="/brands#remove" class="text-foreground underline underline-offset-[3px]">Request removal</a>.
        </span>
      </div>
    </div>
  </main>
  <SiteFooter />
</SiteFrame>

<PicksTray picked={pickedLogos} {editorHref} onclear={() => (picked = [])} />

<StickerDialog
  logo={openLogo}
  {position}
  all={data.logos}
  picked={openKey ? pickedSet.has(openKey) : false}
  ontoggle={toggle}
  onopen={open}
  onstep={step}
  onclose={close}
/>

<style>
  /* die-cut: eight hard white drop-shadows trace a vinyl border around the logo's alpha, then a soft lift.
     White is literal on purpose: real stickers are white vinyl in either theme. --cut sets the border width. */
  :global(.diecut) {
    --cut: 3px;
    --d: calc(var(--cut) * 0.71);
    filter: drop-shadow(var(--cut) 0 0 #fff) drop-shadow(calc(var(--cut) * -1) 0 0 #fff) drop-shadow(0 var(--cut) 0 #fff)
      drop-shadow(0 calc(var(--cut) * -1) 0 #fff) drop-shadow(var(--d) var(--d) 0 #fff) drop-shadow(calc(var(--d) * -1) var(--d) 0 #fff)
      drop-shadow(var(--d) calc(var(--d) * -1) 0 #fff) drop-shadow(calc(var(--d) * -1) calc(var(--d) * -1) 0 #fff)
      drop-shadow(0 1px 1px rgb(20 30 40 / 0.18)) drop-shadow(0 3px 6px rgb(20 30 40 / 0.12));
  }
  /* offscreen sections skip layout and paint (35 of them, each full of filtered stickers); 260px is one row + header */
  .sheet-section {
    content-visibility: auto;
    contain-intrinsic-size: auto 260px;
  }
  .sheet {
    background-image: radial-gradient(color-mix(in oklab, var(--color-muted-foreground) 28%, transparent) 1px, transparent 1px);
    background-size: 14px 14px;
  }
  .no-scrollbar {
    scrollbar-width: none;
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
</style>
