export type RoutePoint = [number, number];
export function coordinatesMatch(left: RoutePoint[], right: RoutePoint[]): boolean {
  return left.length === right.length && left.every((point, index) =>
    point[0] === right[index]?.[0] && point[1] === right[index]?.[1]);
}
export function routeCoordinates(value: unknown): RoutePoint[] {
  if (!Array.isArray(value)) return [];
  const coordinates = value.map(point => Array.isArray(point) ? [Number(point[0]), Number(point[1])] : []) as RoutePoint[];
  if (coordinates.length < 2 || coordinates.some(point => point.length !== 2 || !point.every(Number.isFinite)
    || Math.abs(point[0]) > 90 || Math.abs(point[1]) > 180)) return [];
  return coordinates;
}
