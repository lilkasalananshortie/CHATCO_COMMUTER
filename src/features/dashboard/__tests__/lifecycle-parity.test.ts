/// <reference types="jest" />
import { hailIsTerminal, hailSecondsRemaining } from "../hail-state";
import { routeCoordinates } from "../published-route";
import type { HailRequest } from "../../../core/domain/types";
const hail = (data: Partial<HailRequest>): HailRequest => ({ id: "h", pickup_name: "stop", passenger_count: 1, created_at: "2026-10-17T00:00:00Z", status: "PENDING", ...data });
test.each(["EXPIRED", "COMPLETED", "CANCELLED", "REJECTED"] as const)("%s is terminal", status => expect(hailIsTerminal(hail({ status }))).toBe(true));
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
