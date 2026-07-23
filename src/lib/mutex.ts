// Tiny per-key async mutex: serializes state-transition calls for the same
// session so a double-click on "Next" (or two near-simultaneous votes that
// both trigger auto-reveal) can never race each other.
const chains = new Map<string, Promise<unknown>>();

export function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = chains.get(key) ?? Promise.resolve();
  const run = previous.then(fn, fn);
  const settled = run.then(
    () => undefined,
    () => undefined
  );
  chains.set(key, settled);
  settled.finally(() => {
    if (chains.get(key) === settled) chains.delete(key);
  });
  return run;
}
