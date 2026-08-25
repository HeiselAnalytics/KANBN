export const RANK_STEP = 1024;

export function rankAfter(last?: number | null): number {
  return (last ?? 0) + RANK_STEP;
}

export function rankBetween(before?: number | null, after?: number | null): number {
  if (before == null && after == null) return RANK_STEP;
  if (before == null) return (after as number) - RANK_STEP;
  if (after == null) return before + RANK_STEP;
  return before + (after - before) / 2;
}
