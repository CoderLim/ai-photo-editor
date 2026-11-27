export interface MasonryItem { width?: number; height?: number }

/** Stable greedy placement: appending more items never moves earlier cards. */
export function distributeMasonry<T extends MasonryItem>(items: T[], count: number): T[][] {
  const columns = Array.from({ length: Math.max(1, count) }, () => [] as T[]);
  const heights = columns.map(() => 0);
  for (const item of items) {
    const index = heights.indexOf(Math.min(...heights));
    columns[index].push(item);
    heights[index] += item.width && item.height ? item.height / item.width : 1;
  }
  return columns;
}
