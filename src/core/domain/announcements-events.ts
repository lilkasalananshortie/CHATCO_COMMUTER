const listeners = new Set<() => void>();

export function notifyAnnouncementsRead() { listeners.forEach(listener => listener()); }
export function subscribeAnnouncementsRead(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
