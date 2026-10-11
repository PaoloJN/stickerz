<script lang="ts">
  import { siteConfig } from "@/config/site";
  import type { PageProps } from "./$types";
  import SiteChrome from "@/components/site/SiteChrome.svelte";
  import SiteFrame from "@/components/site/SiteFrame.svelte";
  import SiteFooter from "@/components/site/SiteFooter.svelte";
  import StackLid from "@/components/stack/StackLid.svelte";
  import { Button } from "@/components/ui/button";
  import { remixHref } from "@/lib/stacks/mock";
  import { getDevice, getFinish } from "@/lib/stickers/devices";
  import { LOGO_BY_KEY, artFor } from "@/lib/stickers/logos";
  import GitBranchIcon from "@lucide/svelte/icons/git-branch";
  import Link2Icon from "@lucide/svelte/icons/link-2";

  let { data }: PageProps = $props();

  const stack = $derived(data.stack);
  const device = $derived(getDevice(stack.layout.laptop.model));
  const finish = $derived(getFinish(device, stack.layout.laptop.color));

  // One chip per known logo (first copy's art), with how many copies the design holds.
  type Chip = { key: string; title: string; src: string; count: number };
  const chips = $derived.by(() => {
    const byKey = new Map<string, Chip>();
    for (const s of stack.layout.stickers) {
      const seen = byKey.get(s.logo);
      if (seen) {
        seen.count++;
        continue;
      }
      const logo = LOGO_BY_KEY.get(s.logo);
      if (logo) byKey.set(s.logo, { key: s.logo, title: logo.title, src: artFor(logo, "icon", "light", s.style), count: 1 });
    }
    return [...byKey.values()];
  });
</script>

<svelte:head><title>{stack.name} · {siteConfig.name}</title></svelte:head>

<SiteChrome stars={data.stars} />

  <SiteFrame>
  <div class="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px]">
    <!-- LEFT: dotted canvas with the lid preview -->
    <div
      class="grid place-items-center bg-background p-4 sm:p-12"
      style="background-image: radial-gradient(var(--color-border) 1px, transparent 1px); background-size: 22px 22px;"
    >
      <div class="flex w-full max-w-[700px] flex-col items-center gap-4">
        <StackLid layout={stack.layout} cuts={data.cuts} class="w-full drop-shadow-xl" />
        <span class="font-mono text-[11px] text-muted-foreground">
          {device.name} / {Math.round(device.w)} × {Math.round(device.h)} mm / {finish.name}
        </span>
      </div>
    </div>

    <!-- RIGHT: read-only info panel -->
    <aside
      class="flex flex-col gap-6 border-t border-border bg-card px-4 py-8 sm:px-7 lg:border-t-0 lg:border-l"
    >
      <!-- Author + title -->
      <div class="flex flex-col gap-3.5">
        <div class="flex items-center gap-2.5 text-[12.5px] text-muted-foreground">
          <span
            class="grid size-[26px] place-items-center rounded-full bg-muted text-xs font-semibold text-foreground"
          >
            {stack.by[0]?.toUpperCase()}
          </span>
          <span class="font-medium text-foreground">{stack.by}</span>
          <span>· Shared {stack.edited}</span>
        </div>
        <div class="flex flex-col gap-1.5">
          <h1 class="text-[28px] font-semibold tracking-tight">{stack.name}</h1>
          <span class="text-[13px] text-muted-foreground">
            {stack.count} stickers · {device.name}
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-2.5">
        <div class="flex gap-2">
          <Button href={remixHref(stack)} onclick={() => navigator.sendBeacon?.(`/api/stacks/${stack.id}/remix`)} class="h-10 flex-1">
            <GitBranchIcon class="size-[15px]" />
            Remix this design
          </Button>
          <Button variant="outline" size="icon" class="size-10" aria-label="Copy link" title="Copy link">
            <Link2Icon class="size-[15px]" />
          </Button>
        </div>
        <span class="text-xs leading-relaxed text-muted-foreground">
          Opens a copy in the editor. {stack.by}'s design stays as it is.
        </span>
      </div>

      <div class="h-px bg-border"></div>

      <!-- Sticker list -->
      <div class="flex min-h-0 flex-col gap-2.5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground">What's on it</span>
          <span class="font-mono text-[11px] text-muted-foreground">{stack.count}</span>
        </div>
        <ul class="grid grid-cols-2 gap-x-2 gap-y-0.5">
          {#each chips as chip (chip.key)}
            <li class="flex h-9 items-center gap-2.5 rounded-lg px-1.5">
              <span class="grid size-[26px] flex-none place-items-center rounded-[7px] bg-white">
                <img src={chip.src} alt="" class="size-[15px] object-contain" />
              </span>
              <span class="truncate text-[13px] text-foreground">{chip.title}</span>
              {#if chip.count > 1}<span class="ml-auto flex-none font-mono text-[11px] text-muted-foreground">×{chip.count}</span>{/if}
            </li>
          {/each}
        </ul>
      </div>

      <!-- Footer -->
      <div class="mt-auto pt-2 text-xs text-muted-foreground">
        Logos belong to their owners ·
        <a
          href="/brands#remove"
          title="Ask for a logo to be removed"
          class="text-foreground/80 underline-offset-2 hover:underline">Report this design</a
        >
        ·
        <a
          href="mailto:{siteConfig.emails.legal}?subject=Report design {stack.id}"
          class="underline-offset-2 hover:text-foreground hover:underline">Email us</a
        >
      </div>
    </aside>
  </div>
  <SiteFooter />
  </SiteFrame>
