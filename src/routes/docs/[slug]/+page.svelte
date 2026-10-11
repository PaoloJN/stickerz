<script lang="ts">
  import { siteConfig } from "@/config/site";
  /** Docs — five articles keyed by slug. Nav/TOC data lives in $lib/docs/articles; bodies are written inline below. */
  import type { PageProps } from "./$types";
  import SiteChrome from "@/components/site/SiteChrome.svelte";
  import SiteFrame from "@/components/site/SiteFrame.svelte";
  import SiteFooter from "@/components/site/SiteFooter.svelte";
  import Toc from "@/components/docs/Toc.svelte";
  import PrintMethods from "@/components/docs/PrintMethods.svelte";
  import Faq from "@/components/docs/Faq.svelte";
  import { Button } from "@/components/ui/button";
  import { ARTICLES, GROUPS, SEQ, getArticle } from "$lib/docs/articles";
  import { DEVICE_LIST } from "$lib/stickers/devices";
  import { REPO_URL, UPSTREAM } from "$lib/support";
  import { logoRequestUrl } from "@/config/site";
  import { cn } from "@/utils/cn";

  let { data }: PageProps = $props();

  const article = $derived(getArticle(data.slug)!);
  const slug = $derived(data.slug);
  const idx = $derived(SEQ.indexOf(slug as (typeof SEQ)[number]));
  const prev = $derived(idx > 0 ? getArticle(SEQ[idx - 1]) : undefined);
  const next = $derived(idx < SEQ.length - 1 ? getArticle(SEQ[idx + 1]) : undefined);

  // Mirrors FORMATS in src/components/editor/ExportDialog.svelte
  const FORMATS = [
    ["Print kit", "PDF or ZIP", "Sticker sheets at true size, a placement stencil and a placement map", "Printing and putting them on"],
    ["Image", "PNG", "A sharp picture of the whole design", "Posting anywhere"],
  ];
  const KIT = [
    ["Sticker sheets", "Every sticker straightened and packed onto Letter or A4 paper at true size, each with its number. Colored edges print a little past the cut line, so a slightly-off cut never shows bare paper."],
    ["Placement stencil", "The laptop at 1:1, split over a few pages you tape together. It has the laptop's outline, a cut-out for the Apple logo, and a numbered window for every sticker."],
    ["Placement map", "One page: a picture of your design with numbers, and a table of where each sticker goes (in mm from the left and top edges) and how much it tilts, in the order to stick them on."],
  ];

  // Sticker size column: roughly 15–20 % of the lid width, rounded to the nearest 5 mm (a guide, not a spec).
  const to5 = (n: number) => Math.round(n / 5) * 5;
  const LAPTOPS = DEVICE_LIST.map((d) => ({
    name: d.name,
    lid: `${Math.round(d.w)} × ${Math.round(d.h)} mm`,
    sticker: `${to5(d.w * 0.15)}–${to5(d.w * 0.2)} mm`,
  }));

  let vote = $state<"yes" | "no" | null>(null);
  let copied = $state(false);
  $effect(() => {
    void slug;
    vote = null;
    copied = false;
  });
  const CLONE = `git clone ${REPO_URL}.git\npnpm install\npnpm dev`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(CLONE);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  const eyebrow = "font-mono text-[11.5px] uppercase tracking-[.08em] text-muted-foreground";
  const h2 = "mt-[52px] mb-3 scroll-mt-24 text-2xl font-semibold tracking-[-.03em] text-foreground";
  const p = "my-0 mb-4 text-[15.5px] leading-[1.7] text-muted-foreground";
  const link = "text-foreground underline underline-offset-3 hover:text-muted-foreground";
  const th = "px-4 py-3 text-left font-mono text-[11px] font-normal tracking-[.06em] text-muted-foreground";
  const td = "border-t border-border px-4 py-3.5 text-sm text-muted-foreground";
</script>

<svelte:head>
  <title>{article.label} · Docs · {siteConfig.name}</title>
  <meta name="description" content={article.lede ?? `${article.title}: the Stickerz docs.`} />
</svelte:head>

<SiteChrome stars={data.stars} />

