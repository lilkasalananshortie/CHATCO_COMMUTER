export type RoutePoint = [number, number];
export function routeCoordinates(value: unknown): RoutePoint[] {
  if (!Array.isArray(value)) return [];
  const coordinates = value.map(point => Array.isArray(point) ? [Number(point[0]), Number(point[1])] : []) as RoutePoint[];
  if (coordinates.length < 2 || coordinates.some(point => point.length !== 2 || !point.every(Number.isFinite)
    || Math.abs(point[0]) > 90 || Math.abs(point[1]) > 180)) return [];
  return coordinates;
}
