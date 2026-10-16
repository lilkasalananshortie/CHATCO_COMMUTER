/// <reference types="jest" />
import { estimateFare, normalizeFareMatrix } from "../fare-estimate";
const raw = {
  route: { id: "route", name: "Published route" },
  points: [
    { id: "a", name: "A", pointNumber: 1, regularFare: 17, discountedFare: 13.6, landmarks: ["Market"] },
    { id: "b", name: "B", pointNumber: 2, regularFare: 19.25, discountedFare: 15.4 },
    { id: "c", name: "C", pointNumber: 9, regularFare: 42, discountedFare: 33.6 },
  ],
};
const matrix = normalizeFareMatrix(raw);
test("updated default minimum is 17 regular and 13.60 discounted", () => {
  expect(estimateFare(matrix, "a", "b", "REGULAR")).toEqual({ regular: 17, amount: 17, discount: 0 });
});
test.each(["STUDENT", "SENIOR", "PWD"] as const)("%s estimate uses published discounted fares", (kind) => {
  expect(estimateFare(matrix, "a", "b", kind)).toEqual({ regular: 17, amount: 13.6, discount: 3.4 });
});
test("long trip uses cumulative difference, not the endpoint absolute fare", () => {
  expect(estimateFare(matrix, "a", "c", "STUDENT")).toEqual({ regular: 25, amount: 20, discount: 5 });
  expect(estimateFare(matrix, "c", "a", "STUDENT")).toEqual(estimateFare(matrix, "a", "c", "STUDENT"));
});
test("same stop uses minimum fare", () => { expect(estimateFare(matrix, "a", "a", "REGULAR").amount).toBe(17); });
test("published configuration overrides defaults", () => {
  const custom = normalizeFareMatrix({ ...raw, config: { baseFareRegular: 20, baseFareDiscounted: 16 } });
  expect(estimateFare(custom, "a", "b", "STUDENT").amount).toBe(16);
});
test("missing points cannot become a fictional fare", () => {
  expect(() => normalizeFareMatrix({ route: raw.route, points: [] })).toThrow();
  expect(() => estimateFare(matrix, "unknown", "b", "REGULAR")).toThrow();
});
test("invalid configuration and point amounts are rejected", () => {
  expect(() => normalizeFareMatrix({ ...raw, config: { baseFareRegular: -1 } })).toThrow();
  expect(() => normalizeFareMatrix({ ...raw, points: [{ ...raw.points[0], regularFare: "bad" }] })).toThrow();
});
