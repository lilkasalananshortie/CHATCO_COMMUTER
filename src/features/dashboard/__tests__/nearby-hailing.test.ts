/// <reference types="jest" />

import { getNearbyHailableVehicles } from "../nearby-hailing";
import type { VehicleLocation } from "../../../core/domain/types";

const now = Date.parse("2026-11-02T00:00:00.000Z");
const commuter = { latitude: 14.8459, longitude: 120.8342 };
const vehicle = (overrides: Partial<VehicleLocation> = {}): VehicleLocation => ({
  vehicle_id: "unit-1",
  unit_number: "1",
  plate_number: "ABC-123",
  latitude: 14.846,
  longitude: 120.8342,
  capacity_status: "AVAILABLE",
  updated_at: new Date(now - 30_000).toISOString(),
  ...overrides,
});

test("only fresh, available units within one kilometer can be hailed", () => {
  const results = getNearbyHailableVehicles([
    vehicle({ vehicle_id: "stale", updated_at: new Date(now - 11 * 60_000).toISOString() }),
    vehicle({ vehicle_id: "far", longitude: 120.86 }),
    vehicle({ vehicle_id: "full", capacity_status: "FULL" }),
    vehicle({ vehicle_id: "nearby" }),
  ], commuter, now);

  expect(results.map(({ vehicle: item }) => item.vehicle_id)).toEqual(["nearby"]);
});

test("units without a valid server location timestamp are not hail targets", () => {
  expect(getNearbyHailableVehicles([
    vehicle({ updated_at: null }),
    vehicle({ vehicle_id: "invalid-time", updated_at: "not-a-date" }),
  ], commuter, now)).toEqual([]);
});

test("the nearest hailable unit is selected after removing full units", () => {
  const results = getNearbyHailableVehicles([
    vehicle({ vehicle_id: "full-nearest", capacity_status: "FULL" }),
    vehicle({ vehicle_id: "available", longitude: 120.8344 }),
  ], commuter, now);

  expect(results[0]?.vehicle.vehicle_id).toBe("available");
});
