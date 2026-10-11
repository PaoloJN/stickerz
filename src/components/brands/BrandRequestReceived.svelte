<script lang="ts">
  /** Success panel after a brand request is stored: reference + summary, and a way to start over. */
  import { Button } from "@/components/ui/button";
  import { MODES, needsLogos, PLANS, type SentRequest } from "$lib/brands";
  import { LOGO_BY_KEY } from "$lib/stickers/logos";
  import Check from "@lucide/svelte/icons/check";

  let { request, onreset }: { request: SentRequest; onreset: () => void } = $props();

  const rows = $derived.by(() => {
    const m = MODES[request.mode];
    const p = request.plan ? PLANS[request.plan] : null;
    const second: [string, string] = needsLogos(request.mode)
      ? ["Logos", request.logos.map((k) => LOGO_BY_KEY.get(k)?.title ?? k).join(", ")]
      : ["Plan", p ? `${p.name} · ${p.price} ${p.period}` : "Not sure yet"];
    return [["Request", m.title], second, ["Next", m.next]] as [string, string][];
  });

  let heading = $state<HTMLElement | null>(null);
  $effect(() => heading?.focus());
</script>

<div class="flex flex-col gap-[18px]">
  <span class="grid size-10 place-items-center rounded-xl bg-foreground text-background" aria-hidden="true">
    <Check class="size-5" />
  </span>
  <h2 bind:this={heading} tabindex="-1" class="text-[28px] font-semibold tracking-[-.035em] outline-none">Request received</h2>
  <p class="max-w-[460px] text-[15px] leading-relaxed text-pretty text-muted-foreground">
    We’ll reply to <span class="font-medium text-foreground">{request.email}</span> within 3 business days.
  </p>
  <div class="overflow-hidden rounded-xl border border-border bg-card">
    <div
      class="flex justify-between border-b border-border bg-muted px-4 py-3 font-mono text-[11px] tracking-[.06em] text-muted-foreground"
    >
      <span>REFERENCE</span><span class="text-foreground">{request.id}</span>
    </div>
    {#each rows as [k, v] (k)}
      <div class="flex justify-between gap-4 border-b border-border px-4 py-3 text-[13.5px] last:border-b-0">
        <span class="text-muted-foreground">{k}</span><span class="text-right font-medium">{v}</span>
      </div>
    {/each}
  </div>
  <div class="flex gap-2">
    <Button variant="outline" class="h-[38px] rounded-[9px] px-3.5 text-[13.5px]" onclick={onreset}>Send another request</Button>
  </div>
</div>
