/**
 * Random ter-seed (deterministik) agar data demo dapat direproduksi.
 * Menggunakan algoritma mulberry32.
 */
export function createRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int(min: number, max: number) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    pick<T>(items: readonly T[]): T {
      return items[Math.floor(next() * items.length)];
    },
    bool(probability = 0.5) {
      return next() < probability;
    },
    /** Nilai bulat dengan variasi ±spread di sekitar base. */
    jitterInt(base: number, spread: number) {
      return Math.max(0, Math.round(base + (next() * 2 - 1) * spread));
    },
    shuffle<T>(items: T[]): T[] {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}

export type SeededRng = ReturnType<typeof createRng>;

export const DEFAULT_SEED = 20261005;
