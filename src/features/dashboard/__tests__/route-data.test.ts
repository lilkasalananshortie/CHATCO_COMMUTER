import { describe, it, expect } from "@jest/globals";
import { ROUTE_POINTS, ROUTE_COORDINATES, distanceMeters } from "../route-data";

describe("Commuter Route Data Integrity", () => {
  it("should contain valid route coordinates along Calumpit–Meycauayan corridor", () => {
    expect(ROUTE_POINTS.length).toBeGreaterThan(5);
    for (const point of ROUTE_POINTS) {
      const lat = point[0];
      const lng = point[1];
      expect(typeof lat).toBe("number");
      expect(typeof lng).toBe("number");
      // Valid Bulacan geographic boundary checks
      expect(lat).toBeGreaterThanOrEqual(14.6);
      expect(lat).toBeLessThanOrEqual(15.1);
      expect(lng).toBeGreaterThanOrEqual(120.6);
      expect(lng).toBeLessThanOrEqual(121.1);
    }
  });

  it("should have matching ROUTE_COORDINATES with latitude and longitude keys", () => {
    expect(ROUTE_COORDINATES.length).toBe(ROUTE_POINTS.length);
    ROUTE_COORDINATES.forEach((coord, idx) => {
      const pt = ROUTE_POINTS[idx];
      if (pt) {
        expect(coord.latitude).toBeCloseTo(pt[0], 4);
        expect(coord.longitude).toBeCloseTo(pt[1], 4);
      }
    });
  });

  it("should accurately calculate distance in meters between two coordinates", () => {
    // Distance between Calumpit start and next point
    const p1 = { latitude: 14.9254, longitude: 120.7651 };
    const p2 = { latitude: 14.9242, longitude: 120.7652 };
    const dist = distanceMeters(p1, p2);
    expect(dist).toBeGreaterThan(50);
    expect(dist).toBeLessThan(300);

    // Distance to same point should be 0
    expect(distanceMeters(p1, p1)).toBe(0);
  });
});
