/// <reference types="jest" />
import { clampPhotoOffset, photoCropRect } from "../profile-photo-crop";

test("landscape photo starts with a centered square and dragging reaches both edges", () => {
  expect(photoCropRect(400, 200, 200, 1, { x: 0, y: 0 })).toEqual({ originX: 100, originY: 0, width: 200, height: 200 });
  expect(photoCropRect(400, 200, 200, 1, { x: 100, y: 0 }).originX).toBe(0);
  expect(photoCropRect(400, 200, 200, 1, { x: -100, y: 0 }).originX).toBe(200);
});

test("zoom and drag stay within image bounds in either orientation", () => {
  expect(photoCropRect(400, 200, 200, 2, { x: 0, y: 0 })).toEqual({ originX: 150, originY: 50, width: 100, height: 100 });
  expect(clampPhotoOffset(200, 400, 200, 1, { x: 90, y: -999 })).toEqual({ x: 0, y: -100 });
  expect(photoCropRect(200, 400, 200, 1, { x: 0, y: -100 })).toEqual({ originX: 0, originY: 200, width: 200, height: 200 });
});
