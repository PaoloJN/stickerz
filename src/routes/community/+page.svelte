<script lang="ts">
  import { siteConfig } from "@/config/site";
  /**
   * Gallery — public stacks people shared. Open one to see it, or remix it into your own.
   * Layout/spacing mirror the "3a Gallery" spec but use semantic tokens so it works in both themes.
   */
  import type { PageProps } from "./$types";
  import SiteChrome from "@/components/site/SiteChrome.svelte";
  import SiteFrame from "@/components/site/SiteFrame.svelte";
  import SiteFooter from "@/components/site/SiteFooter.svelte";
  import StackLid from "@/components/stack/StackLid.svelte";
  import { Button } from "@/components/ui/button";
  import { remixHref } from "@/lib/stacks/mock";
  import { cn } from "@/utils/cn";
  import GitBranch from "@lucide/svelte/icons/git-branch";

  let { data }: PageProps = $props();
  const galleryStacks = $derived(data.stacks);

  const sorts = [
    { id: "trending", label: "Trending" },
    { id: "newest", label: "Newest" },
    { id: "most-remixed", label: "Most remixed" },
  ] as const;

  const dots =
    "background-image: radial-gradient(var(--color-border) 1px, transparent 1px); background-size: 16px 16px;";
</script>

<svelte:head><title>Community · {siteConfig.name}</title></svelte:head>

<SiteChrome stars={data.stars} />

<SiteFrame>
<main class="mx-auto w-full max-w-[1280px] px-4 sm:px-10">
  <!-- Heading -->
  <div class="flex flex-col gap-2 pt-10 pb-6">
    <h1 class="text-[28px] font-semibold tracking-tight text-foreground">Community</h1>
    <p class="max-w-[520px] text-sm leading-relaxed text-muted-foreground">
      Designs people shared in public. Open one to see what's on it, or remix it into your own.
    </p>
  </div>

  <!-- Controls -->
  <div class="flex flex-wrap items-center gap-3 pb-6">
    <nav aria-label="Sort designs" class="flex gap-0.5 rounded-[9px] border border-border bg-muted/40 p-0.5">
      {#each sorts as s (s.id)}
        <a
          href="?sort={s.id}"
          data-sveltekit-noscroll
          aria-current={data.sort === s.id ? "page" : undefined}
          class={cn(
            "flex h-[30px] items-center rounded-[7px] px-3 text-[12.5px] font-medium transition-colors",
            data.sort === s.id
              ? "bg-muted text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {s.label}
        </a>
      {/each}
    </nav>
  </div>

  <!-- Grid -->
  <div class="grid grid-cols-1 gap-5 pb-14 sm:grid-cols-2 lg:grid-cols-3">
    {#each galleryStacks as stack (stack.id)}
      <article
        class="group relative overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-border/80"
      >
        <!-- whole card links to the stack page -->
        <a
          href="/designs/{stack.id}"
          class="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label={stack.name}
        ></a>

        <!-- Lid on dotted grid -->
        <div class="relative border-b border-border bg-muted/20 px-8 py-9" style={dots}>
          <StackLid layout={stack.layout} cuts={data.cuts} class="w-full" />

          <!-- hover actions (nice-to-have) -->
          <div
            class="absolute right-3 bottom-3 z-20 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <Button href="/designs/{stack.id}" variant="outline" size="sm" class="h-8">View</Button>
            <Button href={remixHref(stack)} onclick={() => navigator.sendBeacon?.(`/api/stacks/${stack.id}/remix`)} size="sm" class="h-8 gap-1.5">
              <GitBranch class="size-3.5" />
              Remix
            </Button>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center gap-3 px-4 py-3.5">
          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="truncate text-sm font-medium text-foreground">{stack.name}</span>
            <span class="truncate text-xs text-muted-foreground">
              by {stack.by} · {stack.count} stickers
            </span>
          </div>
          <span
            title="Remixes"
            class="flex items-center gap-1.5 font-mono text-[11.5px] text-muted-foreground"
          >
            <GitBranch class="size-3.5" />
            {stack.remix}
          </span>
        </div>
      </article>
    {/each}
  </div>
</main>
<SiteFooter />
</SiteFrame>
