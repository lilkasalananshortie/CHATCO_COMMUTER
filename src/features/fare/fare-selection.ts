import type { PublishedFareMatrix, PublishedFarePoint } from "./fare-estimate";
export type FareField = "pickup" | "destination";
export interface FareSelection { pickup: string; destination: string; pickupLandmark: string; destinationLandmark: string }
export const emptySelection: FareSelection = { pickup: "", destination: "", pickupLandmark: "", destinationLandmark: "" };
export function subStops(point: PublishedFarePoint): string[] {
  return [...new Set([...point.subStops, ...point.landmarks].map(value => value.trim()).filter(Boolean))];
}
export function selectStop(selection: FareSelection, field: FareField, id: string, landmark = ""): FareSelection {
  return { ...selection, [field]: id, [`${field}Landmark`]: landmark };
}
export function swapStops(selection: FareSelection): FareSelection {
  if (!selection.pickup || !selection.destination) return selection;
  return { pickup: selection.destination, destination: selection.pickup, pickupLandmark: selection.destinationLandmark, destinationLandmark: selection.pickupLandmark };
}
export function reconcileSelection(selection: FareSelection, matrix: PublishedFareMatrix): FareSelection {
  let next = selection;
  for (const field of ["pickup", "destination"] as const) {
    const point = matrix.points.find(item => item.id === selection[field]);
    const landmark = selection[`${field}Landmark`];
    next = selectStop(next, field, point?.id ?? "", point && subStops(point).includes(landmark) ? landmark : "");
  }
  return next;
}
export function matchesFarePoint(point: PublishedFarePoint, query: string): boolean {
  return [point.name, point.code ?? "", ...subStops(point)].join(" ").toLowerCase().includes(query.trim().toLowerCase());
}
