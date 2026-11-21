import type { VehicleLocation } from "../../core/domain/types";
import type { RoutePoint } from "./published-route";
import { toTripDirection, tripLabel, unitHeading } from "./trip-direction";

/** Use the same route-based facing as the web, including old payload fallback. */
export function mapVehicleState(vehicle: VehicleLocation, route: RoutePoint[]) {
  const lat = Number(vehicle.latitude);
  const lng = Number(vehicle.longitude);
  return {
    id: vehicle.vehicle_id || vehicle.id || vehicle.unit_number,
    unitNumber: vehicle.unit_number,
    plateNumber: vehicle.plate_number,
    lat,
    lng,
    availableSeats: vehicle.available_seats,
    capacityStatus: vehicle.capacity_status,
    routeName: vehicle.route_name,
    tripLabel: tripLabel(toTripDirection(vehicle.trip_direction)),
    heading: unitHeading(route, lat, lng, toTripDirection(vehicle.trip_direction)),
  };
}
