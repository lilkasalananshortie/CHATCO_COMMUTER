/// <reference types="jest" />
import { WebIcon } from "../WebIcon";
import { webIconNodes } from "../web-icon-nodes";
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));
jest.mock("react-native-svg", () => ({ __esModule: true, default: "Svg", Path: "Path", Circle: "Circle", Line: "Line", Polyline: "Polyline", Rect: "Rect" }));
test("hail uses the two original web location paths", () => {
  expect(webIconNodes["hail-pin"]).toHaveLength(2);
  expect(webIconNodes["hail-pin"][0][1].d).toBe("M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z");
});
test("SOS uses ShieldAlert with the exclamation detail, not an empty shield", () => {
  expect(webIconNodes["shield-alert"]).toHaveLength(3);
  expect(webIconNodes["shield-alert"].some(([, props]) => "d" in props && props.d === "M12 8v4")).toBe(true);
});
test("share and QR controls retain the web inline SVG nodes", () => {
  expect(webIconNodes["share-ride"][0][1].d).toContain("M7.217 10.907");
  expect(webIconNodes["qr-code"]).toHaveLength(2);
});
test("native SVG geometry and stroke are fixed instead of font-dependent", () => {
  const icon = WebIcon({ name: "hail-pin", size: 28, color: "#FFFFFF" });
  expect(icon.props).toMatchObject({ width: 28, height: 28, viewBox: "0 0 24 24", fill: "none", stroke: "#FFFFFF", strokeWidth: 2.5, style: expect.objectContaining({ pointerEvents: "none" }) });
});
test("all copied shapes have a native renderer", () => {
  const allowed = new Set(["path", "circle", "line", "polyline", "rect"]);
  for (const nodes of Object.values(webIconNodes)) for (const [tag] of nodes) expect(allowed.has(tag)).toBe(true);
});
