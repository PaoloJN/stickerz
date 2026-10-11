<script lang="ts">
  import type { LayoutProps } from "./$types";

  import "@/styles/globals.css";

  import { ModeWatcher } from "mode-watcher";
  import Sonner from "@/components/ui/sonner/sonner.svelte";

  import { page } from "$app/state";

  let { children }: LayoutProps = $props();

  // the editor runs chrome-free and paints its own background; every other page brings its own chrome
  const isEditor = $derived(page.url.pathname.startsWith("/editor"));
</script>

<ModeWatcher />
<Sonner />
{#if isEditor}
  {@render children?.()}
{:else}
  <div class="flex min-h-dvh flex-col bg-background text-foreground">
    {@render children?.()}
  </div>
{/if}
