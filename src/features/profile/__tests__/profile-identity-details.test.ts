/// <reference types="jest" />
import React from "react";
import { ProfileIdentityDetails } from "../ProfileIdentityDetails";
let mockStates: any[] = [], mockIndex = 0;
jest.mock("react", () => ({ ...jest.requireActual("react"), useRef: () => ({ current: null }), useState: (initial: unknown) => {
  const i = mockIndex++; if (!(i in mockStates)) mockStates[i] = initial;
  return [mockStates[i], (value: unknown) => { mockStates[i] = value; }];
} }));
jest.mock("react-native", () => ({ View: "View", Text: "Text", Modal: "Modal", Pressable: "Button", useWindowDimensions: () => ({ width: 320, height: 568 }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 16 }) }));
jest.mock("../../../shared/ui/BrandText", () => ({ Text: "Text" }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useCommuterTheme: () => ({ colors: jest.requireActual("../../../core/theme/colors").commuterColors }) }));
jest.mock("../ProfileIcon", () => ({ ProfileIcon: "Icon" }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicon" }));
type E = React.ReactElement<Record<string, any>>;
function walk(node: any): E[] { if (Array.isArray(node)) return node.flatMap(walk); if (!React.isValidElement(node)) return []; const e = node as E; return [e, ...walk(e.props.children)]; }
const props = { name: "Kathryn Bernardo", username: "commuter004", verified: true, statusLabel: "Verified", roleLabel: "Student", discountPercentage: 20, student: true, expiresAt: "2099-06-30" };
function render(overrides = {}) { mockIndex = 0; return walk(ProfileIdentityDetails({ ...props, ...overrides })); }
beforeEach(() => { mockStates = []; });
test("aligned verified pill opens verified details and Android Back dismisses", () => {
  const tree = render();
  const row = tree.find(e => e.props.testID === "profile-identity-pills")!;
  expect(row).toBeDefined();
  expect(row.props.style).toMatchObject({ flexDirection: "row", alignItems: "center" });
  const pills = walk(row).filter(e => e.props.accessibilityLabel === "Account verification details" || e.props.accessibilityLabel === "Commuter role details");
  expect(pills).toHaveLength(2);
  expect(pills[0]!.props.style.minHeight).toBe(pills[1]!.props.style.minHeight);
  tree.find(e => e.props.accessibilityLabel === "Account verification details")!.props.onPress();
  expect(render().find(e => e.type === "Modal")!.props.visible).toBe(true);
  expect(render().some(e => e.props.children === "Your account is verified.")).toBe(true);
  render().find(e => e.type === "Modal")!.props.onRequestClose();
  expect(render().find(e => e.type === "Modal")!.props.visible).toBe(false);
});

test("double clicking verified then dismissing never replaces its fading content with role details", () => {
  const press = render().find(e => e.props.accessibilityLabel === "Account verification details")!.props.onPress;
  press(); press();
  expect(render().some(e => e.props.children === "Your account is verified.")).toBe(true);
  render().find(e => e.props.accessibilityLabel === "Dismiss profile details")!.props.onPress();
  const fading = render();
  expect(fading.find(e => e.type === "Modal")!.props.visible).toBe(false);
  expect(fading.some(e => e.props.children === "Your account is verified.")).toBe(true);
  expect(fading.some(e => typeof e.props.children === "string" && e.props.children.includes("fare discount:"))).toBe(false);
  expect(fading.find(e => e.props.accessibilityLabel === "Account verification details")!.props.accessibilityState.expanded).toBe(false);
});

test("switching from role to verified preserves verified content through close and reopen", () => {
  render().find(e => e.props.accessibilityLabel === "Commuter role details")!.props.onPress();
  render().find(e => e.type === "Modal")!.props.onRequestClose();
  render().find(e => e.props.accessibilityLabel === "Account verification details")!.props.onPress();
  render().find(e => e.props.accessibilityLabel === "Close profile details")!.props.onPress();
  expect(render().some(e => e.props.children === "Your account is verified.")).toBe(true);
  render().find(e => e.props.accessibilityLabel === "Account verification details")!.props.onPress();
  expect(render().find(e => e.type === "Modal")!.props.visible).toBe(true);
  expect(render().some(e => e.props.children === "Your account is verified.")).toBe(true);
});
test("student role tooltip shows the authoritative expiry", () => {
  render().find(e => e.props.accessibilityLabel === "Commuter role details")!.props.onPress();
  expect(render().some(e => String(e.props.children).includes("Expires on Jun 30, 2099."))).toBe(true);
  const panel = render().find(e => e.props.accessibilityViewIsModal)!;
  expect(panel.props.style.left + panel.props.style.width).toBeLessThanOrEqual(304);
});

test("normal names stay on one line and verification uses a neutral shield pill", () => {
  const normal = render().find(e => e.props.children === props.name)!;
  expect(normal.props.numberOfLines).toBe(1);
  expect(normal.props.adjustsFontSizeToFit).toBe(true);
  const verified = render().find(e => e.props.accessibilityLabel === "Account verification details")!;
  expect(verified.props.style.backgroundColor).toBe("#0E1628");
  expect(walk(verified).some(e => e.props.name === "shield-check")).toBe(true);
  const name = "Kathryn Very Long Middle Name Bernardo";
  expect(render({ name }).find(e => e.props.children === name)!.props.numberOfLines).toBe(2);
});
test.each(["Senior Citizen", "PWD"])("%s has role details without an invented expiration", roleLabel => {
  const override = { roleLabel, student: false };
  render(override).find(e => e.props.accessibilityLabel === "Commuter role details")!.props.onPress();
  expect(render(override).some(e => e.props.children === `${roleLabel} fare discount: 20%.`)).toBe(true);
  expect(render(override).some(e => typeof e.props.children === "string" && e.props.children.includes("Expires on"))).toBe(false);
});
test("unknown student expiry and pending verification do not invent account information", () => {
  const override = { verified: false, statusLabel: "Pending Verification", expiresAt: null, discountPercentage: 0 };
  expect(render(override).some(e => e.props.accessibilityLabel === "Account verification details")).toBe(false);
  render(override).find(e => e.props.accessibilityLabel === "Commuter role details")!.props.onPress();
  expect(render(override).some(e => typeof e.props.children === "string" && e.props.children.includes("Expiry date unavailable."))).toBe(true);
  render(override).find(e => e.props.accessibilityLabel === "Dismiss profile details")!.props.onPress();
  expect(render(override).find(e => e.type === "Modal")!.props.visible).toBe(false);
});
