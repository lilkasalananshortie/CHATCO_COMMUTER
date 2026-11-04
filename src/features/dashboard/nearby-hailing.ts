import type { VehicleLocation } from "../../core/domain/types";
import { distanceMeters, PICKUP_RADIUS_METERS } from "./route-data";

export const HAIL_LOCATION_MAX_AGE_MS = 10 * 60 * 1000;

export interface NearbyHailableVehicle {
  vehicle: VehicleLocation;
  distanceMeters: number;
  etaMinutes: number;
}

export function getNearbyHailableVehicles(
  vehicles: VehicleLocation[],
  userLocation: { latitude: number; longitude: number } | null | undefined,
  now = Date.now(),
): NearbyHailableVehicle[] {
  if (!userLocation) return [];

  return vehicles.flatMap((vehicle) => {
    const latitude = Number(vehicle.latitude ?? (vehicle as any).lat);
    const longitude = Number(vehicle.longitude ?? (vehicle as any).lng);
    const updatedAt = Date.parse(String(vehicle.updated_at ?? (vehicle as any).last_update ?? ""));
    const age = now - updatedAt;
    const capacity = vehicle.capacity_status ?? (vehicle as any).vehicle_capacity_status;
    const onBreak = Boolean((vehicle as any).is_on_break || (vehicle as any).isOnBreak);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude === 0 && longitude === 0) return [];
    if (!Number.isFinite(updatedAt) || age < 0 || age > HAIL_LOCATION_MAX_AGE_MS) return [];
    if (capacity === "FULL" || capacity === "Full" || onBreak) return [];

    const distance = distanceMeters(userLocation, { latitude, longitude });
    if (!Number.isFinite(distance) || distance > PICKUP_RADIUS_METERS) return [];

    return [{
      vehicle,
      distanceMeters: Math.round(distance),
      etaMinutes: Math.max(1, Math.round(distance / 416)),
    }];
  }).sort((a, b) => a.distanceMeters - b.distanceMeters);
}
