<script lang="ts">
  import { siteConfig } from "@/config/site";
  /** Error page — 404 and anything else. Mirrors the "404" mock; decorative die-cut stickers drift around the number. */
  import { page } from "$app/state";
  import SiteChrome from "@/components/site/SiteChrome.svelte";
  import SiteFrame from "@/components/site/SiteFrame.svelte";
  import SiteFooter from "@/components/site/SiteFooter.svelte";
  import Sticker from "@/components/stack/Sticker.svelte";
  import { ERROR_STICKERS } from "$lib/site/error-stickers";
  import type { CutEntry } from "$lib/stickers/cuts-types";

  const is404 = $derived(page.status === 404);
  // page.data is empty when the error came from the layout load itself — fall back to rounded tiles then
  const errorCuts = $derived((page.data?.errorCuts ?? {}) as Record<string, CutEntry>);

  const dots =
    "background-image: radial-gradient(var(--color-border) 1px, transparent 1px); background-size: 18px 18px;";
  const primary =
    "flex h-[42px] items-center rounded-[10px] bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.14)] transition-colors hover:bg-primary/85";
  const secondary =
    "flex h-[42px] items-center rounded-[10px] border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted";
</script>

<svelte:head><title>{is404 ? "Page not found" : "Error"} · {siteConfig.name}</title></svelte:head>

<SiteChrome stars={page.data?.stars ?? null} />

<SiteFrame>
  <main
    class="relative flex flex-col items-center justify-center gap-5 overflow-hidden px-4 pt-16 pb-20 text-center sm:px-8 sm:pt-24 sm:pb-28"
    style={dots}
  >
    {#each ERROR_STICKERS as s (s.href)}
      <svg
        viewBox="-60 -60 120 120"
        aria-hidden="true"
        class="err-sticker absolute hidden cursor-grab overflow-visible transition-transform duration-[400ms] ease-[cubic-bezier(.2,1.6,.4,1)] hover:-translate-y-1.5 hover:scale-110 motion-reduce:transition-none sm:block"
        style="left:{s.left}%;top:{s.top}%;width:{s.size}px;height:{s.size}px;--rot:{s.rot}deg;--rot-h:{Math.round(s.rot * 0.3)}deg"
      >
        <Sticker href={s.href} cut={errorCuts[s.href] ?? null} x={0} y={0} w={100} />
      </svg>
    {/each}

    <h1 class="relative flex flex-col items-center gap-5">
      <span class="text-[120px] leading-[.85] font-semibold tracking-[-0.07em] text-foreground sm:text-[200px]">{page.status}</span>
      <span class="text-[24px] font-semibold sm:text-[28px] tracking-[-0.03em] text-foreground">
        {is404 ? "This page peeled off" : "Something went wrong"}
      </span>
    </h1>
    <p class="relative max-w-[420px] text-base leading-[1.55] text-pretty text-muted-foreground">
      {is404
        ? "The link might be old or mistyped. Try one of these instead."
        : (page.error?.message ?? "An unexpected error occurred. Try one of these instead.")}
    </p>
    <div class="relative flex flex-wrap justify-center gap-2 pt-2">
      <a href="/" class={primary}>Back to home</a>
      <a href="/stickers" class={secondary}>Browse stickers</a>
      <a href="/community" class={secondary}>Community</a>
    </div>
  </main>
  <SiteFooter />
</SiteFrame>

<style>
  /* rotation lives on the svg box (not the Sticker) so hover can straighten it; lift/scale come from Tailwind's translate/scale */
  .err-sticker {
    transform: translate(-50%, -50%) rotate(var(--rot));
  }
  .err-sticker:hover {
    transform: translate(-50%, -50%) rotate(var(--rot-h));
  }
</style>
