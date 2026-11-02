const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5;

/** Convert wheel delta units and keep zoom within the viewer limits. */
export function wheelZoomScale(
  current: number,
  deltaY: number,
  deltaMode: number,
  pageHeight: number,
): number {
  if (!Number.isFinite(deltaY) || deltaY === 0) return current;
  const pixels = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? pageHeight : 1);
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current * 2 ** (-pixels / 600)));
}
