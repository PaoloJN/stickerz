import { getContext, setContext } from "svelte";

/**
 * The home hero embeds the whole editor shell. In that mode every window-level handler must leave the
 * page alone unless focus (or the event) is inside the demo, so components read this scope and gate.
 */
export type DemoScope = { root: () => HTMLElement | undefined };

export const setDemo = (scope: DemoScope | null) => setContext("demo", scope);
export const getDemo = () => getContext<DemoScope | null | undefined>("demo") ?? null;

/** true when a window-level event belongs to this editor: always in the full editor, only from inside the demo root otherwise */
export function ours(demo: DemoScope | null, e: Event): boolean {
  if (!demo) return true;
  const root = demo.root();
  return !!root && e.target instanceof Node && root.contains(e.target);
}
