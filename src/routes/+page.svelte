<script lang="ts" module>
  import { browser } from "$app/environment";
  // fetched with hydration, not after it; phones and touch screens never request the chunk
  const demoModule =
    browser && matchMedia("(min-width: 1024px) and (pointer: fine)").matches ? import("@/components/editor/EditorDemo.svelte") : null;
</script>

<script lang="ts">
  import { siteConfig } from "@/config/site";
  /**
   * Home — per docs/design/*Home.dc.html (spec §4.1). The hero frame shows a static lid on phones; on
   * laptops a server-rendered editor skeleton that the live editor demo replaces in place on load.
   * The "small stuff" controls are visual only (wired later).
   */
  import { onMount, type Component } from "svelte";
  import type { PageProps } from "./$types";
  import { untrack } from "svelte";
  import type { Layout } from "$lib/stickers/types";
  import SiteChrome from "@/components/site/SiteChrome.svelte";
  import SiteFrame from "@/components/site/SiteFrame.svelte";
  import SiteFooter from "@/components/site/SiteFooter.svelte";
  import StackLid from "@/components/stack/StackLid.svelte";
  import Sticker from "@/components/stack/Sticker.svelte";
  import HeroScatter from "@/components/home/HeroScatter.svelte";
  import Marquee from "@/components/home/Marquee.svelte";
  import LidPreview from "@/components/home/LidPreview.svelte";
  import EditorSkeleton from "@/components/home/EditorSkeleton.svelte";
  import { render } from "svelte/server";
  import { Button } from "@/components/ui/button";
  import { getDevice, getFinish } from "$lib/stickers/devices";
  import { CSTK, HEADLINE_CYCLE, HOW1, HOW2, HSTK, LAY, MQ, SHEET, lib } from "$lib/home";
  import { cn } from "@/utils/cn";
  import { remixHref } from "$lib/stacks/mock";
  import { shuffle as shuffleLayout } from "$lib/stickers/ops";

  let { data }: PageProps = $props();
  const cuts = $derived(data.cuts);

  // "Try it here": the three demos are live. Shuffle reuses the editor's own op, so it moves like the real thing.
  // a one-time copy on purpose: the demo mutates its own layout and shouldn't snap back if `data` reloads
  let shuffled = $state(untrack(() => data.shuffle));
  let shuffleHover = $state(false);
  const doShuffle = () => (shuffled = shuffleLayout(shuffled, getDevice(shuffled.laptop.model)));
  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (!shuffleHover || e.key.toLowerCase() !== "s" || e.metaKey || e.ctrlKey || e.altKey) return;
    if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
    e.preventDefault();
    doShuffle();
  };

  const SHAPES_DEMO = [
    ["diecut", "Die-cut"],
    ["circle", "Circle"],
    ["square", "Square"],
  ] as const;
  let shape = $state<(typeof SHAPES_DEMO)[number][0]>("diecut");
  const shapeDemo = lib("react_light.svg");
  const shapeCut = $derived(cuts[shapeDemo] ?? null);
  const shapeAspect = $derived(shapeCut?.aspect ?? 1);

  let topLayer = $state(LAY.length - 1);
  // the hero is something to play with: a crowded lid leaves no room, so keep the first 8
  const hero = $derived<Layout>(data.hero.stickers.length > 9 ? { ...data.hero, stickers: data.hero.stickers.slice(0, 8) } : data.hero);

  // Live editor demo, laptops only: the chunk starts loading at module scope (during hydration) and
  // mounts as soon as it resolves; the server-rendered EditorSkeleton holds its exact place until then
  let EditorDemo: Component<{ layout: Layout }> | null = $state(null);
  let demoShown = $state(false);
  // The skeleton is static markup, so it's rendered on the server only and shipped as HTML, not JS: the
  // client passes a non-empty placeholder and Svelte adopts the server's {@html} nodes as they are when
  // hydrating (it never repairs {@html} mismatches); "" would leave them unowned and drop them.
  // svelte-ignore state_referenced_locally
  const skeleton = import.meta.env.SSR ? render(EditorSkeleton, { props: { layout: hero, cuts, logoCount: data.logoCount } }).body : " ";
  onMount(() => {
    if (!demoModule) return;
    let gone = false;
    demoModule
      .then((mod) => {
        if (gone) return;
        EditorDemo = mod.default;
        // let the canvas measure itself for a frame, then swap in place
        requestAnimationFrame(() => requestAnimationFrame(() => (demoShown = true)));
      })
      .catch(() => {
        // keep the skeleton's static lid
      });
    return () => {
      gone = true;
    };
  });

  const dots20 =
    "background-image: radial-gradient(var(--color-border) 1.2px, transparent 1.2px); background-size: 20px 20px;";
  const dots18 =
    "background-image: radial-gradient(var(--color-border) 1px, transparent 1px); background-size: 18px 18px;";

  // The meadow photo behind the lid preview (static/images/hero-meadow.png); the gradient only shows while it loads
  const meadow =
    "bg-muted bg-[url('/images/hero-meadow.png')] bg-cover bg-[center_60%]";

  // "How it works" 01 draws a real device so the title bar and lid colour are true
  const pro14 = getDevice("pro14");
  const silver = getFinish(pro14, "silver");

  // the inline headline sticker cycles every 1.9 s (click to skip ahead and restart the clock)
  let headIdx = $state(0);
  const head = $derived(HEADLINE_CYCLE[headIdx]);
  const headHref = $derived(lib(head.file));
  const headCut = $derived(cuts[headHref] ?? null);
  const headAspect = $derived(headCut?.aspect ?? 1);
  let headTimer: ReturnType<typeof setInterval> | undefined;
  const armHeadline = () => {
    clearInterval(headTimer);
    headTimer = setInterval(() => (headIdx = (headIdx + 1) % HEADLINE_CYCLE.length), 1900);
  };
  const nextHeadline = () => {
    headIdx = (headIdx + 1) % HEADLINE_CYCLE.length;
    armHeadline();
  };
  $effect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    armHeadline();
    return () => clearInterval(headTimer);
  });

  const eyebrow = "font-mono text-[11.5px] uppercase tracking-[.08em] text-muted-foreground";
  const textLink = "flex items-center gap-1.5 text-sm font-medium text-foreground transition-opacity hover:opacity-70";
  const cta = "h-[46px] rounded-[10px] px-5 text-[15px]";
  // below lg the How-it-works rows stack, illustration first, and the fixed-size scenes shrink to fit a phone
  const howText = "flex flex-col justify-center gap-4 px-4 py-10 sm:px-12 lg:py-16";
  const howArt = "relative order-first grid h-[340px] place-items-center overflow-hidden border-b border-border p-7 sm:h-[440px] lg:order-none lg:overflow-visible lg:border-b-0";
  const lay = LAY.length - 1;
