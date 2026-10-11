<script lang="ts">
  /** Scissors / print shop / Cricut / Silhouette segmented control that switches the step list (matches the print kit's methods). */
  import { cn } from "@/utils/cn";

  type Method = "scissors" | "shop" | "cricut" | "sil";
  const METHODS: [Method, string][] = [
    ["scissors", "Scissors"],
    ["shop", "Print shop"],
    ["cricut", "Cricut"],
    ["sil", "Silhouette"],
  ];
  const STEPS: Record<Method, [string, string][]> = {
    scissors: [
      ["Export with “Scissors / craft knife”.", "Each sticker gets a thin grey cut line and its number."],
      ["Print on sticker paper or printable vinyl", "at 100%. Matte hides fingerprints; add a clear laminate sheet if the laptop travels a lot."],
      ["Cut along the grey line.", "Small scissors for curves, a craft knife and a cutting mat for inside corners. Leave the line on the waste side."],
      ["Keep the number nearby", "until it’s on the laptop: it tells you which stencil window or map row it belongs to."],
    ],
    shop: [
      ["Export with “Print shop”.", "The PDF has every sticker at true size with a magenta cut line on top: that’s the path shops cut along."],
      ["Upload the PDF,", "or turn on “One file per sticker” for shops that order each design separately (you get one SVG per sticker, numbered)."],
      ["Pick vinyl, matte or gloss.", "Ask for kiss cut to keep them on one backing sheet, or die cut for loose stickers."],
      ["Order one first.", "Check colors and edges before you order for the whole team."],
    ],
    cricut: [
      ["Export with “Cricut”.", "You get a ZIP: a PNG per sheet (Print Then Cut image), an SVG of its cut lines, and a PDF with the stencil and map."],
      ["In Design Space, upload the PNG", "as a Print Then Cut image, then set its width to the size in the file name (for example 171.5 mm) so every sticker stays true size."],
      ["Print on printable vinyl,", "then choose Printable Vinyl as the material and cut. Cricut adds its own registration box and cuts around each sticker."],
      ["The SVG cut file", "is there if you’d rather cut without printing, or want to check the outlines."],
    ],
    sil: [
      ["Export with “Silhouette”.", "You get the same ZIP: a PNG and an SVG cut file per sheet, plus the stencil and map PDF."],
      ["Open the PNG in Silhouette Studio", "and set its width to the size in the file name. With Designer Edition you can open the SVG cut file and use it as the cut lines instead of tracing."],
      ["Otherwise, trace the outer edge", "of each sticker, then turn on registration marks and print on sticker paper or printable vinyl."],
      ["Load the sheet and cut", "with a kiss-cut setting for your material, so the backing stays whole."],
    ],
  };

  let method = $state<Method>("scissors");
</script>

<div class="flex flex-col gap-4">
  <div role="group" aria-label="Print method" class="inline-flex self-start rounded-[10px] border border-border bg-muted p-[3px]">
    {#each METHODS as [id, label] (id)}
      <button
        type="button"
        aria-pressed={method === id}
        onclick={() => (method = id)}
        class={cn(
          "h-8 cursor-pointer rounded-[7px] px-3.5 text-[13.5px] font-medium transition-colors",
          method === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}>{label}</button
      >
    {/each}
  </div>
  <ol class="m-0 flex list-none flex-col overflow-hidden rounded-xl border border-border bg-card p-0">
    {#each STEPS[method] as [lead, rest], i (lead)}
      <li class="grid grid-cols-[28px_1fr] gap-3.5 border-b border-border px-[18px] py-4 last:border-b-0">
        <span class="pt-0.5 font-mono text-xs text-muted-foreground">{i + 1}</span>
        <span class="text-[15px] leading-[1.6] text-muted-foreground"><b class="font-semibold text-foreground">{lead}</b> {rest}</span>
      </li>
    {/each}
  </ol>
</div>
