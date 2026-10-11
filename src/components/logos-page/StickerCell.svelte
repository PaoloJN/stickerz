<script lang="ts">
  /**
   * One sticker on the sheet: a die-cut logo (see `.diecut` on the page) tilted by a per-key hash, lifting on hover.
   * The cell is a link to the sticker's own page; a plain click opens the quick-look dialog instead (⌘/Ctrl-click,
   * middle-click and friends follow the link). The corner button adds / removes the pick without opening anything.
   */
  import { cn } from "@/utils/cn";
  import { hashRot, useLabel, type PageLogo } from "@/lib/logos-page";
  import { stickerArtUrl } from "@/lib/stickers/sticker-art";

  type Props = { logo: PageLogo; picked: boolean; ontoggle: (key: string) => void; onopen: (key: string) => void };
  let { logo, picked, ontoggle, onopen }: Props = $props();

  const rot = $derived(hashRot(logo.key));
  // the finished sticker image (vinyl + shadow baked in); only non-library art falls back to the CSS die-cut filter
  const art = $derived(stickerArtUrl(logo.href));

  function open(e: MouseEvent) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onopen(logo.key);
  }
</script>

<div class="cell group relative min-w-0 rounded-xl transition-colors hover:bg-card/75 hover:ring-1 hover:ring-border hover:ring-inset">
  <a
    href="/stickers/{logo.key}"
    class="flex min-w-0 flex-col items-center gap-1.5 rounded-xl px-2.5 pt-[22px] pb-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
    style:--rot="{rot}deg"
    onclick={open}
  >
    <span class="relative size-[88px]" aria-hidden="true">
      <span class="sticker absolute inset-0 grid place-items-center">
        {#if art}
          <!-- 84%: the image includes the vinyl and shadow room, so the logo itself lands at ~72% like before -->
          <img src={art} alt="" loading="lazy" decoding="async" class="size-[84%] object-contain" />
        {:else}
          <img src={logo.href} alt="" loading="lazy" decoding="async" class="diecut size-[72%] object-contain" />
        {/if}
      </span>
    </span>
    <span class="max-w-full truncate text-center text-[13.5px] font-medium text-foreground">{logo.title}</span>
    <span class="max-w-full truncate font-mono text-[10.5px] tracking-[.03em] text-muted-foreground">{useLabel(logo)}</span>
  </a>
  <button
    type="button"
    class={cn(
      "absolute top-2 right-2 grid size-[26px] cursor-pointer place-items-center rounded-lg border leading-none font-medium shadow-sm transition-[opacity,transform,background-color] outline-none focus-visible:ring-2 focus-visible:ring-ring",
      picked
        ? "border-foreground bg-foreground text-xs text-background"
        : "scale-90 border-border bg-card text-base text-foreground opacity-0 group-focus-within:scale-100 group-focus-within:opacity-100 group-hover:scale-100 group-hover:opacity-100",
    )}
    aria-pressed={picked}
    aria-label={picked ? `Take ${logo.title} off your laptop` : `Add ${logo.title} to your laptop`}
    title={picked ? "Take off your laptop" : "Add to your laptop"}
    onclick={() => ontoggle(logo.key)}
  >
    {picked ? "✓" : "+"}
  </button>
</div>

<style>
  .sticker {
    transform: rotate(var(--rot));
    transition: transform 0.45s cubic-bezier(0.2, 1.5, 0.4, 1);
  }
  .cell:hover .sticker {
    transform: translateY(-4px) rotate(calc(var(--rot) * 0.3)) scale(1.08);
  }
  .cell:hover .sticker :global(.diecut) {
    --cut: 3.5px;
  }
  @media (prefers-reduced-motion: reduce) {
    .sticker {
      transition: none;
    }
  }
</style>
