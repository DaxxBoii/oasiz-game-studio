/** Creates a seeded pseudo-random number generator (Lehmer / Park-Miller). */
export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Shortcut for document.getElementById with a throw on miss. */
export function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error("Missing #" + id);
  return el;
}
