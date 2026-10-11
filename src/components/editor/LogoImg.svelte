<script lang="ts">
  import { cn } from "@/utils/cn";

  /** Shows the art drawn for the current color mode. */
  let { art, class: className }: { art: { light: string; dark?: string }; class?: string } = $props();
</script>

{#if art.dark}
  <img src={art.light} alt="" loading="lazy" draggable="false" class={cn("object-contain dark:hidden", className)} />
  <img src={art.dark} alt="" loading="lazy" draggable="false" class={cn("hidden object-contain dark:block", className)} />
{:else}
  <img src={art.light} alt="" loading="lazy" draggable="false" class={cn("object-contain", className)} />
{/if}
