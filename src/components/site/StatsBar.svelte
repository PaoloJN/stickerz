<script lang="ts">
  /** Release note + live "Star on GitHub" count. The count chip hides when the count is unknown. */
  import { REPO_URL } from "$lib/support";
  import { formatCount } from "$lib/format";

  let { stars = null }: { stars?: number | null } = $props();

  const chip =
    "rounded-[5px] border border-border bg-card font-mono text-foreground";
</script>

<div class="border-b border-border bg-muted">
  <div
    class="mx-auto flex h-[38px] max-w-[1120px] items-center gap-3.5 border-border px-4 text-[13px] sm:px-6 lg:border-x text-muted-foreground"
  >
    <a
      href="{REPO_URL}/releases"
      class="{chip} px-1.5 py-0.5 text-[11px] font-medium hover:opacity-70"
      >v3.0</a
    >
    <a
      href="{REPO_URL}/releases"
      class="hidden items-center gap-1.5 text-foreground hover:opacity-70 md:flex"
      >Light mode and print sheets are here<span
        class="text-xs"
        aria-hidden="true">→</span
      ></a
    >
    <div class="flex-1"></div>
    <a
      href={REPO_URL}
      class="flex items-center gap-[7px] hover:text-foreground"
    >
      <img
        src="/library/github_light.svg"
        alt=""
        class="size-3.5 dark:invert"
      />
      Star on GitHub
      {#if stars != null}
        <span class="{chip} px-1.5 py-px text-[11.5px]"
          >{formatCount(stars)}</span
        >
      {/if}
    </a>
  </div>
</div>
