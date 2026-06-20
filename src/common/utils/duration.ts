/** Parse '900s' | '15m' | '7d' | '12h' | '500ms' → milliseconds. */
export function parseDurationMs(value: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/.exec(value.trim());
  if (!match) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  const amount = parseInt(match[1], 10);
  const mult: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return amount * mult[match[2]];
}
