<script lang="ts">
  /**
   * One sticker's page: the logo at true scale on a real MacBook (alone with a dimension line, or in a stack with the
   * stickers it's most often seen with), version / backing / size / laptop controls, add to the shared picks, print
   * just this one in the editor, then the community designs that use it, related stickers, FAQ and trademark notice.
   */
  import type { PageProps } from "./$types";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";
  import SiteChrome from "@/components/site/SiteChrome.svelte";
  import SiteFrame from "@/components/site/SiteFrame.svelte";
  import SiteFooter from "@/components/site/SiteFooter.svelte";
  import StackLid from "@/components/stack/StackLid.svelte";
  import Sticker from "@/components/stack/Sticker.svelte";
  import LaptopPreview from "@/components/sticker-page/LaptopPreview.svelte";
  import Segmented from "@/components/logos-page/Segmented.svelte";
  import { Button } from "@/components/ui/button";
  import { cn } from "@/utils/cn";
  import { siteConfig } from "@/config/site";
  import { getDevice, getFinish } from "$lib/stickers/devices";
  import { encodeLayout } from "$lib/stickers/codec";
  import { isKnownLogo } from "$lib/stickers/logos";
  import { buildLayout, remixHref } from "$lib/stacks/mock";
  import { formatCount, loadPicks, savePicks, togglePick } from "$lib/logos-page";
  import {
    BACKS,
    DEFAULT_SIZE,
    LAPTOPS,
    MAIN_SPOT,
    SIZES,
    STACK_SPOTS,
    artOf,
    companionSize,
    effectiveLook,
    printLayout,
    sizeHint,
    stickerBox,
    type Back,
  } from "$lib/sticker-page";
  import GitBranch from "@lucide/svelte/icons/git-branch";

  let { data }: PageProps = $props();

  const name = $derived(data.logo.title);
  const url = $derived(`${siteConfig.url}/stickers/${data.logo.key}`);
  const description = $derived(data.seo.description);

  let versionIdx = $state(0);
  let styleIdx = $state(0);
  let back = $state<Back>("diecut");
  let size = $state<number>(DEFAULT_SIZE);
  let laptop = $state(LAPTOPS[0].id);
  let finishId = $state("silver");
  let view = $state<"alone" | "stack">("alone");
  let picked = $state<string[]>([]);
  let color = $state("silver");
  let loaded = $state(false);

  // client-side navigation between sticker pages reuses this component: start each sticker fresh
  $effect.pre(() => {
    void data.logo.key;
    versionIdx = 0;
    back = "diecut";
  });

  const device = $derived(getDevice(laptop));
  const finish = $derived(getFinish(device, finishId));
  const laptopInfo = $derived(LAPTOPS.find((l) => l.id === laptop) ?? LAPTOPS[0]);
  /** the chosen style's versions (brands with alternate designs), else the logo's own */
  const versions = $derived(data.styles?.[styleIdx]?.versions ?? data.versions);
  const styleOptions = $derived((data.styles ?? []).map((st, i) => ({ id: i, label: st.label })));
  const styleId = $derived(styleIdx > 0 ? data.styles?.[styleIdx]?.id : undefined);
  const version = $derived(versions[Math.min(versionIdx, versions.length - 1)]);
  const look = $derived(effectiveLook(version, back));
  const href = $derived(artOf(version, look.theme));
  const aspect = $derived(data.cuts[href]?.aspect ?? 1);
  const box = $derived(stickerBox(version.variant, look.back, size, aspect));
  const stack = $derived(view === "stack");
  const spot = $derived(stack ? MAIN_SPOT.stack : MAIN_SPOT.alone);
  const main = $derived({
    href,
    variant: version.variant,
    back: look.back,
    theme: look.theme,
    w: box.w,
    h: box.h,
    x: (spot[0] / 100) * device.w,
    y: (spot[1] / 100) * device.h,
    rot: spot[2],
  });
  const companions = $derived(
    stack
      ? data.related.slice(0, STACK_SPOTS.length).map((r, i) => {
          const a = data.cuts[r.href]?.aspect ?? 1;
          const [x, y, rot] = STACK_SPOTS[i];
          return { key: r.key, href: r.href, x: (x / 100) * device.w, y: (y / 100) * device.h, rot, w: companionSize(i) * Math.min(1, a) };
        })
      : [],
  );

  const inDesign = $derived(picked.includes(data.logo.key));
  const picksHref = $derived(picked.length ? "/editor#l=" + encodeLayout(buildLayout(picked, color, 3)) : "/editor");
  const printHref = $derived(
    "/editor#l=" +
      encodeLayout(
        printLayout({ key: data.logo.key, style: styleId, variant: version.variant, theme: look.theme, back: look.back, size, aspect, model: device.id, color: finish.id, device }),
      ),
  );
  const metaLine = $derived(`${data.uses > 0 ? `IN ${formatCount(data.uses)} DESIGN${data.uses === 1 ? "" : "S"}` : data.logo.category.toUpperCase()} · FREE SVG`);

  onMount(() => {
    const saved = loadPicks(isKnownLogo);
    picked = saved.picked;
    color = saved.color;
    loaded = true;
  });
  $effect(() => {
    const value = { picked, color };
    if (loaded) savePicks(value);
  });

  function add() {
    const was = inDesign;
    picked = togglePick(picked, data.logo.key);
    if (was) toast(`${name} taken off your design`);
    else {
      const to = "/editor#l=" + encodeLayout(buildLayout(picked, color, 3));
      toast(`${name} added to your design`, { action: { label: "Open editor →", onClick: () => goto(to) } });
    }
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast(`Link copied · ${url.replace(/^https?:\/\//, "")}`);
    } catch {
      toast("Couldn’t copy the link");
    }
  }

  const eyebrow = "font-mono text-[11.5px] uppercase tracking-[.08em] text-muted-foreground";
  const h2 = "text-[22px] font-semibold tracking-[-.03em] text-foreground";
  const sideLink = "flex gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground";
  const dots = "background-image: radial-gradient(var(--color-border) 1px, transparent 1px); background-size: 16px 16px;";
