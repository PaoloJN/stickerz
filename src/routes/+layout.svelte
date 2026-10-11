<script lang="ts">
  import type { LayoutProps } from "./$types";

  import "@/styles/globals.css";

  import { ModeWatcher } from "mode-watcher";
  import Sonner from "@/components/ui/sonner/sonner.svelte";

  import { page } from "$app/state";
  import { siteConfig } from "@/config/site";
  import { resolveSeo } from "$lib/seo";

  let { children }: LayoutProps = $props();

  // social tags live here, once, fed by whatever `seo` the page's load returns (see $lib/seo)
  const seo = $derived(resolveSeo(page.data.seo));
  const canonical = $derived(`${siteConfig.url}${page.url.pathname === "/" ? "" : page.url.pathname}`);

  // the editor runs chrome-free and paints its own background; every other page brings its own chrome
  const isEditor = $derived(page.url.pathname.startsWith("/editor"));
</script>

<svelte:head>
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content={siteConfig.name} />
  <meta property="og:title" content={seo.title} />
  <meta property="og:description" content={seo.description} />
  <meta property="og:url" content={canonical} />
  <meta property="og:image" content={seo.image} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content={seo.imageAlt} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={seo.title} />
  <meta name="twitter:description" content={seo.description} />
  <meta name="twitter:image" content={seo.image} />
  <meta name="twitter:image:alt" content={seo.imageAlt} />
  <meta name="twitter:creator" content="@{siteConfig.author.x}" />
</svelte:head>

<ModeWatcher />
<Sonner />
{#if isEditor}
  {@render children?.()}
{:else}
  <div class="flex min-h-dvh flex-col bg-background text-foreground">
    {@render children?.()}
  </div>
{/if}
