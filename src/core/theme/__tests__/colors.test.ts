import { describe, it, expect } from "@jest/globals";
import { commuterColors } from "../colors";

describe("Commuter Theme Color Tokens", () => {
  it("should define accessible brand theme colors", () => {
    expect(commuterColors.primary).toBeDefined();
    expect(commuterColors.background).toBeDefined();
    expect(commuterColors.surface).toBeDefined();
    expect(commuterColors.textPrimary).toBeDefined();
  });

  it("should have valid hex or rgba color formats", () => {
    const hexOrRgbaRegex = /^(#[0-9A-Fa-f]{3,8}|rgba?\([\d\s,.]+\))$/;
    expect(hexOrRgbaRegex.test(commuterColors.primary)).toBe(true);
    expect(hexOrRgbaRegex.test(commuterColors.background)).toBe(true);
    expect(hexOrRgbaRegex.test(commuterColors.surface)).toBe(true);
  });
});
