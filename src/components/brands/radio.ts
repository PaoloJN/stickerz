/**
 * Keyboard handling for a roving-tabindex radio group: arrows move (and select) like native radios,
 * Space/Enter select the focused option. Options are the group's `[role="radio"]` children.
 */
export function radioKeydown<T>(e: KeyboardEvent, values: readonly T[], current: T, select: (v: T) => void) {
  const group = e.currentTarget as HTMLElement;
  const i = values.indexOf(current);
  let next: number | null = null;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % values.length;
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + values.length) % values.length;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = values.length - 1;
  else if (e.key === " " || e.key === "Enter") {
    const radios = [...group.querySelectorAll<HTMLElement>('[role="radio"]')];
    const focused = radios.indexOf(document.activeElement as HTMLElement);
    if (focused >= 0) {
      e.preventDefault();
      select(values[focused]);
    }
    return;
  }
  if (next === null) return;
  e.preventDefault();
  select(values[next]);
  group.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
}
