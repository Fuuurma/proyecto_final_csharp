// The detail pending skeleton renders before the route loader resolves,
// so it cannot ask the loader for the object's real proportions — the
// curated seed was the only ratio it knew, and every search/explore
// arrival got the 1/1 default (grok 10-01 P2). Any surface that has
// already rendered the artwork — a grid card, the tray, a related row —
// knows the true ratio, so remember it here; a hard load keeps the
// honest square fallback.
//
// Client-only by construction: writes happen from an effect, which never
// runs during SSR, so the module map stays empty on the server.

const ratioById = new Map<number, number>();
const RATIO_CACHE_LIMIT = 300;

export function rememberArtworkRatio(id: number, ratio: number): void {
  if (!Number.isFinite(ratio) || ratio <= 0) return;
  // Re-set bumps recency; evict the oldest entry past the cap.
  ratioById.delete(id);
  ratioById.set(id, ratio);
  if (ratioById.size > RATIO_CACHE_LIMIT) {
    const oldest = ratioById.keys().next().value;
    if (oldest !== undefined) ratioById.delete(oldest);
  }
}

export function recallArtworkRatio(id: number): number | undefined {
  return ratioById.get(id);
}
