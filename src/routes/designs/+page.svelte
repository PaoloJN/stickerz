<script lang="ts">
  import { siteConfig } from "@/config/site";
  /**
   * "My stacks" — the signed-in user's saved stacks (screen 2a).
   * A grid of lid thumbnails: a dashed "New stack" tile first, then one card per
   * saved stack with its name, meta, visibility badge and a ⋯ actions menu.
   * Search and sort run client-side.
   */
  import SiteChrome from "@/components/site/SiteChrome.svelte";
  import SiteFrame from "@/components/site/SiteFrame.svelte";
  import SiteFooter from "@/components/site/SiteFooter.svelte";
  import StackLid from "@/components/stack/StackLid.svelte";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import * as DropdownMenu from "@/components/ui/dropdown-menu";
  import { invalidateAll, goto } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import type { GalleryStack } from "$lib/server/stacks";
  import { DESIGN_SORTS, filterDesigns, sortDesigns, type DesignSort } from "$lib/designs-page";

  import Search from "@lucide/svelte/icons/search";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import Plus from "@lucide/svelte/icons/plus";
  import MoreHorizontal from "@lucide/svelte/icons/more-horizontal";

  type Visibility = GalleryStack["vis"];

  let { data } = $props();
  const stacks = $derived(data.stacks as GalleryStack[]);

  let q = $state("");
  let sortBy = $state<DesignSort>("edited");
  const shown = $derived(sortDesigns(filterDesigns(stacks, q), sortBy));
  const sortLabel = $derived(DESIGN_SORTS.find((s) => s.id === sortBy)?.label);

  const json = { "content-type": "application/json" };

  async function del(s: GalleryStack) {
    if (!confirm(`Delete "${s.name}"?`)) return;
    const r = await fetch(`/api/stacks/${s.id}`, { method: "DELETE" });
    if (r.ok) {
      toast("Deleted");
      invalidateAll();
    } else toast.error("Couldn't delete");
  }
  async function setVis(s: GalleryStack, visibility: string) {
    const r = await fetch(`/api/stacks/${s.id}/visibility`, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ visibility }),
    });
    if (r.ok) {
      toast(`Now ${visibility}`);
      invalidateAll();
    } else toast.error("Couldn't update");
  }
  async function rename(s: GalleryStack) {
    const name = prompt("Rename design", s.name);
    if (name == null) return;
    const r = await fetch(`/api/stacks/${s.id}`, {
      method: "PUT",
      headers: json,
      body: JSON.stringify({ name }),
    });
    if (r.ok) invalidateAll();
    else toast.error("Couldn't rename");
  }
  async function duplicate(s: GalleryStack) {
    const r = await fetch(`/api/stacks`, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ name: s.name + " copy", layout: s.layout }),
    });
    if (r.ok) {
      toast("Remixed into a copy");
      invalidateAll();
    } else if (r.status === 429) toast.error((await r.json().catch(() => null))?.error ?? "Too many requests. Try again later.");
    else toast.error("Couldn't remix");
  }
  async function copyLink(s: GalleryStack) {
    await navigator.clipboard.writeText(location.origin + "/designs/" + s.id);
    toast("Link copied");
  }

  /** Visibility badge accent (public stays green; others lean on neutral tokens). */
  const badgeClass: Record<Visibility, string> = {
    Public: "bg-green-500/10 text-green-600 dark:text-green-400",
    Unlisted: "bg-muted text-muted-foreground",
    Private: "border border-border text-muted-foreground",
  };

  /** Dotted radial grid behind each lid. */
  const dotGrid =
    "background-image: radial-gradient(var(--color-border) 1px, transparent 1px); background-size: 16px 16px;";
</script>

<svelte:head><title>My designs · {siteConfig.name}</title></svelte:head>

<SiteChrome stars={data.stars} />

