<script lang="ts">
  /** The 1120 px centred column with 1 px side rules every marketing page sits in.
   *  It grows to fill the page (flex-1) so the side rules and footer reach the bottom on short pages. */
  import type { Snippet } from "svelte";
  import { cn } from "@/utils/cn";
  let { children, class: className }: { children: Snippet; class?: string } = $props();
</script>

<div class={cn("mx-auto flex w-full max-w-[1120px] flex-1 flex-col border-border lg:border-x", className)}>
  {@render children()}
</div>
