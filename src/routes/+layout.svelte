<script lang="ts">
  import type { LayoutProps } from "./$types";

  // Styles:
  import "@/styles/globals.css";

  // Layout:
  import Header from "@/components/layout/header.svelte";

  // Providers:
  import { ModeWatcher } from "mode-watcher";
  import Sidebar from "@/components/layout/sidebar.svelte";
  import Sonner from "@/components/ui/sonner/sonner.svelte";

  import { page } from "$app/state";

  let { children }: LayoutProps = $props();

  const path = $derived(page.url.pathname);
  // the editor runs chrome-free; the Stickerz pages bring their own chrome (SiteChrome + SiteFooter)
  const isEditor = $derived(path.startsWith("/editor"));
  const isStackPage = $derived(
    ["/", "/stickers"].includes(path) ||
      [
        "/stickers/",
        "/community",
        "/designs",
        "/designs/",
        "/brands",
        "/docs",
        "/legal",
        "/support",
        "/dev/",
      ].some((p) => path.startsWith(p)),
  );
  // the error page renders its own chrome too
  const isError = $derived(page.error != null);
  // everything else (archived logo library, favorites, extensions, directory) uses Header + Sidebar
  const bare = $derived(isEditor || isStackPage || isError);
</script>

<ModeWatcher />
<Sonner />
{#if isEditor}
  {@render children?.()}
{:else if bare}
  <div class="flex min-h-dvh flex-col bg-background text-foreground">
    {@render children?.()}
  </div>
{:else}
  <Header />
  <Sidebar>
    {@render children?.()}
  </Sidebar>
{/if}
