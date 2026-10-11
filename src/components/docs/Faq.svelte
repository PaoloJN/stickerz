<script lang="ts">
  import * as Accordion from "@/components/ui/accordion";
  import { DEVICE_LIST } from "$lib/stickers/devices";
  import { REPO_URL } from "$lib/support";

  // laptop answer comes from the device registry so it never drifts
  const laptops = DEVICE_LIST.map((d) => d.name);
</script>

{#snippet item(id: string, q: string, body: import("svelte").Snippet)}
    <Accordion.Item value={id} class="border-b border-border">
      <Accordion.Trigger class="items-center px-0.5 py-[18px] text-base font-medium hover:no-underline">{q}</Accordion.Trigger>
      <Accordion.Content class="px-0.5 text-[15px] leading-[1.7] text-muted-foreground">
        <div class="max-w-[580px]">{@render body()}</div>
      </Accordion.Content>
    </Accordion.Item>
{/snippet}

{#snippet a1()}Yes. No account, no watermark, no paid tier. It’s open source and kept running by sponsors.{/snippet}
{#snippet a2()}No. You make the design and print it yourself or through a print shop. We never sell branded merchandise.{/snippet}
{#snippet a3()}Not with other companies’ logos. They’re trademarks. Personal use is the idea; selling needs permission from each brand.{/snippet}
{#snippet a4()}{laptops.join(", ")}. Other laptops are on the roadmap; <a href="{REPO_URL}/issues" class="underline underline-offset-3">vote for yours on GitHub</a>.{/snippet}
{#snippet a5()}In your browser, and on our server once you save or share a design (see <a href="/designs" class="underline underline-offset-3">My designs</a>). Share a link to keep a copy that survives clearing your history.{/snippet}
{#snippet a6()}Yes, usually within 48 hours. Use the <a href="/brands#remove" class="underline underline-offset-3">brand request form</a>. No lawyer needed.{/snippet}


<Accordion.Root type="single" value="free" class="rounded-none border-0 border-t border-border">
  {@render item("free", "Is it free?", a1)}
  {@render item("sell", "Do you sell stickers?", a2)}
  {@render item("resell", "Can I sell stickers I make here?", a3)}
  {@render item("laptops", "Which laptops are supported?", a4)}
  {@render item("saved", "Where are my designs saved?", a5)}
  {@render item("remove", "My company’s logo is here. Can you remove it?", a6)}
</Accordion.Root>
