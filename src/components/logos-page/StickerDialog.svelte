<script lang="ts">
  /**
   * Quick look at one sticker (shadcn Dialog: focus trap, Esc, overlay click). Left: the sticker big, or at true scale
   * on a MacBook Air 13″ in its real finishes; ←/→ step through the current list. Right: logo (Icon / Full logo) and
   * theme (Light / Dark), shape + size preview controls, add / remove the pick, download / copy the chosen version's SVG,
   * related stickers, and the link to the full page.
   */
  import * as Dialog from "@/components/ui/dialog";
  import { Button } from "@/components/ui/button";
  import Segmented from "./Segmented.svelte";
  import { cn } from "@/utils/cn";
  import { oftenWith, pageArt, useLabel, type ArtTheme, type LogoKind, type PageLogo } from "@/lib/logos-page";
  import { getDevice } from "$lib/stickers/devices";
  import { stickerArtUrl } from "$lib/stickers/sticker-art";

  type Shape = "die" | "circle" | "square";
  type Props = {
    logo: PageLogo | null;
    /** "n / total" in the current list */
    position: string;
    all: PageLogo[];
    picked: boolean;
    ontoggle: (key: string) => void;
    onopen: (key: string) => void;
    onstep: (dir: 1 | -1) => void;
    onclose: () => void;
  };
  let { logo, position, all, picked, ontoggle, onopen, onstep, onclose }: Props = $props();

  const device = getDevice("air13");
  const SHAPES: { id: Shape; label: string }[] = [
    { id: "die", label: "Die-cut" },
    { id: "circle", label: "Circle" },
    { id: "square", label: "Square" },
  ];
  const SIZES = [
    { id: 2, label: "2″" },
    { id: 3, label: "3″" },
    { id: 4, label: "4″" },
  ];
  const VIEWS = [
    { id: "sheet", label: "Sticker" },
    { id: "laptop", label: "On a laptop" },
  ] as const;

  let view = $state<"sheet" | "laptop">("sheet");
  let shape = $state<Shape>("die");
  let size = $state(3);
  let finishId = $state("silver");
  let styleId = $state<string | undefined>(undefined);
  let kind = $state<LogoKind>("icon");
  let theme = $state<ArtTheme>("light");
  let copied = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  const finish = $derived(device.finishes.find((f) => f.id === finishId) ?? device.finishes[0]);
  const related = $derived(logo ? oftenWith(logo, all) : []);
  // every option stays visible so the panel keeps one shape; ones the library doesn't have are disabled
  const STYLES = $derived((logo?.styles ?? []).map((st) => ({ id: st.id, label: st.label })));
  const style = $derived(STYLES.length > 1 ? (styleId ?? STYLES[0].id) : undefined);
  const hasFull = $derived(!!logo && pageArt(logo, "wordmark", "light", style) !== null);
  const hasDark = $derived(!!logo && pageArt(logo, hasFull ? kind : "icon", "dark", style) !== null);
  const KINDS = $derived([
    { id: "icon" as const, label: "Icon" },
    { id: "wordmark" as const, label: "Full logo", disabled: !hasFull, title: hasFull ? undefined : "No full logo for this one" },
  ]);
  const THEMES = $derived([
    { id: "light" as const, label: "Light" },
    { id: "dark" as const, label: "Dark", disabled: !hasDark, title: hasDark ? undefined : "No dark version of this logo" },
  ]);
  /** the chosen art; dark-theme art is light-coloured, so it goes on dark vinyl */
  const onDark = $derived(theme === "dark" && hasDark);
  const src = $derived((logo && (pageArt(logo, hasFull ? kind : "icon", onDark ? "dark" : "light", style) ?? logo.href)) ?? "");
  const fileSuffix = $derived(
    `${style && style !== STYLES[0]?.id ? `-${style}` : ""}${kind === "wordmark" && hasFull ? "-full" : ""}${onDark ? "-dark" : ""}`,
  );
  // big preview: 168 / 216 / 264 px for 2″ / 3″ / 4″ (the design's 72 + 48·in)
  const bigPx = $derived(72 + size * 48);
  // true scale on the lid: sticker inches over the lid's width
  const onLidPct = $derived(((size * 25.4) / device.w) * 100);

  $effect(() => {
    // a fresh sticker starts on its icon and resets the copy confirmation
    void logo?.key;
    styleId = undefined;
    kind = "icon";
    theme = "light";
    copied = false;
  });

  async function copySvg() {
    if (!logo) return;
    try {
      const text = await (await fetch(src)).text();
      await navigator.clipboard.writeText(text);
      copied = true;
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => (copied = false), 1400);
    } catch {
      // clipboard or network unavailable: leave the label as is
    }
  }

  function onkeydown(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      onstep(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      onstep(-1);
    }
  }

  const eyebrow = "font-mono text-[11px] tracking-[.08em] uppercase text-muted-foreground";
  const navBtn =
    "grid size-[34px] cursor-pointer place-items-center rounded-[9px] border border-border bg-card text-sm text-foreground transition-colors hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring";
