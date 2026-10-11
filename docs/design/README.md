# Design reference (Claude Design export)

Source: Claude Design project `7e6fff65-fc26-491b-9084-807a736e8b47`, exported 2026-10-07.

Each `*.dc.html` is a self-contained mock: static markup with inline styles, a `style-hover=` attribute for hover states, `<sc-for>` / `<sc-if>` template tags, and a `<script type="text/x-dc">` block holding the mock's data and interaction logic (`renderVals()` returns what the template binds to). Read the markup for layout/spacing/copy and the script for data lists (logo sets, sticker positions, plan copy, step text).

Design tokens used by every mock (map them to our semantic Tailwind tokens, never hardcode):

| Mock value | Ours |
| --- | --- |
| page bg `#fafaf9` | `bg-background` |
| text `#111214` | `text-foreground` |
| muted text `#5f6166`, `#8a8b8f` | `text-muted-foreground` |
| body copy `#3d3f44` | `text-foreground/80` |
| rules `#e6e6e3`, `#efefec`, `#e0e0dc` | `border-border` |
| raised bg `#f3f3f1`, `#f6f6f4`, `#f0f0ee` | `bg-muted` / `bg-accent` |
| card `#fff` | `bg-card` |
| black button `#111214` | `<Button>` default |
| white button | `<Button variant="outline">` |
| red heart `#e2554a` | `text-red-500` |
| error `#c23b31` | `text-destructive` |
| mono eyebrow `GeistMono 11.5px .08em` | `font-mono text-[11.5px] tracking-[.08em] uppercase text-muted-foreground` |

Shared chrome across every mock: 34 px black announcement bar → 38 px stats bar → 64 px nav → 1120 px column with 1 px side rules → page sections separated by `border-top` → 4-column footer → copyright row.

Asset paths in the mocks (`static/library/*.svg`) map to our `/library/*.svg` (same filenames). `static/hero-meadow.png` is not in the repo yet; use the gradient placeholder described in the plan.