<SiteFrame>
  <div class="grid grid-cols-1 border-t border-border lg:grid-cols-[232px_minmax(0,1fr)_200px]">
    <aside class="min-w-0 border-b border-border lg:border-r lg:border-b-0">
      <nav aria-label="Docs" class="flex gap-0.5 overflow-x-auto px-4 py-3 [scrollbar-width:none] lg:sticky lg:top-[65px] lg:flex-col lg:gap-[22px] lg:overflow-visible lg:py-8">
        {#each GROUPS as g (g.label)}
          <div class="flex flex-none gap-0.5 lg:flex-col">
            <span class="hidden px-2.5 pb-1.5 font-mono lg:block text-[10.5px] tracking-[.08em] text-muted-foreground">{g.label}</span>
            {#each g.items as s (s)}
              <a
                href={`/docs/${s}`}
                aria-current={s === slug ? "page" : undefined}
                class={cn(
                  "flex h-8 flex-none items-center rounded-[7px] px-2.5 text-[13.5px] whitespace-nowrap hover:text-foreground",
                  s === slug ? "bg-muted font-medium text-foreground" : "text-muted-foreground",
                )}>{getArticle(s)?.label}</a
              >
            {/each}
          </div>
        {/each}
        <div class="flex flex-none gap-0.5 lg:flex-col">
          <span class="hidden px-2.5 pb-1.5 font-mono lg:block text-[10.5px] tracking-[.08em] text-muted-foreground">MORE</span>
          <a href="/brands" class="flex h-8 flex-none items-center justify-between gap-1.5 rounded-[7px] px-2.5 text-[13.5px] whitespace-nowrap text-muted-foreground hover:bg-muted hover:text-foreground">For brands<span class="text-xs">↗</span></a>
          <a href={REPO_URL} class="flex h-8 flex-none items-center justify-between gap-1.5 rounded-[7px] px-2.5 text-[13.5px] whitespace-nowrap text-muted-foreground hover:bg-muted hover:text-foreground">GitHub<span class="text-xs">↗</span></a>
        </div>
      </nav>
    </aside>

    <article class="min-w-0 px-4 pt-8 pb-16 sm:px-10 lg:px-14 lg:pt-12 lg:pb-[72px]">
      <div class="flex max-w-[660px] flex-col">
        <header class="mb-2 flex flex-col gap-3.5">
          <span class={eyebrow}>{article.eyebrow}</span>
          <h1 class="m-0 text-[32px] sm:text-[42px] leading-[1.05] font-semibold tracking-[-.045em] text-foreground">{article.title}</h1>
          {#if article.lede}<p class="m-0 text-[17px] leading-[1.6] text-muted-foreground">{article.lede}</p>{/if}
          {#if article.meta}<span class="font-mono text-[11.5px] text-muted-foreground">{article.meta}</span>{/if}
        </header>

        {#if slug === "works"}
          <h2 id="pick" data-toc class={h2}>1. Pick your logos</h2>
          <p class={p}>Search the library of developer logos, or start from someone’s design in Community. You can also drop in your own SVG.</p>
          <h2 id="arrange" data-toc class={h2}>2. Arrange your stickers</h2>
          <p class={p}>Choose your laptop and its color, then drag, resize and rotate. Shuffle gives you a fresh layout if you’re stuck.</p>
          <h2 id="share" data-toc class={h2}>3. Share or print</h2>
          <p class={p}>Share a link, post it to Community, or export print files. See <a href="/docs/print" class={link}>How to print</a> for the details.</p>
          <h2 id="saved" data-toc class={h2}>Where your designs live</h2>
          <p class={p}>Designs are saved in your browser, and on our server once you save or share them (you’ll find them under <a href="/designs" class={link}>My designs</a>). Clearing site data deletes the browser copy, so save or share anything you want to keep. Shared links are public to anyone who has them.</p>
        {:else if slug === "print"}
          <h2 id="export" data-toc class={h2}>1. Export the print kit</h2>
          <p class={p}>
            Open your design, press Export and pick <b class="text-foreground">Print kit</b>. Choose your paper (Letter or A4), how you’ll cut them, and what to include. The
            preview shows the first sheet, and the summary says how many pages you’ll get.
          </p>
          <div class="mb-5 overflow-hidden rounded-xl border border-border bg-card">
            <table class="w-full border-collapse">
              <thead class="bg-muted"><tr><th class={th}>IN THE KIT</th><th class={th}>WHAT IT IS</th></tr></thead>
              <tbody>
                {#each KIT as [what, desc] (what)}
                  <tr><td class={cn(td, "text-foreground")}>{what}</td><td class={td}>{desc}</td></tr>
                {/each}
              </tbody>
            </table>
          </div>
          <p class={p}>
            The kit starts with a cover page listing what’s inside, and every number matches across it: sticker 3 on the sheet is window 3 on the stencil and row 3 on
            the map. The export has one other format, for posting:
          </p>
          <div class="overflow-hidden rounded-xl border border-border bg-card max-sm:overflow-x-auto">
            <table class="w-full border-collapse">
              <thead class="bg-muted"><tr><th class={th}>FILE</th><th class={th}>WHAT IT’S FOR</th><th class={th}>USE WITH</th></tr></thead>
              <tbody>
                {#each FORMATS as [fmt, kind, what, use] (fmt)}
                  <tr><td class={cn(td, "text-foreground")}>{fmt} <span class="text-muted-foreground">· {kind}</span></td><td class={td}>{what}</td><td class={td}>{use}</td></tr>
                {/each}
              </tbody>
            </table>
          </div>
          <h2 id="size" data-toc class={h2}>2. Check the size</h2>
          <p class={p}>
            Printers love to “fit to page”, which quietly shrinks everything. Always print at 100% (“Actual size”). Every page of the kit has a line at the bottom that
            should measure exactly 50 mm: check it with a ruler before you cut anything.
          </p>
          <aside class="mb-5 rounded-xl bg-muted p-5">
            <span class="mb-2 block font-mono text-[11px] tracking-[.08em] text-muted-foreground">TEST FIRST</span>
            <p class="m-0 text-[15px] leading-[1.6] text-foreground">Print one sheet on plain paper and measure a sticker against the size shown in the editor before you use vinyl.</p>
          </aside>
          <div class="overflow-hidden rounded-xl border border-border bg-card max-sm:overflow-x-auto">
            <table class="w-full border-collapse">
              <thead class="bg-muted"><tr><th class={th}>LAPTOP</th><th class={th}>AREA</th><th class={th}>STICKER SIZE</th></tr></thead>
              <tbody>
                {#each LAPTOPS as l (l.name)}
                  <tr><td class={cn(td, "text-foreground")}>{l.name}</td><td class={td}>{l.lid}</td><td class={td}>{l.sticker}</td></tr>
                {/each}
              </tbody>
            </table>
          </div>
          <h2 id="cut" data-toc class={h2}>3. Print and cut</h2>
          <p class={p}>Pick the same method in the export that you’ll cut with: it decides what the sheets look like and which files you get.</p>
          <PrintMethods />
          <aside class="mt-5 mb-5 rounded-xl bg-muted p-5">
            <span class="mb-2 block font-mono text-[11px] tracking-[.08em] text-muted-foreground">WHICH IS BEST?</span>
            <p class="m-0 text-[15px] leading-[1.6] text-foreground">
              For the best result with no machine, use a <b>print shop</b>: real vinyl, clean edges, and they cut for you. If you have a <b>Cricut or Silhouette</b>, it’s the
              best way to cut at home: precise and fast. <b>Scissors</b> work great for a handful of stickers with simple shapes.
            </p>
          </aside>
          <h2 id="place" data-toc class={h2}>4. Put them in the right place</h2>
          <p class={p}>The hard part isn’t printing, it’s getting each sticker where you designed it. The kit gives you two ways; use one or both.</p>
          <h3 class="mt-6 mb-2 text-[17px] font-semibold text-foreground">The placement stencil (most accurate)</h3>
          <ol class="mb-5 flex list-decimal flex-col gap-1.5 pl-5 text-[15px] leading-[1.6] text-muted-foreground">
            <li>Print the stencil pages at 100% on plain paper.</li>
            <li>Overlap the shaded strips so the <b class="text-foreground">+</b> marks line up, and tape the pages together.</li>
            <li>Cut along the laptop’s outline, then cut out the Apple logo and every numbered window.</li>
            <li>Lay the stencil on the laptop: the logo shows through its hole and the edges line up with the laptop’s edges.</li>
            <li>Peel each sticker and press it through its window, in number order. Then lift the stencil off.</li>
          </ol>
          <h3 class="mt-6 mb-2 text-[17px] font-semibold text-foreground">The placement map (quickest)</h3>
          <p class={p}>
            One page, no cutting. For each sticker it says how far its <b class="text-foreground">centre</b> sits from the laptop’s left edge and from its top edge (the edge
            away from the hinge), and how much it tilts. A ruler is all you need. It also lists the order to stick them on.
          </p>
          <aside class="mb-5 rounded-xl bg-muted p-5">
            <span class="mb-2 block font-mono text-[11px] tracking-[.08em] text-muted-foreground">WHICH ONE?</span>
            <p class="m-0 text-[15px] leading-[1.6] text-foreground">
              Use the <b>stencil</b> when you have many stickers, they sit close together, or the exact spot matters. Use the <b>map</b> for a few stickers, or as a
              checklist next to the stencil. Both are in the kit by default.
            </p>
          </aside>
          <h2 id="apply" data-toc class={h2}>5. Stick it on</h2>
          <p class={p}>
            Wipe the laptop with a little isopropyl alcohol and let it dry. Go in number order: the biggest sticker first, since it anchors the layout, then outward from the
            middle, so one slightly-off sticker doesn’t push everything after it. Press each one from the middle to the edges to push out air. Most stickers can be lifted
            and moved in the first minute.
          </p>
        {:else if slug === "contribute"}
          <h2 id="local" data-toc class={h2}>Run it locally</h2>
          <div class="relative rounded-xl bg-foreground px-[18px] py-4 font-mono text-[13px] leading-[1.9] text-background">
            <button
              type="button"
              onclick={copy}
              class="absolute top-3 right-3 h-[26px] cursor-pointer rounded-md border border-background/25 px-2.5 text-[11px] text-background/80 hover:text-background">{copied ? "Copied" : "Copy"}</button
            >
            <pre class="m-0 overflow-x-auto"><span class="opacity-50">$ </span>git clone {REPO_URL}.git
<span class="opacity-50">$ </span>pnpm install
<span class="opacity-50">$ </span>pnpm dev</pre>
          </div>
          <h2 id="pr" data-toc class={h2}>Opening a pull request</h2>
          <p class={p}>Keep PRs small and say what you tested. For anything bigger than a fix, open an issue first so we can agree on the approach before you spend the time.</p>
          <h2 id="logos" data-toc class={h2}>Where the logos live</h2>
          <p class={p}>The SVGs are in <code>static/library</code> and their entries in <code>src/data/svgs.ts</code>. The library started from <a href={UPSTREAM.repo} class={link}>svgl</a>, pheralb’s open logo collection. To add one, see <a href="/docs/missing" class={link}>Adding a missing logo</a>.</p>
        {:else if slug === "missing"}
          <h2 id="req" data-toc class={h2}>What we need</h2>
          <ol class="mb-4 list-decimal pl-5 text-[15.5px] leading-[1.7] text-muted-foreground">
            <li>An SVG from the brand’s official press kit or site.</li>
            <li>Light and dark versions, if the logo has them.</li>
            <li>A category and a link to the product.</li>
          </ol>
          <p class={p}>Open a logo request on GitHub with those three things, or send a pull request if you’d rather add it yourself.</p>
          <h2 id="now" data-toc class={h2}>Need it today?</h2>
          <p class={p}>Upload your own SVG in the editor. It stays on your design only and isn’t added to the public library.</p>
          <div class="mt-2 flex flex-wrap gap-3">
            <Button href={logoRequestUrl} class="h-10">Request a logo ↗</Button>
            <Button href="/editor" variant="outline" class="h-10">Upload in editor</Button>
          </div>
        {:else if slug === "faq"}
          <div class="mt-6"><Faq /></div>
        {/if}

        <div class="mt-16 grid grid-cols-2 gap-3">
          {#if prev}
            <a href={`/docs/${prev.slug}`} class="rounded-xl border border-border bg-card px-[18px] py-4 hover:bg-muted">
              <span class="block font-mono text-[11px] text-muted-foreground">← PREVIOUS</span>
              <span class="mt-1 block text-[15px] font-medium text-foreground">{prev.label}</span>
            </a>
          {:else}<span></span>{/if}
          {#if next}
            <a href={`/docs/${next.slug}`} class="rounded-xl border border-border bg-card px-[18px] py-4 text-right hover:bg-muted">
              <span class="block font-mono text-[11px] text-muted-foreground">NEXT →</span>
              <span class="mt-1 block text-[15px] font-medium text-foreground">{next.label}</span>
            </a>
          {:else}<span></span>{/if}
        </div>

        <div class="mt-6 flex flex-wrap items-center gap-3 text-[13px] text-muted-foreground">
          <span>Was this page helpful?</span>
          {#each [["yes", "Yes"], ["no", "No"]] as [v, label] (v)}
            <button type="button" onclick={() => (vote = v as "yes" | "no")} aria-pressed={vote === v} class="h-7 cursor-pointer rounded-[7px] border border-border bg-card px-2.5 hover:text-foreground aria-pressed:text-foreground">{label}</button>
          {/each}
          {#if vote}<span class="text-foreground" role="status">Thanks, noted.</span>{/if}
          <div class="flex-1"></div>
          <a href={`${REPO_URL}/blob/main/src/routes/docs/[slug]/+page.svelte`} class="hover:text-foreground">Edit this page on GitHub ↗</a>
        </div>
      </div>
    </article>

    <aside class="hidden border-l border-border lg:block">
      <div class="sticky top-[65px] px-5 py-12">
        {#key slug}<Toc items={article.toc} />{/key}
      </div>
    </aside>
  </div>
  <SiteFooter />
</SiteFrame>
