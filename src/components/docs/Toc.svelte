<script lang="ts">
  /** "On this page" list with scroll-spy: the last heading whose top is above ~160px is active. Client only. */
  import { onMount } from "svelte";
  import { cn } from "@/utils/cn";

  let { items }: { items: [string, string][] } = $props();

  let active = $state<string | null>(null);

  function update() {
    let cur: string | null = items[0]?.[0] ?? null;
    for (const [id] of items) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top < 160) cur = id;
    }
    active = cur;
  }

  function jump(e: Event, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" });
    history.replaceState(null, "", `#${id}`);
  }

  onMount(() => {
    // IntersectionObserver wakes us only when a heading crosses the top band; position is then recomputed.
    const io = new IntersectionObserver(update, { rootMargin: "0px 0px -80% 0px", threshold: [0, 1] });
    for (const [id] of items) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", update);
    };
  });
</script>

{#if items.length}
  <nav aria-label="On this page" class="flex flex-col gap-1">
    <span class="pb-2 font-mono text-[10.5px] tracking-[.08em] text-muted-foreground">ON THIS PAGE</span>
    {#each items as [id, label] (id)}
      <a
        href={`#${id}`}
        onclick={(e) => jump(e, id)}
        class={cn(
          "py-[5px] pl-3 text-[13px] leading-[1.4] shadow-[inset_1.5px_0_0_var(--border)] hover:text-foreground",
          active === id ? "font-medium text-foreground shadow-[inset_1.5px_0_0_var(--foreground)]" : "text-muted-foreground",
        )}>{label}</a
      >
    {/each}
  </nav>
{/if}
