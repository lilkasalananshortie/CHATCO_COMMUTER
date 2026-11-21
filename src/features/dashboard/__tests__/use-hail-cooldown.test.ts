/// <reference types="jest" />
import type { HailRequest } from "../../../core/domain/types";
import type { HailCooldown } from "../hail-state";
import { cooldownFromSnapshot, shouldReleaseCooldown, useHailCooldown } from "../useHailCooldown";

let mockStates: unknown[] = [], mockRefs: Array<{ current: unknown }> = [], mockDeps: unknown[][] = [];
let mockCleanups: Array<(() => void) | void> = [];
let mockStateCursor = 0, mockRefCursor = 0, mockEffectCursor = 0;
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: (initial: unknown) => {
    const slot = mockStateCursor++;
    if (!(slot in mockStates)) mockStates[slot] = typeof initial === "function" ? (initial as () => unknown)() : initial;
    return [mockStates[slot], (next: unknown) => { mockStates[slot] = next; }];
  },
  useRef: (initial: unknown) => { const slot = mockRefCursor++; return mockRefs[slot] ?? (mockRefs[slot] = { current: initial }); },
  useCallback: (fn: unknown) => fn,
  useEffect: (effect: () => (() => void) | void, deps: unknown[]) => {
    const slot = mockEffectCursor++;
    if (!mockDeps[slot] || deps.some((dep, i) => typeof dep !== "function" && dep !== mockDeps[slot]![i])) {
      mockDeps[slot] = deps;
      mockCleanups[slot]?.();
      mockCleanups[slot] = effect();
    }
  },
}));

const NOW = Date.parse("2026-11-21T04:00:00Z");
const accepted = (data: Partial<HailRequest> = {}): HailRequest => ({
  id: "hail-1", vehicle_id: "unit-4", pickup_name: "stop", passenger_count: 1, created_at: "2026-11-21T03:59:00Z",
  status: "ACCEPTED", expires_at: "2026-11-21T04:02:00Z", accepted_by: { unit_number: "UNIT-004" }, ...data,
});
const refusal = { response: { status: 409, data: { error: "hail_cooldown", unit_number: "UNIT-004", vehicle_id: "unit-4", cooldown_ends_at: "2026-11-21T04:01:00Z" } } };
function render(nearby: readonly string[] | null = ["unit-4"], userId = "user-1") {
  mockStateCursor = mockRefCursor = mockEffectCursor = 0;
  return useHailCooldown(userId, nearby);
}
const userN = (() => { let n = 0; return () => `user-${++n}`; })();

beforeEach(() => {
  mockStates = []; mockRefs = []; mockDeps = []; mockCleanups = [];
  jest.useFakeTimers({ now: NOW });
});
afterEach(() => { mockCleanups.forEach(cleanup => cleanup?.()); jest.useRealTimers(); });

test("polling a released hail does not restart its cooldown", () => {
  expect(cooldownFromSnapshot(null, accepted(), new Set(["hail-1"]), NOW)).toBeNull();
});
test("repeat reads keep the same cooldown object", () => {
  const first = cooldownFromSnapshot(null, accepted(), new Set(), NOW)!;
  expect(cooldownFromSnapshot(first, accepted(), new Set(), NOW + 5000)).toBe(first);
});
test("a server refusal outranks a local release", () => {
  const held: HailCooldown = { hailId: null, vehicleId: "unit-4", unitNumber: "UNIT-004", endsAt: NOW + 60_000, serverHeld: true };
  expect(cooldownFromSnapshot(held, accepted(), new Set(["hail-1"]), NOW)).toEqual({ ...held, hailId: "hail-1" });
  expect(shouldReleaseCooldown(held, [])).toBe(false);
});
test("early release waits for a trusted nearby list", () => {
  const cooldown = cooldownFromSnapshot(null, accepted(), new Set(), NOW)!;
  expect(shouldReleaseCooldown(cooldown, null)).toBe(false);
  expect(shouldReleaseCooldown(cooldown, ["unit-4"])).toBe(false);
  expect(shouldReleaseCooldown(cooldown, ["unit-5"])).toBe(true);
});
test("cooldown counts down and ends with its server window", () => {
  const user = userN();
  render(["unit-4"], user);
  expect(render(["unit-4"], user).syncHail(accepted())).toBe("started");
  expect(render(["unit-4"], user).label).toBe("2:00");
  jest.advanceTimersByTime(18_000);
  expect(render(["unit-4"], user).label).toBe("1:42");
  jest.advanceTimersByTime(102_000);
  const ended = render(["unit-4"], user);
  expect(render(["unit-4"], user).cooldown).toBeNull();
  expect(ended.releasedUnit).toBeNull();
});
test("a unit leaving the nearby list releases once and polling cannot restart it", () => {
  const user = userN();
  render(["unit-4"], user);
  render(["unit-4"], user).syncHail(accepted());
  render(["unit-4"], user);
  render([], user);
  const after = render([], user);
  expect(after.cooldown).toBeNull();
  expect(after.releasedUnit).toBe("UNIT-004");
  expect(after.syncHail(accepted())).toBe("none");
  expect(render([], user).cooldown).toBeNull();
});
test("the server dropping a hail early releases it, but a normal end is silent", () => {
  const user = userN();
  render(["unit-4"], user);
  render(["unit-4"], user).syncHail(accepted());
  render(["unit-4"], user).syncHail(null);
  expect(render(["unit-4"], user).releasedUnit).toBe("UNIT-004");

  const other = userN();
  mockStates = []; mockRefs = []; mockDeps = [];
  render(["unit-4"], other);
  render(["unit-4"], other).syncHail(accepted({ id: "hail-2", expires_at: "2026-11-21T04:00:02Z" }));
  render(["unit-4"], other).syncHail(null);
  const quiet = render(["unit-4"], other);
  expect(quiet.cooldown).toBeNull();
  expect(quiet.releasedUnit).toBeNull();
});
test("a 409 refusal starts a held cooldown that a stale nearby list cannot end", () => {
  const user = userN();
  render([], user);
  expect(render([], user).applyRefusal(refusal)).toBe(true);
  render([], user);
  const held = render([], user);
  expect(held.cooldown).toMatchObject({ serverHeld: true, unitNumber: "UNIT-004" });
  expect(held.label).toBe("1:00");
  expect(held.applyRefusal(new Error("offline"))).toBe(false);
});
