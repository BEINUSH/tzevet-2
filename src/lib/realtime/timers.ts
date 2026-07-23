const autoCloseTimers = new Map<string, NodeJS.Timeout>();

export function scheduleAutoClose(sessionId: string, ms: number, onFire: () => void) {
  clearAutoClose(sessionId);
  const handle = setTimeout(() => {
    autoCloseTimers.delete(sessionId);
    onFire();
  }, ms);
  autoCloseTimers.set(sessionId, handle);
}

export function clearAutoClose(sessionId: string) {
  const existing = autoCloseTimers.get(sessionId);
  if (existing) {
    clearTimeout(existing);
    autoCloseTimers.delete(sessionId);
  }
}