<SiteFrame>
<main class="flex flex-col gap-6 px-4 py-8 sm:px-10">
  <!-- Title + controls -->
  <div class="flex flex-wrap items-center gap-3">
    <div class="flex flex-1 items-baseline gap-2.5">
      <h1 class="text-2xl font-semibold tracking-tight text-foreground">My designs</h1>
      <span class="text-[13px] text-muted-foreground">{stacks.length} {stacks.length === 1 ? "design" : "designs"}</span>
    </div>

    <div class="relative w-full sm:w-60">
      <Search
        class="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="text"
        placeholder="Search designs"
        class="h-9 pl-8"
        aria-label="Search designs"
        bind:value={q}
      />
    </div>

    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        class="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
      >
        {sortLabel}
        <ChevronDown class="size-3 text-muted-foreground" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" class="w-40">
        {#each DESIGN_SORTS as o (o.id)}
          <DropdownMenu.Item
            class={sortBy === o.id ? "bg-muted" : ""}
            onSelect={() => (sortBy = o.id)}>{o.label}</DropdownMenu.Item
          >
        {/each}
      </DropdownMenu.Content>
    </DropdownMenu.Root>

    <Button href="/editor" class="h-9">
      <Plus class="size-3.5" />
      New design
    </Button>
  </div>

  <!-- Grid -->
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
    <!-- New stack tile -->
    <a
      href="/editor"
      class="flex min-h-[268px] flex-col items-center justify-center gap-2.5 rounded-[14px] border border-dashed border-border text-center transition-colors hover:border-foreground/30 hover:bg-muted/40"
    >
      <span
        class="grid size-10 place-items-center rounded-full border border-border bg-muted text-foreground"
      >
        <Plus class="size-4" />
      </span>
      <span class="flex flex-col gap-0.5">
        <span class="text-[13.5px] font-medium text-foreground">New design</span>
        <span class="text-xs text-muted-foreground">Blank or a starter pack</span>
      </span>
    </a>

    {#if stacks.length === 0}
      <a
        href="/editor"
        class="col-span-1 flex min-h-[268px] flex-col items-center justify-center gap-1.5 rounded-[14px] border border-border bg-card p-6 text-center transition-colors hover:bg-muted/40 sm:col-span-1 md:col-span-2 lg:col-span-3"
      >
        <span class="text-[13.5px] font-medium text-foreground">No designs yet — open the editor</span>
        <span class="text-xs text-muted-foreground">Saved designs will show up here.</span>
      </a>
    {/if}

    {#if stacks.length > 0 && shown.length === 0}
      <div
        class="col-span-1 flex min-h-[268px] flex-col items-center justify-center gap-3 rounded-[14px] border border-border bg-card p-6 text-center sm:col-span-1 md:col-span-2 lg:col-span-3"
      >
        <span class="text-[13.5px] font-medium text-foreground">No designs match “{q}”.</span>
        <Button variant="outline" size="sm" onclick={() => (q = "")}>Clear search</Button>
      </div>
    {/if}

    <!-- Design cards -->
    {#each shown as stack (stack.id)}
      <div
        class="group relative flex flex-col overflow-hidden rounded-[14px] border border-border bg-card"
      >
        <!-- Whole-card link sits behind the footer controls -->
        <a
          href="/editor?id={stack.id}"
          aria-label="Open {stack.name} in the editor"
          class="absolute inset-0 z-10 rounded-[14px] transition-colors group-hover:bg-foreground/[0.02]"
        ></a>

        <div class="border-b border-border bg-muted/20 px-[26px] py-[30px]" style={dotGrid}>
          <StackLid layout={stack.layout} cuts={data.cuts} class="w-full" />
        </div>

        <!-- pointer-events pass through to the link, except the more button -->
        <div class="pointer-events-none relative z-20 flex items-center gap-2.5 py-3 pr-2.5 pl-3.5">
          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="truncate text-[13.5px] font-medium text-foreground">{stack.name}</span>
            <span class="truncate text-xs text-muted-foreground">
              {stack.count} stickers · {stack.edited}
            </span>
          </div>

          <span
            class="rounded-full px-2 py-0.5 text-[11px] font-medium {badgeClass[stack.vis]}"
          >
            {stack.vis}
          </span>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              aria-label="More options"
              class="pointer-events-auto grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <MoreHorizontal class="size-[15px]" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end" class="w-44">
              <DropdownMenu.Item onSelect={() => goto(`/editor?id=${stack.id}`)}>Open</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => goto(`/designs/${stack.id}`)}>View page</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => duplicate(stack)}>Remix</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => rename(stack)}>Rename</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => copyLink(stack)}>Copy link</DropdownMenu.Item>
              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger>Visibility</DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent>
                  {#each ["private", "unlisted", "public"] as v (v)}
                    <DropdownMenu.Item class="capitalize" onSelect={() => setVis(stack, v)}>{v}</DropdownMenu.Item>
                  {/each}
                </DropdownMenu.SubContent>
              </DropdownMenu.Sub>
              <DropdownMenu.Separator />
              <DropdownMenu.Item class="text-red-500" onSelect={() => del(stack)}>Delete</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      </div>
    {/each}
  </div>
</main>
<SiteFooter />
</SiteFrame>