</script>

<svelte:head>
  <title>{name} laptop sticker · {siteConfig.name}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={url} />
</svelte:head>

<SiteChrome stars={data.stars} />

<SiteFrame>
  <main>
    <nav aria-label="Breadcrumb" class="flex items-center gap-2 px-8 py-5 text-[13px] text-muted-foreground">
      <a href="/stickers" class="transition-colors hover:text-foreground">Stickers</a><span aria-hidden="true">/</span>
      <a href="/stickers?category={encodeURIComponent(data.logo.category)}" class="transition-colors hover:text-foreground">{data.logo.category}</a>
      <span aria-hidden="true">/</span>
      <span class="truncate text-foreground" aria-current="page">{name}</span>
    </nav>

    <section class="grid grid-cols-1 items-start gap-8 px-8 pb-12 lg:grid-cols-[minmax(0,1fr)_360px]">
      <!-- Preview -->
      <div class="flex min-w-0 flex-col gap-3">
        <div class="stage rounded-[20px] bg-muted px-6 pt-10 pb-12 ring-1 ring-border ring-inset sm:px-11 sm:pt-14 sm:pb-16">
          <LaptopPreview
            {device}
            {finish}
            {main}
            {companions}
            cuts={data.cuts}
            dim={!stack}
            label="{name} sticker, {Math.round(box.w)} mm wide, on a {finish.name} {device.name}"
          />
        </div>
        <div class="flex flex-wrap items-center gap-3 px-1">
          <Segmented
            options={[
              { id: "alone", label: "Just this" },
              { id: "stack", label: "In a stack" },
            ]}
            value={view}
            onchange={(v) => (view = v as "alone" | "stack")}
            label="Preview"
          />
          <span class="flex-1"></span>
          <div class="flex items-center gap-2" role="group" aria-label="Laptop finish">
            {#each device.finishes as f (f.id)}
              <button
                type="button"
                class={cn(
                  "size-5 cursor-pointer rounded-full border border-foreground/15 transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  f.id === finish.id && "ring-[1.5px] ring-foreground ring-offset-2 ring-offset-background",
                )}
                style:background-color={f.base}
                title={f.name}
                aria-label={f.name}
                aria-pressed={f.id === finish.id}
                onclick={() => (finishId = f.id)}
              ></button>
            {/each}
          </div>
          <span class="min-w-[76px] text-[12.5px] text-muted-foreground">{finish.name}</span>
        </div>
      </div>

      <!-- Details -->
      <div class="flex flex-col gap-[22px] pt-2">
        <div class="flex flex-col gap-3">
          <span class={eyebrow}>Sticker · {data.logo.category}</span>
          <h1 class="text-[42px] leading-[1.02] font-semibold tracking-[-.045em] text-foreground">{name} laptop sticker</h1>
          <p class="text-[15.5px] leading-[1.55] text-pretty text-muted-foreground">
            Put the {name} logo on your laptop at true size, then print it yourself or send it to a print shop.
          </p>
        </div>

        {#if styleOptions.length > 1}
          <div class="flex flex-col gap-2">
            <span class="text-[13px] font-medium text-foreground">Style</span>
            <Segmented options={styleOptions} value={styleIdx} onchange={(i) => (styleIdx = i)} label="Style" grow itemClass="h-[30px]" />
          </div>
        {/if}

        <div class="flex flex-col gap-2">
          <span class="text-[13px] font-medium text-foreground">Version</span>
          <div class="grid grid-cols-2 gap-1.5" role="group" aria-label="Version">
            {#each versions as v, i (v.label)}
              {@const on = version === v}
              <button
                type="button"
                aria-pressed={on}
                class={cn(
                  "flex h-[52px] min-w-0 cursor-pointer items-center gap-2.5 rounded-[10px] border bg-card pr-2.5 pl-1.5 text-left transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  on ? "border-foreground ring-1 ring-foreground" : "border-border hover:border-foreground/30",
                )}
                onclick={() => (versionIdx = i)}
              >
                <span class={cn("grid size-10 flex-none place-items-center rounded-lg", v.theme === "dark" ? "bg-neutral-900" : "bg-white ring-1 ring-border ring-inset")}>
                  <img src={artOf(v, v.theme)} alt="" class={cn("h-5 object-contain", v.variant === "wordmark" ? "w-8" : "w-5")} />
                </span>
                <span class="truncate text-[12.5px] font-medium text-foreground">{v.label}</span>
              </button>
            {/each}
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-[13px] font-medium text-foreground">Sticker</span>
          <Segmented options={BACKS} value={look.back} onchange={(b) => (back = b)} label="Sticker backing" grow itemClass="h-[30px]" />
        </div>

        <div class="flex flex-col gap-2">
          <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3">
            <div class="flex flex-col gap-2">
              <span class="text-[13px] font-medium text-foreground">Size</span>
              <Segmented
                options={SIZES.map((s) => ({ id: s, label: `${s} mm` }))}
                value={size}
                onchange={(s) => (size = s)}
                label="Sticker size"
                grow
                itemClass="h-[30px] px-2"
              />
            </div>
            <div class="flex flex-col gap-2">
              <span class="text-[13px] font-medium text-foreground">Laptop</span>
              <Segmented
                options={LAPTOPS.map((l) => ({ id: l.id, label: l.label }))}
                value={laptop}
                onchange={(l) => (laptop = l)}
                label="Laptop"
                grow
                itemClass="h-[30px] px-1"
              />
            </div>
          </div>
          <span class="text-[12.5px] text-muted-foreground" aria-live="polite">{sizeHint(size, laptopInfo.recommended, device.name)}</span>
        </div>

        <div class="flex flex-col gap-2">
          <Button variant={inDesign ? "outline" : "default"} class="h-12 w-full rounded-xl text-[15px]" aria-pressed={inDesign} onclick={add}>
            {inDesign ? "✓ In your design" : "Add to my design"}
          </Button>
          <div class="grid grid-cols-2 gap-2">
            <Button variant="outline" href={printHref} class="h-10 rounded-[10px]">Print just this</Button>
            <Button variant="outline" class="h-10 rounded-[10px]" onclick={copyLink}>Copy page link</Button>
          </div>
        </div>
        <span class="font-mono text-[11px] tracking-[.03em] text-muted-foreground">{metaLine}</span>
      </div>
    </section>

    <!-- Designs with this sticker -->
    <section class="flex flex-col gap-[18px] border-t border-border px-8 py-12">
      <div class="flex items-baseline gap-2.5">
        <h2 class={h2}>Designs with {name}</h2>
        <span class="font-mono text-[11.5px] text-muted-foreground uppercase">
          {data.designsAreMock ? (data.designs.length ? "Examples" : "") : `${data.designTotal} ${data.designTotal === 1 ? "design" : "designs"}`}
        </span>
        <span class="flex-1"></span>
        <a href="/community" class={sideLink}>See all in Community<span aria-hidden="true">→</span></a>
      </div>
      {#if data.designs.length}
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {#each data.designs as d (d.id)}
            <a
              href={data.designsAreMock ? remixHref(d) : `/designs/${d.id}`}
              class="flex flex-col overflow-hidden rounded-[14px] border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-foreground/20 hover:shadow-lg"
            >
              <div class="border-b border-border bg-muted px-6 py-[26px]" style={dots}>
                <StackLid layout={d.layout} cuts={data.cuts} class="w-full" />
              </div>
              <div class="flex items-center gap-2.5 px-3.5 py-3">
                <span class="grid size-[26px] flex-none place-items-center rounded-full bg-muted text-[11px] font-semibold text-foreground uppercase" aria-hidden="true">
                  {d.by.slice(0, 1)}
                </span>
                <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span class="truncate text-sm font-medium text-foreground">{d.name}</span>
                  <span class="truncate text-[12.5px] text-muted-foreground">@{d.by} · {d.count} stickers</span>
                </div>
                {#if !data.designsAreMock}
                  <span title="Remixes" class="flex items-center gap-1.5 font-mono text-[11.5px] text-muted-foreground">
                    <GitBranch class="size-3.5" aria-hidden="true" />{d.remix}
                  </span>
                {/if}
              </div>
            </a>
          {/each}
        </div>
      {:else}
        <div class="flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <span class="text-[17px] font-semibold tracking-[-.02em] text-foreground">No shared designs with {name} yet.</span>
          <span class="max-w-[420px] text-sm leading-normal text-pretty text-muted-foreground">Start one with this sticker, then share it to the community.</span>
          <Button href={printHref} variant="outline" class="mt-2">Open in editor</Button>
        </div>
      {/if}
    </section>

    <!-- Often stacked with -->
    {#if data.related.length}
      <section class="flex flex-col gap-[18px] border-t border-border px-8 py-12">
        <div class="flex items-baseline gap-2.5">
          <h2 class={h2}>Often stacked with {name}</h2>
          <span class="flex-1"></span>
          <a href="/stickers" class={sideLink}>All stickers<span aria-hidden="true">→</span></a>
        </div>
        <div class="sheet grid grid-cols-4 gap-1 rounded-2xl bg-muted p-2.5 ring-1 ring-border ring-inset sm:grid-cols-8">
          {#each data.related as r, i (r.key)}
            {@const a = data.cuts[r.href]?.aspect ?? 1}
            <a
              href="/stickers/{r.key}"
              class="rel flex min-w-0 flex-col items-center gap-1.5 rounded-xl px-1.5 pt-[18px] pb-3.5 transition-colors outline-none hover:bg-card/70 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <svg viewBox="-36 -36 72 72" class="size-[60px] overflow-visible" aria-hidden="true">
                <Sticker href={r.href} cut={data.cuts[r.href] ?? null} x={0} y={0} w={(a >= 1 ? 50 : 50 * a)} rot={((i * 37) % 13) - 6} />
              </svg>
              <span class="max-w-full truncate text-center text-[12.5px] font-medium text-foreground">{r.title}</span>
              <span class="max-w-full truncate font-mono text-[10px] text-muted-foreground uppercase">
                {r.n > 0 ? `In ${r.n} of ${data.designTotal}` : r.category}
              </span>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <!-- FAQ -->
    <section class="grid grid-cols-1 gap-8 border-t border-border px-8 py-12 md:grid-cols-3">
      <div class="flex flex-col gap-2">
        <h2 class="text-[15px] font-semibold tracking-[-.01em] text-foreground">What size should a {name} sticker be?</h2>
        <p class="text-sm leading-[1.6] text-pretty text-muted-foreground">
          About 55 mm on a 13″ MacBook Air. Go up to 65 mm on a 16″ Pro if it’s the main sticker on the laptop.
        </p>
      </div>
      <div class="flex flex-col gap-2">
        <h2 class="text-[15px] font-semibold tracking-[-.01em] text-foreground">How do I print it?</h2>
        <p class="text-sm leading-[1.6] text-pretty text-muted-foreground">
          Export the PDF for a print shop, or the SVG cut file for a Cricut. The
          <a href="/docs/print" class="text-foreground underline underline-offset-[3px]">printing guide</a> covers each step.
        </p>
      </div>
      <div class="flex flex-col gap-2">
        <h2 class="text-[15px] font-semibold tracking-[-.01em] text-foreground">Can I buy official {name} stickers here?</h2>
        <p class="text-sm leading-[1.6] text-pretty text-muted-foreground">
          No. We don’t sell stickers. You design the laptop here and print it yourself, for your own laptop.
        </p>
      </div>
    </section>

    <!-- Trademark notice -->
    <section class="grid grid-cols-1 items-center gap-3 border-t border-border bg-muted px-8 py-6 md:grid-cols-[160px_minmax(0,1fr)_auto] md:gap-6">
      <span class="font-mono text-[11px] tracking-[.08em] text-foreground">TRADEMARK NOTICE</span>
      <p class="text-[13.5px] leading-[1.6] text-pretty text-muted-foreground">
        {name} and its logo are trademarks of their owner. This page isn’t affiliated with or endorsed by {name}, and nothing here is for sale.
      </p>
      <div class="flex flex-wrap gap-4 text-[13px] whitespace-nowrap">
        <a href="/brands" class="font-medium text-foreground transition-opacity hover:opacity-70">Work at {name}? Get verified</a>
        <a href="/brands#remove" class="text-muted-foreground transition-colors hover:text-foreground">Request removal</a>
      </div>
    </section>
  </main>
  <SiteFooter />
</SiteFrame>

<style>
  .stage {
    background-image: radial-gradient(ellipse at 30% 0%, color-mix(in oklab, var(--color-background) 70%, transparent), transparent 60%);
  }
  .sheet {
    background-image: radial-gradient(color-mix(in oklab, var(--color-muted-foreground) 28%, transparent) 1px, transparent 1px);
    background-size: 14px 14px;
  }
</style>
