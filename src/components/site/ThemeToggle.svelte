<script lang="ts">
  import { toggleMode } from "mode-watcher";
  import { cn } from "@/utils/cn";
  import Contrast from "@/components/icons/contrast.svelte";

  let { class: className }: { class?: string } = $props();
</script>

<button
  type="button"
  onclick={toggleMode}
  title="Toggle theme"
  aria-label="Toggle theme"
  class={cn(
    "inline-flex size-8 flex-none items-center justify-center rounded-[7px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
    className,
  )}
>
  <Contrast class="size-4.5" />
</button>
