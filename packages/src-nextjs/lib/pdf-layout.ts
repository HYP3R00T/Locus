export type PageSize = { width: number; height: number };
export type PagePosition = { pageIndex: number; y: number };
export const PAGE_GAP = 12;
export const PAGE_INSET = 16;

export function pageOffsets(sizes: PageSize[], scale: number): number[] {
  const offsets = [PAGE_GAP];
  for (const size of sizes)
    offsets.push(offsets[offsets.length - 1] + size.height * scale + PAGE_GAP);
  return offsets;
}

export function pageAt(offsets: number[], top: number): number {
  let low = 0;
  let high = offsets.length - 2;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (offsets[middle] <= top) low = middle;
    else high = middle - 1;
  }
  return Math.max(0, low);
}

export function readingPosition(
  sizes: PageSize[],
  offsets: number[],
  scale: number,
  top: number,
): PagePosition {
  const pageIndex = pageAt(offsets, top);
  return {
    pageIndex,
    y: Math.max(0, Math.min(1, (top - offsets[pageIndex]) / (sizes[pageIndex].height * scale))),
  };
}

export function positionTop(
  position: PagePosition,
  sizes: PageSize[],
  offsets: number[],
  scale: number,
): number {
  const index = Math.max(0, Math.min(sizes.length - 1, position.pageIndex));
  return offsets[index] + position.y * sizes[index].height * scale;
}
