/// <reference types="jest" />
import { normalizeFareMatrix } from "../fare-estimate";
import { emptySelection, matchesFarePoint, reconcileSelection, selectStop, subStops, swapStops } from "../fare-selection";
const matrix = normalizeFareMatrix({ route: { id: "r", name: "Route" }, points: [
  { id: "a", name: "Alpha", code: "ALP", pointNumber: 1, regularFare: 17, discountedFare: 13.6, landmarks: [" Market ", ""], subStops: ["Market"] },
  { id: "b", name: "Beta", pointNumber: 8, regularFare: 40, discountedFare: 32 },
], config: { baseBarangayCount: 5 } });
test("sub-stops trim, deduplicate and omit empty labels", () => expect(subStops(matrix.points[0]!)).toEqual(["Market"]));
test.each(["alp", "ALPHA", " market "])("search finds name, code or landmark: %s", query => expect(matchesFarePoint(matrix.points[0]!, query)).toBe(true));
test("published base coverage is retained", () => expect(matrix.config.baseBarangayCount).toBe(5));
test("clear removes the corresponding landmark without clearing the other selection", () => {
  const selection = selectStop(selectStop(emptySelection, "pickup", "a", "Market"), "destination", "b");
  expect(selectStop(selection, "pickup", "")).toEqual({ ...emptySelection, destination: "b" });
});
test("swap preserves point and landmark association", () => {
  const selection = selectStop(selectStop(emptySelection, "pickup", "a", "Market"), "destination", "b");
  expect(swapStops(selection)).toEqual({ pickup: "b", destination: "a", pickupLandmark: "", destinationLandmark: "Market" });
  expect(swapStops(swapStops(selection))).toEqual(selection);
});
test("incomplete selection cannot swap", () => expect(swapStops(selectStop(emptySelection, "pickup", "a"))).toEqual(selectStop(emptySelection, "pickup", "a")));
test("resume preserves published IDs and landmarks", () => {
  const selection = selectStop(selectStop(emptySelection, "pickup", "a", "Market"), "destination", "b");
  expect(reconcileSelection(selection, matrix)).toEqual(selection);
});
test("refresh discards removed stop IDs and removed landmarks", () => {
  const selection = { pickup: "a", destination: "deleted", pickupLandmark: "Old shop", destinationLandmark: "Old terminal" };
  expect(reconcileSelection(selection, matrix)).toEqual({ ...emptySelection, pickup: "a" });
});
