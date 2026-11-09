import { AppState, Platform } from "react-native";

/** Refresh visible screens without overlapping requests on slow connections. */
export function foregroundPoll(task: () => Promise<void>, intervalMs: number) {
  let stopped = false;
  let running: Promise<void> | null = null;
  let appState = AppState.currentState;
  const visible = () => (appState == null || appState === "active")
    && (Platform.OS !== "web" || typeof document === "undefined" || document.visibilityState !== "hidden")
    && (Platform.OS !== "web" || typeof navigator === "undefined" || navigator.onLine !== false);
  const refresh = (afterCurrent = false): Promise<void> => {
    if (stopped || !visible()) return Promise.resolve();
    // A mutation can make the current read stale. Queue one fresh read for it;
    // ordinary timer ticks only join the current request.
    if (running) return afterCurrent ? running.catch(() => {}).then(() => refresh()) : running;
    running = Promise.resolve().then(() => { if (!stopped && visible()) return task(); })
      .finally(() => { running = null; });
    return running;
  };
  // Callers display their own errors; a failed tick must not stop future ticks.
  const tick = () => { void refresh().catch(() => {}); };
  const subscription = AppState.addEventListener("change", state => {
    const wasActive = appState === "active";
    appState = state;
    if (!wasActive && state === "active") tick();
  });
  const browser = Platform.OS === "web" && typeof window !== "undefined";
  if (browser) {
    window.addEventListener("online", tick);
    document.addEventListener("visibilitychange", tick);
  }
  const timer = setInterval(tick, intervalMs);
  tick();
  return {
    refresh,
    stop() {
      stopped = true;
      clearInterval(timer);
      subscription.remove();
      if (browser) {
        window.removeEventListener("online", tick);
        document.removeEventListener("visibilitychange", tick);
      }
    },
  };
}