</script>

<svelte:window onkeydown={onKey} />

<svelte:head>
  <title>{siteConfig.name} — put your stack on anything</title>
  <meta
    name="description"
    content="Pick from {data.logoCount} stickers, lay them out at true scale on your exact laptop, bottle or anything else, then post the picture or print the sheet."
  />
</svelte:head>

<!-- the blurred meadow behind the "How it works" illustrations -->
{#snippet panelBackdrop()}
  <div class="absolute inset-7 overflow-hidden rounded-2xl bg-muted">
    <div class={cn("absolute -inset-4 opacity-60 blur-[4px] saturate-[.8]", meadow)}></div>
  </div>
{/snippet}

<SiteChrome stars={data.stars} />

<SiteFrame>
  <main class="text-foreground">
    <!-- 1. Hero -->
    <section class="p-3">
      <div
        class="relative isolate flex flex-col items-center overflow-hidden rounded-[18px] bg-stage px-3 pt-12 text-center sm:pt-16 lg:px-0 lg:pt-[88px] shadow-[inset_0_0_0_1px_var(--color-border)]"
        style={dots20}
      >
        <HeroScatter items={HSTK} {cuts} float class="hidden lg:block" />

        <div class="relative z-[2] flex flex-col items-center gap-[22px]">
          <h1 class="text-4xl leading-none sm:text-5xl lg:text-[76px] font-semibold tracking-[-.05em] text-balance">
            Your whole
            <button
              type="button"
              class="mx-[.02em] inline-grid size-[.9em] cursor-pointer place-items-center overflow-visible align-[-.1em]"
              title="Next logo"
              aria-label="Show the next logo"
              onclick={nextHeadline}
            >
              {#key headIdx}
                <!-- the resting angle lives on --rot so the swing-in keyframe can land on it -->
                <svg viewBox="-60 -60 120 120" aria-hidden="true" class="ss-headline size-full overflow-visible" style="--rot:{head.rot}deg">
                  <Sticker href={headHref} cut={headCut} x={0} y={0} w={headAspect >= 1 ? 100 : 100 * headAspect} rot={0} />
                </svg>
              {/key}
            </button>
            stack<br />on anything.
          </h1>
          <p class="max-w-[580px] text-base leading-normal sm:text-lg text-pretty text-foreground/80">
            Pick from {data.logoCount} stickers, lay them out at true scale on your exact laptop, then post the
            picture or print the sheet.
          </p>
          <div class="flex flex-wrap items-center justify-center gap-2.5 pt-2.5">
            <Button href="/editor" class={cta}>Open the editor</Button>
            <Button href="/community" variant="outline" class={cta}>Explore the community</Button>
          </div>
        </div>

        <!-- meadow frame: the static preview, crossfaded to the live editor demo on laptops -->
        <div
          role="group"
          aria-label="Try the editor"
          class={cn("relative z-[1] mt-10 w-full rounded-[24px] p-3 sm:p-8 lg:mt-16 lg:w-auto lg:p-12 shadow-[inset_0_0_0_1px_rgb(0_0_0/.06)]", meadow)}
        >
          <div class="relative text-left">
            <!-- phones / touch: the static lid; laptops: the editor skeleton, replaced in place by the live demo -->
            <div class="lg:pointer-fine:hidden">
              <LidPreview layout={hero} {cuts} />
            </div>
            <div
              class={cn(
                "hidden h-[538px] w-[968px] max-w-full overflow-hidden rounded-[12px] border border-foreground/10 bg-neutral-50 lg:pointer-fine:block dark:bg-neutral-950",
                !demoShown && "shadow-[0_1px_2px_rgb(0_0_0/.06),0_30px_60px_rgb(10_40_40/.35)]",
              )}
            >
              {#if !demoShown}{@html skeleton}{/if}
            </div>
            {#if EditorDemo}
              <div class={cn("absolute inset-0", demoShown ? "" : "pointer-events-none opacity-0")}>
                <EditorDemo layout={hero} />
              </div>
            {/if}
          </div>
        </div>
      </div>
    </section>

    <!-- 2. Logo marquee -->
    <section class="flex items-center gap-4 border-t border-border py-7 pl-4 sm:gap-7 sm:pl-8">
      <span class="flex-none font-mono text-[11.5px] tracking-[.06em] whitespace-nowrap text-muted-foreground">
        {data.logoCount} STICKERS, INCLUDING
      </span>
      <Marquee items={MQ} />
    </section>

    <!-- 3. How it works -->
    <section class="flex flex-col items-center gap-4 border-t border-border px-4 pt-16 pb-12 text-center sm:px-8 lg:pt-[104px] lg:pb-16">
      <span class={eyebrow}>How it works</span>
      <h2 class="text-4xl leading-[1.04] sm:text-5xl font-semibold tracking-[-.045em]">From blank to sticker sheet</h2>
      <p class="max-w-[500px] text-[17px] leading-[1.55] text-pretty text-muted-foreground">
        Three steps, one screen. It all happens in the editor, in your browser.
      </p>
    </section>

    <!-- 01 · True scale -->
    <section class="grid grid-cols-1 border-t border-border lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
      <div class={howText}>
        <span class={eyebrow}>01 · True scale</span>
        <h3 class="text-[28px] leading-[1.08] sm:text-[34px] font-semibold tracking-[-.035em] text-balance">
          If it fits here, it fits there.
        </h3>
        <p class="max-w-[380px] text-base leading-[1.55] text-pretty text-muted-foreground">
          Pick your laptop and the canvas becomes its surface, in millimeters. A 2-inch sticker is drawn at 2 inches, so
          nothing ends up smaller than you planned.
        </p>
        <div class="pt-2.5">
          <a href="/editor" class={textLink}>Pick your laptop<span class="text-[13px]">→</span></a>
        </div>
      </div>
      <div class={cn(howArt, "lg:border-l")} aria-hidden="true">
        {@render panelBackdrop()}
        <div
          class="relative w-[440px] flex-none overflow-hidden rounded-xl max-sm:scale-[.74] max-sm:absolute max-sm:top-1/2 max-sm:left-1/2 max-sm:-translate-1/2 border border-foreground/10 bg-card text-[13px] shadow-[0_1px_2px_rgb(0_0_0/.06),0_24px_50px_rgb(10_40_40/.28)]"
        >
          <div class="flex h-[38px] items-center justify-between border-b border-border px-3">
            <span class="font-medium">{pro14.name} <span class="text-muted-foreground">· {silver.name}</span></span>
            <span class="font-mono text-[11px] text-muted-foreground"
              >{Math.round(pro14.w)} × {Math.round(pro14.h)} mm · 1:1</span
            >
          </div>
          <div class="relative h-[250px] overflow-hidden bg-muted" style={dots20}>
            <!-- ruler: minor ticks every 10 px, majors every 50 px -->
            <div
              class="absolute inset-x-0 top-0 h-[18px] border-b border-border bg-card"
              style="background-image: repeating-linear-gradient(90deg, color-mix(in oklab, var(--color-muted-foreground) 55%, transparent) 0 1px, transparent 1px 10px), repeating-linear-gradient(90deg, var(--color-muted-foreground) 0 1px, transparent 1px 50px); background-size: 100% 6px, 100% 11px; background-repeat: no-repeat; background-position: 0 100%, 0 100%;"
            ></div>
            <!-- the lid, in the device's real finish colour -->
            <div
              class="absolute top-10 left-[46px] h-[290px] w-[420px] rounded-2xl shadow-[inset_0_1px_0_rgb(255_255_255/.6),0_10px_24px_rgb(0_0_0/.14)]"
              style="background: radial-gradient(ellipse at 26% 6%, rgb(255 255 255 / .4), transparent 55%), {silver.base};"
            ></div>
            <HeroScatter items={HOW1} {cuts} art={1} />
            <div class="absolute top-[78px] left-24 size-[120px] -rotate-6">
              <HeroScatter items={[["react_light.svg", 0, 0, 120, 0]]} {cuts} art={1} />
              <span class="absolute -inset-2 rounded-[3px] border-[1.5px] border-blue-500"></span>
              <span class="absolute -top-3 -left-3 size-2 border-[1.5px] border-blue-500 bg-card"></span>
              <span class="absolute -right-3 -bottom-3 size-2 border-[1.5px] border-blue-500 bg-card"></span>
            </div>
            <span
              class="absolute top-[216px] left-[100px] flex h-[22px] items-center rounded-md bg-blue-500 px-2 font-mono text-[10.5px] text-white"
              >50.8 × 50.8 mm · −6°</span
            >
          </div>
        </div>
      </div>
    </section>

    <!-- 02 · All the logos -->
    <section class="grid grid-cols-1 border-t border-border lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
      <div class={cn(howArt, "order-none")} aria-hidden="true">
        {@render panelBackdrop()}
        <div class="relative h-[330px] w-[480px] flex-none max-sm:scale-[.68] max-sm:absolute max-sm:top-1/2 max-sm:left-1/2 max-sm:-translate-1/2">
          <HeroScatter items={HOW2} {cuts} art={1} />
          <div
            class="absolute top-[236px] right-[50px] left-[50px] flex h-[54px] items-center gap-2.5 rounded-full border border-border bg-card pr-2.5 pl-5 text-[15px] shadow-[0_1px_2px_rgb(0_0_0/.05),0_14px_30px_rgb(20_30_40/.1)]"
          >
            <span class="flex-1 text-muted-foreground">Search {data.logoCount} stickers…</span>
            <span class="rounded-md border border-border px-[7px] py-[3px] font-mono text-[11px] text-muted-foreground"
              >⌘K</span
            >
          </div>
        </div>
      </div>
      <div class={cn(howText, "border-border lg:border-l")}>
        <span class={eyebrow}>02 · All the logos</span>
        <h3 class="text-[28px] leading-[1.08] sm:text-[34px] font-semibold tracking-[-.035em] text-balance">
          Every sticker you build with, one keystroke away.
        </h3>
        <p class="max-w-[380px] text-base leading-[1.55] text-pretty text-muted-foreground">
          Search {data.logoCount} stickers with light and dark variants. Press Enter and it lands on your design, ready to drag,
          rotate and layer.
        </p>
        <div class="pt-2.5">
          <a href="/stickers" class={textLink}>Browse the library<span class="text-[13px]">→</span></a>
        </div>
      </div>
    </section>

    <!-- 03 · Take it off the screen -->
    <section class="grid grid-cols-1 border-t border-border lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
      <div class={howText}>
        <span class={eyebrow}>03 · Take it off the screen</span>
        <h3 class="text-[28px] leading-[1.08] sm:text-[34px] font-semibold tracking-[-.035em] text-balance">
          Post it, send it, or print it.
        </h3>
        <p class="max-w-[380px] text-base leading-[1.55] text-pretty text-muted-foreground">
          Export a clean image for a post, share a link anyone can remix, or download a PDF with cut lines for any print
          shop.
        </p>
        <div class="pt-2.5">
          <a href="/docs/print" class={textLink}>How printing works<span class="text-[13px]">→</span></a>
        </div>
      </div>
      <div class={cn(howArt, "lg:border-l")} aria-hidden="true">
        {@render panelBackdrop()}
        <div class="relative h-[340px] w-[560px] flex-none scale-[.88] max-sm:scale-[.56] max-sm:absolute max-sm:top-1/2 max-sm:left-1/2 max-sm:-translate-1/2">
          <!-- the post -->
          <div
            class="absolute top-10 left-2.5 flex w-[220px] -rotate-5 flex-col gap-2.5 rounded-xl bg-card p-3 shadow-[0_1px_2px_rgb(0_0_0/.06),0_18px_36px_rgb(20_30_40/.12)]"
          >
            <div class="flex items-center gap-2">
              <span class="size-[22px] rounded-full bg-muted"></span>
              <span class="text-xs font-semibold">maya</span>
              <span class="text-[11px] text-muted-foreground">· 2h</span>
            </div>
            <StackLid layout={data.hero} {cuts} class="w-full" />
            <span class="text-xs text-muted-foreground">new laptop, who dis</span>
          </div>
          <!-- the share-link stamp, in our real link shape (/designs/<id>) instead of the mock's short-link shape -->
          <span
            class="absolute top-[250px] left-[190px] z-[3] rotate-3 rounded-[3px] bg-foreground px-3.5 py-2.5 font-mono text-[13px] font-semibold tracking-[.12em] whitespace-nowrap text-background shadow-[0_0_0_3px_var(--color-background),0_1px_1px_3px_rgb(20_30_40/.12),0_10px_20px_rgb(20_30_40/.14)]"
            >STACKSTICKERS.DEV/DESIGNS/MAYA-8F3K</span
          >
          <!-- the A4 print sheet with cut lines -->
          <div
            class="absolute top-5 left-[330px] grid aspect-[210/297] w-[190px] rotate-5 grid-cols-3 content-start gap-2.5 rounded-[3px] bg-card p-3.5 shadow-[0_1px_2px_rgb(0_0_0/.08),0_22px_40px_rgb(20_30_40/.14)]"
          >
            {#each SHEET as file (file)}
              <div
                class="grid aspect-square place-items-center rounded-[30%] border border-dashed border-muted-foreground/50"
              >
                <img src={lib(file)} alt="" class="size-[62%] object-contain drop-shadow-[0_1px_1px_rgb(0_0_0/.15)]" />
              </div>
            {/each}
          </div>
        </div>
      </div>
    </section>

    <!-- 4. The small stuff (visual only; controls are inert until wired) -->
    <section class="flex flex-col gap-3.5 border-t border-border px-4 pt-16 pb-10 sm:px-8 lg:pt-24">
      <span class={eyebrow}>Try it here</span>
      <h2 class="text-3xl leading-[1.05] sm:text-[40px] font-semibold tracking-[-.04em]">The small stuff, done right</h2>
    </section>
    <section class="grid grid-cols-1 border-t border-border lg:grid-cols-3">
      <!-- 01 · Shapes -->
      <div class="flex flex-col">
        <div class="flex h-80 flex-col items-center justify-center gap-[18px] bg-muted p-6" style={dots20}>
          <!-- same box as the mock's scatter item (14, 30, 140, art 1): a 168 px svg at (0, 16) -->
          <div class="relative h-[200px] w-[168px]" aria-hidden="true">
            <svg viewBox="-60 -60 120 120" class="absolute top-4 left-0 size-[168px] overflow-visible">
              <Sticker href={shapeDemo} cut={shapeCut} x={0} y={0} w={shapeAspect >= 1 ? 100 : 100 * shapeAspect} rot={-6} {shape} />
            </svg>
          </div>
          <div
            class="grid grid-cols-[repeat(3,76px)] gap-0.5 rounded-[9px] border border-border bg-muted p-0.5"
            role="radiogroup"
            aria-label="Sticker shape"
          >
            {#each SHAPES_DEMO as [id, label] (id)}
              <button
                type="button"
                role="radio"
                aria-checked={shape === id}
                class={cn(
                  "grid h-7 cursor-pointer place-items-center rounded-[7px] text-[12.5px] font-medium transition-colors",
                  shape === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
                onclick={() => (shape = id)}>{label}</button
              >
            {/each}
          </div>
        </div>
        <div class="flex flex-col gap-2.5 border-t border-border px-4 pt-7 pb-9 sm:px-8">
          <span class={eyebrow}>01 · Shapes</span>
          <h3 class="text-[22px] leading-[1.15] font-semibold tracking-[-.03em] text-balance">
            Die-cut, circle or square.
          </h3>
          <p class="text-[14.5px] leading-[1.55] text-pretty text-muted-foreground">
            Pick a backing for each sticker. The cut lines on your print sheet follow it.
          </p>
        </div>
      </div>

      <!-- 02 · Shuffle -->
      <div class="flex flex-col border-t border-border lg:border-t-0 lg:border-l">
        <div
          class="flex h-80 flex-col items-center justify-center gap-[22px] bg-muted p-6"
          style={dots20}
          role="group"
          aria-label="Shuffle demo"
          onpointerenter={() => (shuffleHover = true)}
          onpointerleave={() => (shuffleHover = false)}
        >
          <div class="w-[250px]"><StackLid layout={shuffled} {cuts} animate class="w-full" /></div>
          <button
            type="button"
            title="Shuffle the stickers · S"
            class="flex h-[34px] cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-card pr-2 pl-3.5 text-[13px] font-medium shadow-[0_1px_2px_rgb(0_0_0/.05)] transition-[translate,border-color] duration-150 hover:border-foreground/20 active:translate-y-px motion-reduce:transition-none"
            onclick={doShuffle}
          >
            Shuffle<span
              class="rounded-[5px] border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">S</span
            >
          </button>
        </div>
        <div class="flex flex-col gap-2.5 border-t border-border px-4 pt-7 pb-9 sm:px-8">
          <span class={eyebrow}>02 · Shuffle</span>
          <h3 class="text-[22px] leading-[1.15] font-semibold tracking-[-.03em] text-balance">
            Stuck on a layout? Press S.
          </h3>
          <p class="text-[14.5px] leading-[1.55] text-pretty text-muted-foreground">
            Every sticker gets a fresh spot and angle. Lock the ones you love and they stay put.
          </p>
        </div>
      </div>

      <!-- 03 · Layers -->
      <div class="flex flex-col border-t border-border lg:border-t-0 lg:border-l">
        <div
          class="flex h-80 flex-col items-center justify-center gap-[22px] bg-muted p-6"
          style={dots20}
        >
          <div class="relative h-[210px] w-[260px]">
            {#each LAY as [file, name, left, top, size, rot], i (file)}
              {@const href = lib(file)}
              {@const cut = cuts[href] ?? null}
              {@const aspect = cut?.aspect ?? 1}
              {@const px = size * 1.2}
              {@const isTop = i === topLayer}
              <!-- click lifts a sticker to the top: a touch bigger with a deeper shadow, like real vinyl -->
              <button
                type="button"
                aria-label="Bring {name} to the top"
                aria-pressed={isTop}
                class={cn(
                  "absolute cursor-pointer rounded-full [transition:scale_.35s_cubic-bezier(.2,1.5,.4,1),filter_.2s] motion-reduce:transition-none",
                  isTop ? "z-10 scale-[1.06] drop-shadow-[0_10px_14px_rgb(20_30_40/.16)]" : "hover:scale-[1.03]",
                )}
                style="left:{left + (size - px) / 2}px; top:{top + (size - px) / 2}px; width:{px}px; height:{px}px"
                onclick={() => (topLayer = i)}
              >
                <svg viewBox="-60 -60 120 120" class="size-full overflow-visible" aria-hidden="true">
                  <Sticker {href} {cut} x={0} y={0} w={aspect >= 1 ? 100 : 100 * aspect} {rot} />
                </svg>
              </button>
            {/each}
          </div>
          <span
            class="rounded-md border border-border bg-card px-2 py-1 font-mono text-[11.5px] whitespace-nowrap text-muted-foreground"
            >TOP LAYER · {LAY[topLayer][1].toUpperCase()}</span
          >
        </div>
        <div class="flex flex-col gap-2.5 border-t border-border px-4 pt-7 pb-9 sm:px-8">
          <span class={eyebrow}>03 · Layers</span>
          <h3 class="text-[22px] leading-[1.15] font-semibold tracking-[-.03em] text-balance">
            Overlap them like real vinyl.
          </h3>
          <p class="text-[14.5px] leading-[1.55] text-pretty text-muted-foreground">
            Click any sticker to bring it to the top. Stack, tuck and layer until it looks lived in.
          </p>
        </div>
      </div>
    </section>

    <!-- 5. Gallery teaser -->
    <section class="flex flex-col gap-9 border-t border-border px-4 pt-16 pb-16 sm:px-8 lg:pt-24 lg:pb-[104px]">
      <div class="flex flex-wrap items-end justify-between gap-6">
        <div class="flex flex-col gap-3.5">
          <span class={eyebrow}>Community</span>
          <h2 class="text-3xl leading-[1.05] sm:text-[40px] font-semibold tracking-[-.04em]">Designs from the community</h2>
        </div>
        <a href="/community" class={textLink}>See all designs<span class="text-[13px]">→</span></a>
      </div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {#each data.stacks as stack (stack.id)}
          <a
            href={data.teaserIsMock ? remixHref(stack) : `/designs/${stack.id}`}
            data-teaser
            class="overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/.04)] transition-colors duration-150 hover:border-foreground/20"
          >
            <div class="border-b border-border bg-muted px-5 py-6">
              <StackLid layout={stack.layout} {cuts} class="w-full" />
            </div>
            <div class="flex items-center justify-between gap-2 px-3.5 py-3">
              <span class="truncate text-[13.5px] font-medium">{stack.name}</span>
              <span class="flex-none text-[12.5px] text-muted-foreground">@{stack.by}</span>
            </div>
          </a>
        {/each}
      </div>
    </section>

    <!-- 6. CTA -->
    <section class="border-t border-border p-3">
      <div
        class="relative isolate flex flex-col items-center gap-5 overflow-hidden rounded-[18px] bg-stage px-4 pt-16 pb-16 text-center lg:px-0 lg:pt-28 lg:pb-30 shadow-[inset_0_0_0_1px_var(--color-border)]"
        style={dots18}
      >
        <HeroScatter items={CSTK} {cuts} float class="hidden lg:block" />
        <h2 class="relative text-4xl leading-none sm:text-6xl font-semibold tracking-[-.05em]">Start from scratch.</h2>
        <p class="relative text-[17px] leading-normal text-foreground/80">Pick a laptop, then drag your first sticker on.</p>
        <div class="relative flex flex-wrap justify-center gap-2.5 pt-2">
          <Button href="/editor" class={cta}>Open the editor</Button>
          <Button href="/community" variant="outline" class={cta}>Explore the community</Button>
        </div>
      </div>
    </section>
  </main>

  <!-- 7. Footer -->
  <SiteFooter />
</SiteFrame>

<style>
  /* headline sticker: a new logo lands from +18° and 1.4× with a bounce, fading in fast (spec: .42s / .12s) */
  :global(.ss-headline) {
    transform: rotate(var(--rot, 0deg));
    transform-origin: center;
    animation:
      ss-head-turn 0.42s cubic-bezier(0.2, 1.5, 0.4, 1) both,
      ss-head-fade 0.12s ease both;
  }
  @keyframes -global-ss-head-turn {
    from {
      transform: rotate(calc(var(--rot, 0deg) + 18deg)) scale(1.4);
    }
    to {
      transform: rotate(var(--rot, 0deg)) scale(1);
    }
  }
  @keyframes -global-ss-head-fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    :global(.ss-headline) {
      animation: none;
    }
  }
</style>
