/// <reference types="jest" />
import { hailDockBottom, hailHint } from "../dashboard-ui";
test.each(["denied", "unavailable"] as const)("hail help provides actionable copy for %s", reason => {
  expect(hailHint(reason).title.length).toBeGreaterThan(0);
  expect(hailHint(reason).message).toMatch(/location|GPS/);
});

test("hail help distinguishes route distance from unavailable nearby units", () => {
  expect(hailHint("out-of-range").message).toMatch(/within 1 km of the jeep route/);
  expect(hailHint("no-nearby-units").message).toMatch(/near the route, but no available jeep/);
});

test.each([[844, 0, 24, true], [320, 500, 24, true], [400, 900, 0, true], [844, 80, 24, false]] as const)("hail dock remains in viewport %s with panel height %s", (height, sheet, safeTop, expanded) => {
  const bottom = hailDockBottom(height, sheet, safeTop, expanded);
  expect(Number.isFinite(bottom)).toBe(true);
  expect(bottom).toBeGreaterThanOrEqual(12);
  expect(height - bottom - 88).toBeGreaterThanOrEqual(Math.max(96, safeTop + 72));
});
test("zero/invalid measurements use a visible fallback instead of hiding the hail", () => {
  expect(hailDockBottom(0, 0, 0, true)).toBeGreaterThan(0);
  expect(Number.isFinite(hailDockBottom(NaN, Infinity, 0, false))).toBe(true);
});
