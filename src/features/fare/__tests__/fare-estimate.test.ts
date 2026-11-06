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

test("33 unpinned API stops retain IDs and calculate the complete route", () => {
  const current = normalizeFareMatrix({ ...raw, points: Array.from({ length: 33 }, (_, i) => ({ ...raw.points[0], id: String(i + 1), pointNumber: i + 1, latitude: null, longitude: null })) });
  expect(current.points).toHaveLength(33);
  expect(estimateFare(current, "1", "33", "STUDENT")).toEqual({ regular: 86.5, amount: 69.25, discount: 17.25 });
  expect(estimateFare(current, "33", "1", "REGULAR").amount).toBe(86.5);
});

test("discount applies before quarter rounding, never to the rounded regular fare", () => {
  const current = normalizeFareMatrix({ ...raw, config: { baseFareRegular: 17.35, discountRate: 20 } });
  expect(estimateFare(current, "a", "b", "PWD")).toEqual({ regular: 17.25, amount: 14, discount: 3.25 });
});
test("updated default minimum is 17 regular and 13.50 discounted", () => {
  expect(estimateFare(matrix, "a", "b", "REGULAR")).toEqual({ regular: 17, amount: 17, discount: 0 });
});
test.each(["STUDENT", "SENIOR", "PWD"] as const)("%s estimate uses published discounted fares", (kind) => {
  expect(estimateFare(matrix, "a", "b", kind)).toEqual({ regular: 17, amount: 13.5, discount: 3.5 });
});
test("long trip uses Financial Rules rather than stored endpoint fare differences", () => {
  expect(estimateFare(matrix, "a", "c", "STUDENT")).toEqual({ regular: 29, amount: 23.25, discount: 5.75 });
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

test("a trip beginning after stop 1 still counts both endpoints", () => {
  const current = normalizeFareMatrix({ ...raw, points: [
    { ...raw.points[0], pointNumber: 5, regularFare: 19.25, discountedFare: 15.4 },
    { ...raw.points[1], pointNumber: 10, regularFare: 30.5, discountedFare: 24.4 },
  ] });
  expect(estimateFare(current, "a", "b", "REGULAR").amount).toBe(21.75);
  expect(estimateFare(current, "a", "b", "STUDENT").amount).toBe(17.5);
});

test.each([0, 25, 100])("published %s percent discount applies to the final fare", rate => {
  const current = normalizeFareMatrix({ ...raw, config: { baseFareRegular: 20, baseFareDiscounted: 20 * (1 - rate / 100), baseBarangayCount: 3, succeedingFareRegular: 3, discountRate: rate } });
  const result = estimateFare(current, "a", "c", "PWD");
  expect(result.regular).toBe(38);
  expect(result.amount).toBe(38 * (1 - rate / 100));
});
