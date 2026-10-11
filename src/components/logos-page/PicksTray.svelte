<script lang="ts">
  /** Floating tray at the bottom while anything is picked: the newest six stacked, the count, Clear, and the editor. */
  import { cn } from "@/utils/cn";
  import type { PageLogo } from "@/lib/logos-page";

  type Props = { picked: PageLogo[]; editorHref: string; onclear: () => void };
  let { picked, editorHref, onclear }: Props = $props();

  const shown = $derived(picked.slice(-6));
  const n = $derived(picked.length);
</script>

<div
  class={cn(
    "tray fixed bottom-5 left-1/2 z-40 -translate-x-1/2 flex items-center gap-3.5 rounded-[14px] bg-foreground py-[7px] pr-[7px] pl-2.5 text-background shadow-2xl",
    n ? "visible translate-y-0 opacity-100" : "invisible translate-y-[90px] opacity-0",
  )}
  role="region"
  aria-label="Your laptop"
  aria-hidden={!n}
>
  <div class="flex items-center pl-1" aria-hidden="true">
    {#each shown as logo, i (logo.key)}
      <span
        class="relative grid size-[30px] place-items-center rounded-full bg-white ring-2 ring-foreground"
        style:margin-left={i ? "-8px" : "0"}
        style:z-index={i}
      >
        <img src={logo.href} alt="" class="size-[18px] object-contain" />
      </span>
    {/each}
  </div>
  <span class="text-[13.5px] font-medium whitespace-nowrap" aria-live="polite">{n} on your laptop</span>
  <button
    type="button"
    class="cursor-pointer rounded px-1 text-[13px] text-background/60 transition-colors outline-none hover:text-background focus-visible:ring-2 focus-visible:ring-background/60"
    tabindex={n ? 0 : -1}
    onclick={onclear}
  >
    Clear
  </button>
  <a
    href={editorHref}
    class="flex h-9 items-center gap-1.5 rounded-[9px] bg-background px-3.5 text-[13.5px] font-medium whitespace-nowrap text-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-background/60"
    tabindex={n ? 0 : -1}
  >
    Open in editor<span class="text-xs" aria-hidden="true">→</span>
  </a>
</div>

<style>
  .tray {
    transition:
      translate 0.35s cubic-bezier(0.2, 1.3, 0.4, 1),
      opacity 0.2s,
      visibility 0.35s;
  }
  @media (prefers-reduced-motion: reduce) {
    .tray {
      transition: opacity 0.2s;
    }
  }
</style>
