export interface PublishedFarePoint {
  id: string; name: string; pointNumber: number; regularFare: number; discountedFare: number;
  landmarks: string[]; subStops: string[]; code?: string;
}
export interface PublishedFareMatrix {
  route: { id: string; name: string }; points: PublishedFarePoint[];
  config: { baseFareRegular: number; baseFareDiscounted: number; baseBarangayCount?: number };
}
export type FareCategory = "REGULAR" | "STUDENT" | "SENIOR" | "PWD";

export function normalizeFareMatrix(raw: any): PublishedFareMatrix {
  if (!raw?.route?.id || !Array.isArray(raw.points) || !raw.points.length) throw new Error("No published fare points are available.");
  const list = (value: unknown): string[] => Array.isArray(value) ? value.map(String) : typeof value === "string" ? value.split(",").map((v) => v.trim()).filter(Boolean) : [];
  const points = raw.points.map((p: any): PublishedFarePoint => ({
    id: String(p.id), name: String(p.name), code: String(p.code ?? ""), pointNumber: Number(p.pointNumber ?? p.point_number),
    regularFare: Number(p.regularFare ?? p.regular_fare), discountedFare: Number(p.discountedFare ?? p.discounted_fare),
    landmarks: list(p.landmarks), subStops: list(p.subStops ?? p.sub_stops),
  }));
  const config = { baseFareRegular: Number(raw.config?.baseFareRegular ?? 17), baseFareDiscounted: Number(raw.config?.baseFareDiscounted ?? 13.6), baseBarangayCount: Number(raw.config?.baseBarangayCount ?? 4) };
  if (points.some((p: PublishedFarePoint) => !p.id || !Number.isFinite(p.pointNumber) || !Number.isFinite(p.regularFare) || p.regularFare < 0 || !Number.isFinite(p.discountedFare) || p.discountedFare < 0)
    || !Number.isFinite(config.baseFareRegular) || config.baseFareRegular <= 0 || !Number.isFinite(config.baseFareDiscounted) || config.baseFareDiscounted <= 0) {
    throw new Error("The published fare matrix is incomplete. Please refresh or contact support.");
  }
  return { route: raw.route, points, config };
}

/** Estimate only; uses the same cumulative-point difference and minimum as web. */
export function estimateFare(matrix: PublishedFareMatrix, fromId: string, toId: string, category: FareCategory) {
  const from = matrix.points.find((p) => p.id === fromId);
  const to = matrix.points.find((p) => p.id === toId);
  if (!from || !to) throw new Error("Select a valid pickup and destination.");
  const round = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
  const regular = round(Math.max(Math.abs(from.regularFare - to.regularFare), matrix.config.baseFareRegular));
  const discounted = round(Math.max(Math.abs(from.discountedFare - to.discountedFare), matrix.config.baseFareDiscounted));
  const amount = category === "REGULAR" ? regular : discounted;
  return { regular, amount, discount: round(regular - amount) };
}
