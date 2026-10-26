/// <reference types="jest" />
import { hailDockBottom, hailHint, isSosDoubleTap } from "../dashboard-ui";
test("the first SOS tap never opens confirmation, including clock zero", () => expect(isSosDoubleTap(null, 0)).toBe(false));
test("a second tap inside the web's 600 ms window opens confirmation", () => expect(isSosDoubleTap(100, 700)).toBe(true));
test("a slow second tap does not open SOS", () => expect(isSosDoubleTap(100, 701)).toBe(false));
test("clock rollback cannot count as a double tap", () => expect(isSosDoubleTap(100, 99)).toBe(false));
test.each(["denied", "unavailable", "out-of-range"] as const)("hail help provides actionable copy for %s", reason => {
  expect(hailHint(reason).title.length).toBeGreaterThan(0);
  expect(hailHint(reason).message).toMatch(/location|GPS/);
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
