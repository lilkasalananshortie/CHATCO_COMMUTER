/// <reference types="jest" />
jest.mock("expo-location", () => ({ requestForegroundPermissionsAsync: jest.fn(), getCurrentPositionAsync: jest.fn(), Accuracy: { High: 6 } }));
import * as Location from "expo-location";
import { getSosLocation } from "../location-fix";
beforeEach(() => {
  jest.resetAllMocks(); jest.useFakeTimers();
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
});
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });
test("SOS uses actual GPS coordinates only", async () => {
  (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({ coords: { latitude: 14.8, longitude: 120.8 } });
  expect(await getSosLocation()).toEqual({ latitude: 14.8, longitude: 120.8 });
});
test("denied permission does not request or fabricate a coordinate", async () => {
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: "denied" });
  await expect(getSosLocation()).rejects.toThrow("emergency call");
  expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
});
test("GPS failure never falls back to a route coordinate", async () => {
  (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(new Error("GPS disabled"));
  await expect(getSosLocation()).rejects.toThrow("GPS disabled");
});
test.each([[NaN, 120], [91, 120], [14, Infinity], [14, -181]])("invalid fix %s,%s is rejected", async (latitude, longitude) => {
  (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({ coords: { latitude, longitude } });
  await expect(getSosLocation()).rejects.toThrow("valid GPS");
});
test("a stalled GPS fix times out with retry and call guidance", async () => {
  (Location.getCurrentPositionAsync as jest.Mock).mockReturnValue(new Promise(() => {}));
  const fix = getSosLocation(); const expected = expect(fix).rejects.toThrow("emergency call");
  await jest.advanceTimersByTimeAsync(20000);
  await expected;
});
