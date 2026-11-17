import type { NearbyHailableVehicle } from "./nearby-hailing";

export const COLLAPSED_TOOLS_HEIGHT = 24;

/** The mobile navigation is outside the map viewport, so only the handle remains visible. */
export function toolsSheetCollapsedOffset(sheetHeight: number): number {
  return Math.max(0, sheetHeight - COLLAPSED_TOOLS_HEIGHT);
}

/** Announce newly nearby units once per range visit, as the web tracking flow does. */
export function newlyNearbyVehicle(nearby: NearbyHailableVehicle[], notified: Set<string>): NearbyHailableVehicle | null {
  if (nearby.length === 0) { notified.clear(); return null; }
  const id = (item: NearbyHailableVehicle) => String(item.vehicle.vehicle_id || item.vehicle.id || item.vehicle.unit_number);
  const first = nearby.find(item => !notified.has(id(item))) ?? null;
  if (first) notified.add(id(first));
  return first;
}
export type HailHintReason = "denied" | "unavailable" | "out-of-range" | "no-nearby-units";
export function hailHint(reason: HailHintReason) {
  return {
    denied: { title: "Location access denied", message: "Allow location access for E-CHATCO in your device settings and turn on location services to see ETA and hail." },
    unavailable: { title: "Location unavailable", message: "Turn on your device's GPS or location services and allow E-CHATCO to use your location to see ETA and hail." },
    "out-of-range": { title: "Too far from the route", message: "Move within 1 km of the jeep route. You can hail when an available unit is also within 1 km." },
    "no-nearby-units": { title: "No nearby units", message: "You are near the route, but no available jeep is within 1 km. Wait for an approaching unit." },
  }[reason];
}

/** Keep the hail button visible before measurement and when the tools panel is tall. */
export function hailDockBottom(viewportHeight: number, sheetHeight: number, safeTop: number, expanded: boolean): number {
  const viewport = Number.isFinite(viewportHeight) && viewportHeight > 0 ? viewportHeight : 640;
  const headerClearance = Math.max(96, safeTop + 72);
  const maxBottom = Math.max(12, viewport - headerClearance - 88);
  const measured = Number.isFinite(sheetHeight) && sheetHeight > 0;
  const desired = expanded ? measured ? sheetHeight + 6 : Math.min(300, viewport * 0.42) : COLLAPSED_TOOLS_HEIGHT + 6;
  return Math.min(maxBottom, Math.max(12, desired));
}
