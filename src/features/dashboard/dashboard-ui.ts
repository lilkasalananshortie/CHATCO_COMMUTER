export const SOS_DOUBLE_TAP_MS = 600;
export type HailHintReason = "denied" | "unavailable" | "out-of-range";
export function hailHint(reason: HailHintReason) {
  return {
    denied: { title: "Location access denied", message: "Allow location access for CHATCO in your device settings and turn on location services to see ETA and hail." },
    unavailable: { title: "Location unavailable", message: "Turn on your device's GPS or location services and allow CHATCO to use your location to see ETA and hail." },
    "out-of-range": { title: "Outside service radius", message: "Move within 1 km of a conductor unit to see ETA and hail. Vehicle locations are still visible on the map." },
  }[reason];
}
export function isSosDoubleTap(previous: number | null, now: number): boolean {
  return previous !== null && now >= previous && now - previous <= SOS_DOUBLE_TAP_MS;
}

/** Keep the hail button visible before measurement and when the tools panel is tall. */
export function hailDockBottom(viewportHeight: number, sheetHeight: number, safeTop: number, expanded: boolean): number {
  const viewport = Number.isFinite(viewportHeight) && viewportHeight > 0 ? viewportHeight : 640;
  const headerClearance = Math.max(96, safeTop + 72);
  const maxBottom = Math.max(12, viewport - headerClearance - 88);
  const measured = Number.isFinite(sheetHeight) && sheetHeight > 0;
  const desired = measured ? sheetHeight + 6 : expanded ? Math.min(300, viewport * 0.42) : 80;
  return Math.min(maxBottom, Math.max(12, desired));
}
