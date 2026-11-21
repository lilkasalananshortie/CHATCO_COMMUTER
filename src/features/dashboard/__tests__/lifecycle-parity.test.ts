/// <reference types="jest" />
import { ACCEPTED_HOLD_MS, acceptedHailCooldown, formatHailCooldown, hailCooldownFromError, hailIsTerminal, hailSecondsRemaining } from "../hail-state";
import { routeCoordinates } from "../published-route";
import type { HailRequest } from "../../../core/domain/types";
const hail = (data: Partial<HailRequest>): HailRequest => ({ id: "h", pickup_name: "stop", passenger_count: 1, created_at: "2026-10-17T00:00:00Z", status: "PENDING", ...data });
test.each(["EXPIRED", "COMPLETED", "CANCELLED", "REJECTED"] as const)("%s is terminal", status => expect(hailIsTerminal(hail({ status }))).toBe(true));
const NOW = Date.parse("2026-10-17T00:00:00Z");
test("accepted hail is active only inside its server window", () => {
  const accepted = hail({ status: "ACCEPTED", vehicle_id: "unit-4", accepted_by: { unit_number: "UNIT-004" }, expires_at: "2026-10-17T00:01:42Z" });
  expect(acceptedHailCooldown(accepted, NOW)).toEqual({ hailId: "h", vehicleId: "unit-4", unitNumber: "UNIT-004", endsAt: NOW + 102_000, serverHeld: false });
  expect(acceptedHailCooldown({ ...accepted, expires_at: "2026-10-17T00:00:00Z" }, NOW)).toBeNull();
  expect(acceptedHailCooldown({ ...accepted, status: "PENDING" }, NOW)).toBeNull();
  expect(acceptedHailCooldown({ ...accepted, vehicle_id: null }, NOW)).toBeNull();
});
test("a wrong device clock cannot stretch the cooldown past two minutes", () => {
  const accepted = hail({ status: "ACCEPTED", vehicle_id: "unit-4", expires_at: "2026-10-17T00:30:00Z" });
  expect(acceptedHailCooldown(accepted, NOW)!.endsAt).toBe(NOW + ACCEPTED_HOLD_MS);
});
test("only the server's cooldown refusal starts a held cooldown", () => {
  const data = { error: "hail_cooldown", unit_number: "UNIT-004", vehicle_id: "unit-4", cooldown_ends_at: "2026-10-17T00:01:00Z" };
  expect(hailCooldownFromError({ response: { status: 409, data } }, NOW)).toEqual({ hailId: null, vehicleId: "unit-4", unitNumber: "UNIT-004", endsAt: NOW + 60_000, serverHeld: true });
  expect(hailCooldownFromError({ response: { status: 409, data: { message: "Duplicate pending hail" } } }, NOW)).toBeNull();
  expect(hailCooldownFromError({ response: { status: 422, data } }, NOW)).toBeNull();
  expect(hailCooldownFromError(new Error("offline"), NOW)).toBeNull();
});
test("cooldown label rounds up and never goes negative", () => {
  expect(formatHailCooldown(102_000)).toBe("1:42");
  expect(formatHailCooldown(500)).toBe("0:01");
  expect(formatHailCooldown(-1)).toBe("0:00");
});
test("accepted hail is not timed out by its former pending deadline", () => {
  expect(hailIsTerminal(hail({ status: "ACCEPTED" }))).toBe(false);
  expect(hailSecondsRemaining(hail({ status: "ACCEPTED", expires_at: "2000-01-01" }))).toBe(0);
});
test("countdown uses server deadline instead of a new 180 second timer", () => {
  expect(hailSecondsRemaining(hail({ expires_at: "2026-10-17T00:00:42Z" }), Date.parse("2026-10-17T00:00:00Z"))).toBe(42);
});
test("missing or past deadline never invents a new TTL", () => {
  expect(hailSecondsRemaining(hail({}))).toBe(0);
  expect(hailSecondsRemaining(hail({ expires_at: "2000-01-01" }))).toBe(0);
});
test("valid published geometry preserves backend coordinates", () => expect(routeCoordinates([[14, 121], [15, 122]])).toEqual([[14, 121], [15, 122]]));
test.each([null, [], [[14, 121]], [[999, 121], [15, 122]], [[14, "x"], [15, 122]]])("invalid geometry cannot replace route: %p", value => expect(routeCoordinates(value)).toEqual([]));
