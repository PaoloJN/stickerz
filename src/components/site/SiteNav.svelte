<script lang="ts">
  import { siteConfig } from "@/config/site";
  /** 64 px sticky nav: brand / tabs / "My designs" + "Make a design". Active tab comes from the path. */
  import { page } from "$app/state";
  import { Button } from "@/components/ui/button";
  import * as Sheet from "@/components/ui/sheet";
  import { cn } from "@/utils/cn";
  import ThemeToggle from "@/components/site/ThemeToggle.svelte";
  import MenuIcon from "@lucide/svelte/icons/menu";

  const tabs = [
    { label: "Community", href: "/community" },
    { label: "Stickers", href: "/stickers" },
    { label: "Docs", href: "/docs" },
    { label: "Support", href: "/support", heart: true },
  ];

  const path = $derived(page.url.pathname);
  /** "My designs" is only the list itself; /designs/<id> is anyone's design, so it lights nothing */
  const isActive = (href: string) => {
    const p = path.replace(/\/$/, "") || "/";
    return href === "/designs" ? p === "/designs" : p === href || p.startsWith(href + "/");
  };
  // below md the tabs live in a drawer
  let menuOpen = $state(false);
</script>

<nav
  class="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur"
>
  <div
    class="mx-auto grid h-16 max-w-[1120px] grid-cols-[minmax(0,1fr)_auto] items-center border-border px-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:px-6 lg:border-x"
  >
    <a href="/" class="flex items-center gap-[9px] text-foreground">
      <img src="/icon.svg" alt="" class="size-5" />
      <span class="text-[15px] font-semibold tracking-[-.01em]"
        >{siteConfig.name}</span
      >
    </a>

    <div class="hidden gap-0.5 md:flex">
      {#each tabs as tab (tab.href)}
        {@const active = isActive(tab.href)}
        <a
          href={tab.href}
          aria-current={active ? "page" : undefined}
          class={cn(
            "flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[13.5px] transition-colors",
            active
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {#if tab.heart}<span class="text-xs text-red-500" aria-hidden="true"
              >♥</span
            >{/if}
          {tab.label}
        </a>
      {/each}
    </div>

    <div class="flex items-center justify-end gap-2.5">
      <ThemeToggle />
      <Button
        href="/designs"
        variant="ghost"
        size="sm"
        aria-current={isActive("/designs") ? "page" : undefined}
        class={cn("hidden h-[34px] text-muted-foreground hover:text-foreground md:inline-flex", isActive("/designs") && "bg-muted font-medium text-foreground")}
        >My designs</Button
      >
      <Button href="/editor" size="sm" class="h-[34px]">Make a design</Button>
      <Sheet.Root bind:open={menuOpen}>
        <Sheet.Trigger
          aria-label="Menu"
          class="grid size-10 place-items-center rounded-md text-foreground hover:bg-muted md:hidden"
        >
          <MenuIcon class="size-5" />
        </Sheet.Trigger>
        <Sheet.Content side="right" class="w-72 gap-1 p-4 pt-14">
          <Sheet.Title class="sr-only">Menu</Sheet.Title>
          {#each [...tabs, { label: "My designs", href: "/designs", heart: false }] as tab (tab.href)}
            {@const active = isActive(tab.href)}
            <a
              href={tab.href}
              onclick={() => (menuOpen = false)}
              aria-current={active ? "page" : undefined}
              class={cn(
                "flex h-11 items-center gap-2 rounded-lg px-3 text-[15px]",
                active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {#if tab.heart}<span class="text-xs text-red-500" aria-hidden="true">♥</span>{/if}
              {tab.label}
            </a>
          {/each}
        </Sheet.Content>
      </Sheet.Root>
    </div>
  </div>
</nav>
