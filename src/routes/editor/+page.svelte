<script lang="ts">
  import { onMount } from "svelte";
  import EditorShell from "@/components/editor/EditorShell.svelte";
  import { Button } from "@/components/ui/button";
  import { siteConfig } from "@/config/site";

  // phones get a notice over the editor (SSR still renders the shell)
  let small = $state(false);
  onMount(() => {
    const mq = matchMedia("(max-width: 767px)");
    const update = () => (small = mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  });
</script>

<svelte:head><title>Editor · {siteConfig.name}</title></svelte:head>

<EditorShell />

{#if small}
  <div class="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-background px-6 text-center text-foreground">
    <span class="flex items-center gap-[9px]">
      <img src="/icon.svg" alt="" class="size-6" />
      <span class="text-lg font-semibold tracking-[-.01em]">Stickerz</span>
    </span>
    <p class="max-w-[280px] text-[17px] leading-normal text-pretty">The editor works best on a laptop.</p>
    <div class="flex flex-wrap justify-center gap-2.5">
      <Button href="/" class="h-10">Back to home</Button>
      <Button href="/community" variant="outline" class="h-10">Browse designs</Button>
    </div>
  </div>
{/if}