</script>

{#snippet art(px: string, cut: number)}
  {#if logo}
    <span
      class={cn(
        "look grid place-items-center",
        shape !== "die" && (onDark ? "bg-[#121212] shadow-md" : "bg-white shadow-md"),
        shape === "circle" && "rounded-full",
        shape === "square" && "rounded-[24%]",
      )}
      style:width={px}
      style:aspect-ratio="1"
    >
      {#if shape === "die" && stickerArtUrl(src, onDark)}
        <!-- the precompiled die-cut sticker: the image carries vinyl + shadow, so it's a bit larger than the bare logo -->
        <img src={stickerArtUrl(src, onDark)} alt="" class="size-[117%] max-w-none object-contain" />
      {:else}
        <img
          {src}
          alt=""
          class={cn("object-contain", shape === "die" ? "diecut size-full" : "size-[60%]")}
          style:--cut="{cut}px"
        />
      {/if}
    </span>
  {/if}
{/snippet}

<Dialog.Root open={logo !== null} onOpenChange={(o) => !o && onclose()}>
  <Dialog.Content
    showCloseButton={false}
    class="grid max-h-[calc(100dvh-48px)] max-w-[calc(100%-2rem)] gap-0 overflow-y-auto rounded-[18px] border-border bg-card p-0 shadow-2xl sm:max-w-[900px] md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:overflow-hidden dark:border-border dark:bg-card"
    {onkeydown}
  >
    {#if logo}
      <!-- Preview -->
      <div class="dots relative flex flex-col border-b border-border bg-muted md:border-r md:border-b-0">
        <div class="flex items-center gap-2 px-4 py-3.5">
          <Segmented options={VIEWS} value={view} onchange={(v) => (view = v)} label="Preview" class="bg-background/60" />
          <span class="flex-1"></span>
          {#if view === "laptop"}
            <div class="flex items-center gap-1.5" role="group" aria-label="Laptop finish">
              {#each device.finishes as f (f.id)}
                <button
                  type="button"
                  class={cn(
                    "size-[18px] cursor-pointer rounded-full border border-foreground/15 transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    f.id === finish.id && "ring-[1.5px] ring-foreground ring-offset-2 ring-offset-muted",
                  )}
                  style:background-color={f.base}
                  title={f.name}
                  aria-label={f.name}
                  aria-pressed={f.id === finish.id}
                  onclick={() => (finishId = f.id)}
                ></button>
              {/each}
            </div>
          {/if}
        </div>

        <div class="grid min-h-[300px] flex-1 place-items-center px-9 pt-2 pb-16 md:min-h-[380px]">
          {#if view === "sheet"}
            {@render art(`${bigPx}px`, 7)}
          {:else}
            <div class="flex w-full flex-col gap-3">
              <div
                class={cn("lid relative grid w-full place-items-center overflow-hidden rounded-[3.6%/5.1%]", finish.dark && "lid-dark")}
                style:--base={finish.base}
                style:aspect-ratio="{device.w} / {device.h}"
                role="img"
                aria-label="{logo.title} sticker, {size} inches, on a {finish.name} {device.name}"
              >
                {@render art(`${onLidPct}%`, 2)}
              </div>
              <span class="text-center font-mono text-[11px] tracking-[.04em] text-muted-foreground uppercase">
                {size}″ on a {device.name} · {finish.name}
              </span>
            </div>
          {/if}
        </div>

        <div class="absolute bottom-3.5 left-3.5 flex gap-1.5">
          <button type="button" class={navBtn} title="Previous (←)" aria-label="Previous sticker" onclick={() => onstep(-1)}>←</button>
          <button type="button" class={navBtn} title="Next (→)" aria-label="Next sticker" onclick={() => onstep(1)}>→</button>
        </div>
        <span class="absolute right-4 bottom-6 font-mono text-[11px] text-muted-foreground" aria-live="polite">{position}</span>
      </div>

      <!-- Details -->
      <div class="flex min-w-0 flex-col">
        <div class="flex items-start gap-3 px-6 pt-6">
          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <span class={eyebrow}>{logo.category}{logo.uses > 0 ? ` · ${useLabel(logo)}` : ""}</span>
            <Dialog.Title class="text-[32px] leading-[1.05] font-semibold tracking-[-.04em] text-foreground">{logo.title}</Dialog.Title>
          </div>
          <Dialog.Close
            class="grid size-8 flex-none cursor-pointer place-items-center rounded-lg text-[15px] text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            title="Close (Esc)"
            aria-label="Close"
          >
            ✕
          </Dialog.Close>
        </div>
        <Dialog.Description class="sr-only">Preview the {logo.title} sticker, add it to your laptop, or download its SVG.</Dialog.Description>

        <div class="flex flex-col gap-[18px] px-6 py-[22px]">
          {#if STYLES.length > 1}
            <div class="flex flex-col gap-2">
              <span class="text-[13px] font-medium text-foreground">Style</span>
              <Segmented options={STYLES} value={style ?? ""} onchange={(id) => (styleId = id)} label="Style" grow />
            </div>
          {/if}
          <div class="grid grid-cols-2 gap-3">
            <div class="flex min-w-0 flex-col gap-2">
              <span class="text-[13px] font-medium text-foreground">Logo</span>
              <Segmented options={KINDS} value={kind} onchange={(k) => (kind = k)} label="Logo" grow />
            </div>
            <div class="flex min-w-0 flex-col gap-2">
              <span class="text-[13px] font-medium text-foreground">Theme</span>
              <Segmented options={THEMES} value={onDark ? "dark" : "light"} onchange={(t) => (theme = t)} label="Theme" grow />
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <span class="text-[13px] font-medium text-foreground">Sticker</span>
            <Segmented options={SHAPES} value={shape} onchange={(s) => (shape = s)} label="Sticker shape" grow />
          </div>
          <div class="flex flex-col gap-2">
            <span class="text-[13px] font-medium text-foreground">Size</span>
            <Segmented options={SIZES} value={size} onchange={(s) => (size = s)} label="Sticker size" grow />
          </div>
          <div class="flex flex-col gap-2 pt-1">
            <Button
              variant={picked ? "outline" : "default"}
              class="h-11 w-full rounded-[10px] text-[14.5px]"
              aria-pressed={picked}
              onclick={() => ontoggle(logo.key)}
            >
              {picked ? "✓ On your laptop · Remove" : "Add to your laptop"}
            </Button>
            <div class="grid grid-cols-2 gap-2">
              <Button variant="outline" href={src} download="{logo.key}{fileSuffix}.svg" class="h-10 rounded-[10px]">Download SVG</Button>
              <Button variant="outline" class="h-10 rounded-[10px]" onclick={copySvg}>
                <span aria-live="polite">{copied ? "Copied ✓" : "Copy SVG"}</span>
              </Button>
            </div>
          </div>
        </div>

        {#if related.length}
          <div class="mt-auto flex flex-col gap-2.5 border-t border-border px-6 py-4">
            <span class="text-[13px] font-medium text-foreground">Often stacked with</span>
            <div class="flex flex-wrap gap-1.5">
              {#each related as r (r.key)}
                <button
                  type="button"
                  class="flex h-[30px] cursor-pointer items-center gap-[7px] rounded-lg border border-border bg-muted pr-2.5 pl-[7px] text-[12.5px] text-foreground transition-colors outline-none hover:border-foreground/25 hover:bg-card focus-visible:ring-2 focus-visible:ring-ring"
                  onclick={() => onopen(r.key)}
                >
                  <img src={r.href} alt="" class="size-[15px] object-contain dark:hidden" />
                  <img src={r.hrefDark} alt="" class="hidden size-[15px] object-contain dark:block" />
                  {r.title}
                </button>
              {/each}
            </div>
          </div>
        {/if}
        <div class={cn("flex items-center gap-3 border-t border-border bg-background px-6 py-3.5 text-[13px]", !related.length && "mt-auto")}>
          <span class="font-mono text-[11px] text-muted-foreground">FREE SVG</span>
          <span class="flex-1"></span>
          <a href="/stickers/{logo.key}" class="flex gap-1.5 font-medium text-foreground transition-opacity hover:opacity-70">
            View full page<span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<style>
  .dots {
    background-image: radial-gradient(color-mix(in oklab, var(--color-muted-foreground) 28%, transparent) 1px, transparent 1px);
    background-size: 14px 14px;
  }
  .look {
    transform: rotate(-4deg);
    transition:
      width 0.3s cubic-bezier(0.3, 1.25, 0.4, 1),
      border-radius 0.25s;
  }
  /* finish: a soft top-left highlight over the body colour, darker toward the hinge, with a hairline edge */
  .lid {
    background:
      radial-gradient(120% 90% at 18% 8%, color-mix(in oklab, white 45%, transparent), transparent 60%),
      linear-gradient(160deg, var(--base) 0%, color-mix(in oklab, var(--base) 88%, black) 100%);
    box-shadow:
      inset 0 0 0 1px color-mix(in oklab, var(--base) 80%, black),
      inset 0 1px 0 color-mix(in oklab, white 50%, transparent),
      0 2px 6px rgb(0 0 0 / 0.18),
      0 18px 36px rgb(20 30 40 / 0.14);
    transition: background 0.3s;
  }
  .lid-dark {
    background:
      radial-gradient(120% 90% at 18% 8%, color-mix(in oklab, white 12%, transparent), transparent 60%),
      linear-gradient(160deg, var(--base) 0%, color-mix(in oklab, var(--base) 80%, black) 100%);
  }
  @media (prefers-reduced-motion: reduce) {
    .look,
    .lid {
      transition: none;
    }
  }
</style>
