export function rangeKey(position: { start: number; end: number }): string {
  return `${position.start}:${position.end}`;
}
