/// <reference types="jest" />
import { getMascotSize, getWalkthroughMascotSize } from "../mascot-layout";

describe("responsive mascot dimensions", () => {
  test.each([
    [144, 390, 844, 144],
    [280, 320, 568, 136],
    [280, 844, 390, 93],
    [80, 320, 568, 80],
    [156, 768, 1024, 156],
    [144, 100, 400, 52],
  ])("fits requested %s in %s x %s", (requested, width, height, expected) => {
    expect(getMascotSize(requested, width, height)).toBe(expected);
  });
});

describe("mascot-only walkthrough fits the screen", () => {
  test.each([[320, 568, 1], [390, 844, 1], [280, 480, 1], [844, 390, 1], [768, 1024, 2]])(
    "reserves space for shapes and text at %s x %s, text scale %s",
    (width, height, fontScale) => {
      const size = getWalkthroughMascotSize(width, height, fontScale);
      expect(size + 32).toBeLessThanOrEqual(width - 48);
      expect(size).toBeLessThanOrEqual(280);
      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThanOrEqual(height * 0.36 / fontScale);
    },
  );
});
