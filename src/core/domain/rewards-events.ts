const listeners = new Set<() => void>();
export function notifyRewardsChanged() { listeners.forEach((listener) => listener()); }
export function subscribeRewardsChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
