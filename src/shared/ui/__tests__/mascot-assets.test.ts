/// <reference types="jest" />
/// <reference types="node" />
import { readFileSync } from "fs";
import { resolve } from "path";

describe("bundled commuter mascot artwork", () => {
  test.each(["greeting", "phone", "envelope", "key", "reward", "thanks", "noticeboard", "offline", "not-found", "fleet-action", "scan-action", "guardian-action", "vault-action"])("%s is a real transparent PNG bundled statically", (pose) => {
    const filename = `mascot-${pose}.png`;
    const bytes = readFileSync(resolve(__dirname, "../../../../assets/mascot", filename));
    expect(bytes.subarray(1, 4).toString()).toBe("PNG");
    expect(bytes.readUInt32BE(16)).toBeGreaterThanOrEqual(512);
    expect(bytes.readUInt32BE(20)).toBeGreaterThanOrEqual(512);
    // PNG RGBA color type or an explicit transparency chunk.
    expect(bytes[25] === 6 || bytes.includes(Buffer.from("tRNS"))).toBe(true);
    expect(readFileSync(resolve(__dirname, "../Mascot.tsx"), "utf8")).toContain(filename);
  });
});
