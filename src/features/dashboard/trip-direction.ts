// Trip direction along the route, and which way a unit faces on the map.
//
// The route geometry runs from its first point (Calumpit terminal) to its last
// (Meycauayan). FORWARD follows that order; REVERSE is the return trip. The
// conductor sets it (shift_logs.trip_direction); every shift starts FORWARD.
//
// Dependency-free so tests/trip-direction.test.cjs can run it in Node.

export type TripDirection = "FORWARD" | "REVERSE";

export type BusFacing = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

type LatLng = [number, number];

const TERMINALS: Record<TripDirection, readonly [string, string]> = {
  FORWARD: ["Calumpit", "Meycauayan"],
  REVERSE: ["Meycauayan", "Calumpit"],
};

/** Anything other than "REVERSE" (missing, old payloads) is the default trip. */
export const toTripDirection = (value: unknown): TripDirection => (value === "REVERSE" ? "REVERSE" : "FORWARD");

export const tripTerminals = (direction: TripDirection) => TERMINALS[direction];

export const tripLabel = (direction: TripDirection) => `${TERMINALS[direction][0]} → ${TERMINALS[direction][1]}`;

// The bus image follows the next ~100 m of road so small kinks in the drawn
// line don't swap it; the arrow follows a shorter stretch so it hugs the line.
const BUS_LOOKAHEAD_M = 100;
const ARROW_LOOKAHEAD_M = 30;
const ARROW_STEP_DEG = 15;
const FACINGS: BusFacing[] = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];

interface RouteIndex {
  x: number[];
  y: number[];
  /** Distance along the route (m) at each point. */
  along: number[];
  lat0: number;
}

const EARTH_M_PER_DEG = 111_320;
const indexCache = new WeakMap<LatLng[], RouteIndex>();

// Flat projection around the route's mean latitude: exact enough over a
// 25 km corridor, and Leaflet's Mercator keeps angles, so these bearings
// match what the map shows.
function indexRoute(coords: LatLng[]): RouteIndex {
  const cached = indexCache.get(coords);
  if (cached) return cached;
  const lat0 = coords.reduce((sum, [lat]) => sum + lat, 0) / coords.length;
  const kx = EARTH_M_PER_DEG * Math.cos((lat0 * Math.PI) / 180);
  const x = coords.map(([, lng]) => lng * kx);
  const y = coords.map(([lat]) => lat * EARTH_M_PER_DEG);
  const along = [0];
  for (let i = 1; i < coords.length; i++) along.push(along[i - 1]! + Math.hypot(x[i]! - x[i - 1]!, y[i]! - y[i - 1]!));
  const index = { x, y, along, lat0 };
  indexCache.set(coords, index);
  return index;
}

/** Distance along the route of the point on it closest to (lat, lng). */
function project(route: RouteIndex, lat: number, lng: number): number {
  const px = lng * EARTH_M_PER_DEG * Math.cos((route.lat0 * Math.PI) / 180);
  const py = lat * EARTH_M_PER_DEG;
  let best = Infinity;
  let bestAlong = 0;
  for (let i = 1; i < route.x.length; i++) {
    const ax = route.x[i - 1]!, ay = route.y[i - 1]!;
    const dx = route.x[i]! - ax, dy = route.y[i]! - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
    const d2 = (ax + t * dx - px) ** 2 + (ay + t * dy - py) ** 2;
    if (d2 < best) {
      best = d2;
      bestAlong = route.along[i - 1]! + t * Math.sqrt(len2);
    }
  }
  return bestAlong;
}

/** Planar point at a distance along the route (clamped to its ends). */
function pointAt(route: RouteIndex, distance: number): [number, number] {
  const { x, y, along } = route;
  const last = along.length - 1;
  const d = Math.min(along[last]!, Math.max(0, distance));
  let lo = 1, hi = last;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (along[mid]! < d) lo = mid + 1;
    else hi = mid;
  }
  const span = along[lo]! - along[lo - 1]!;
  const t = span > 0 ? (d - along[lo - 1]!) / span : 0;
  return [x[lo - 1]! + t * (x[lo]! - x[lo - 1]!), y[lo - 1]! + t * (y[lo]! - y[lo - 1]!)];
}

/** Compass bearing in degrees (0 = north/up, 90 = east/right) of travel at `at`. */
function travelBearing(route: RouteIndex, at: number, sign: 1 | -1, lookahead: number): number {
  const total = route.along[route.along.length - 1]!;
  let from = at;
  let to = Math.min(total, Math.max(0, at + sign * lookahead));
  // At the trip's end there is no road ahead: use the stretch just behind.
  if (Math.abs(to - from) < 1) {
    from = Math.min(total, Math.max(0, at - sign * lookahead));
    to = at;
  }
  const [ax, ay] = pointAt(route, from);
  const [bx, by] = pointAt(route, to);
  return ((Math.atan2(bx - ax, by - ay) * 180) / Math.PI + 360) % 360;
}

export const facingFor = (bearing: number): BusFacing => FACINGS[Math.round(bearing / 45) % 8]!;

export interface UnitHeading {
  /** Which of the 8 bus images to show. */
  facing: BusFacing;
  /** Arrow rotation in degrees (0 = up), rounded to 15° so icons can be reused. */
  arrow: number;
}

/**
 * How a unit at (lat, lng) should face, following the route line toward the
 * end of its trip. Null when there is no usable route line.
 */
export function unitHeading(coords: LatLng[], lat: number, lng: number, direction: TripDirection): UnitHeading | null {
  if (coords.length < 2 || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const route = indexRoute(coords);
  if (route.along[route.along.length - 1]! <= 0) return null;
  const at = project(route, lat, lng);
  const sign = direction === "REVERSE" ? -1 : 1;
  return {
    facing: facingFor(travelBearing(route, at, sign, BUS_LOOKAHEAD_M)),
    arrow: (Math.round(travelBearing(route, at, sign, ARROW_LOOKAHEAD_M) / ARROW_STEP_DEG) * ARROW_STEP_DEG) % 360,
  };
}
