/// <reference types="jest" />
import React from "react";
import { DashboardScreen } from "../DashboardScreen";
import { HailRangeHint } from "../HailRangeHint";
import { NearbyUnitsCard } from "../NearbyUnitsCard";
import { COLLAPSED_TOOLS_HEIGHT, hailDockBottom, newlyNearbyVehicle, toolsSheetCollapsedOffset } from "../dashboard-ui";
import { Linking } from "react-native";
let mockStates: any[] = [], mockIndex = 0;
jest.mock("react", () => ({ ...jest.requireActual("react"), useEffect: () => {}, useMemo: (fn: () => unknown) => fn(), useCallback: (fn: unknown) => fn, useRef: (value: unknown) => ({ current: value }),
  useState: (initial: unknown) => { const index = mockIndex++; if (!(index in mockStates)) mockStates[index] = typeof initial === "function" ? initial() : initial; return [mockStates[index], (value: any) => { mockStates[index] = typeof value === "function" ? value(mockStates[index]) : value; }]; },
}));
jest.mock("react-native", () => ({ View: "View", TouchableOpacity: "Button", Modal: "Modal", Linking: { openSettings: jest.fn().mockResolvedValue(undefined) }, ActivityIndicator: "Spinner", ScrollView: "Scroll", Image: "Image", Pressable: "Pressable", Animated: { View: "AnimatedView", Value: class { setValue() {} interpolate() { return 0; } } }, Easing: { inOut: (value: unknown) => value, out: (value: unknown) => value, ease: 1, linear: 2 }, Platform: { OS: "android" }, AppState: {}, Vibration: {}, StyleSheet: { create: (value: unknown) => value, absoluteFill: {} }, useWindowDimensions: () => ({ width: 390, height: 844 }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 12 }) }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("expo-location", () => ({}));
jest.mock("react-native-svg", () => ({ __esModule: true, default: "Svg", Defs: "Defs", LinearGradient: "Gradient", Stop: "Stop", Rect: "Rect" }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useCommuterTheme: () => ({ colors: jest.requireActual("../../../core/theme/colors").commuterColors }) }));
jest.mock("../../../core/api/commuter-service", () => ({ commuterService: {} }));
jest.mock("../CommuterLiveMap", () => ({ CommuterLiveMap: "Map" }), { virtual: true });
jest.mock("../usePublishedRoute", () => ({ usePublishedRoute: () => ({ coordinates: [[14.8, 120.8], [14.9, 120.9]], source: "backend" }) }));
jest.mock("../dashboard-sounds", () => ({ preloadDashboardSounds: jest.fn(), playDashboardSound: jest.fn() }));
jest.mock("../../fare/FareSheet", () => ({ FareSheet: "FareSheet" }));
jest.mock("../PaymentHistoryModal", () => ({ PaymentHistoryModal: "History" }));
jest.mock("../../../shared/ui/MascotMessage", () => ({ MascotMessage: "Notice" }));
jest.mock("../useHoldToConfirm", () => ({ useHoldToConfirm: () => ({ holding: false, start: jest.fn(), cancel: jest.fn(), consumeCompleted: () => false }) }));
type Element = React.ReactElement<Record<string, any>>;
function walk(node: any): Element[] { if (Array.isArray(node)) return node.flatMap(walk); if (!React.isValidElement(node)) return []; const element = node as Element; return [element, ...walk(element.props.children)]; }
const props = { onOpenScan: jest.fn(), onOpenShareRide: jest.fn(), onOpenProfile: jest.fn(), onOpenAnnouncements: jest.fn(), unreadAnnouncements: 3 };
function render(): Element[] {
  mockIndex = 0;
  return walk(DashboardScreen(props));
}
beforeEach(() => { mockStates = []; jest.clearAllMocks(); jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
test("the dashboard avatar opens profile", () => {
  render().find(node => node.props.accessibilityLabel === "View Profile")!.props.onPress();
  expect(props.onOpenProfile).toHaveBeenCalledTimes(1);
});

test("the compact header gives the name space without a time-of-day greeting", () => {
  const tree = render();
  expect(tree.some(node => node.props.children === "Commuter" && node.props.numberOfLines === 1)).toBe(true);
  expect(tree.some(node => typeof node.props.children === "string" && /^Good (morning|afternoon|evening)/.test(node.props.children))).toBe(false);
});

test("the home bell opens updates and displays the unread server count", () => {
  render().find(node => node.props.accessibilityLabel === "Open updates, 3 unread")!.props.onPress();
  expect(props.onOpenAnnouncements).toHaveBeenCalledTimes(1);
});

test("hail is present on the first render before any layout measurement", () => {
  const tree = render();
  expect(mockStates[13]).toBe(0);
  expect(tree.find(node => node.props.testID === "dashboard-hail-overlay")).toBeDefined();
  expect(tree.find(node => node.props.accessibilityLabel === "Cannot hail")).toBeDefined();
});
test("hail stays below the header and inside a short viewport with a tall tools panel", () => {
  render(); mockStates[13] = 500; mockStates[14] = 320;
  const dock = render().find(node => node.props.testID === "dashboard-hail-dock")!;
  const position = dock.props.style[1];
  expect(position.bottom).toBeGreaterThanOrEqual(12);
  expect(320 - position.bottom - 88).toBeGreaterThanOrEqual(96);
});

test("collapsed tools expose only their handle and keep the hail control beside it", () => {
  expect(COLLAPSED_TOOLS_HEIGHT).toBe(24);
  expect(toolsSheetCollapsedOffset(500)).toBe(500 - COLLAPSED_TOOLS_HEIGHT);
  expect(hailDockBottom(844, 500, 24, false)).toBe(COLLAPSED_TOOLS_HEIGHT + 6);
  render();
  const handle = render().find(node => node.props.accessibilityLabel === "Collapse tools sheet")!;
  handle.props.onPress();
  expect(render().find(node => node.props.accessibilityLabel === "Expand tools sheet")).toBeDefined();
});

test("nearby notifications do not repeat each poll and reset after leaving range", () => {
  const notified = new Set<string>();
  const nearby = [
    { vehicle: { vehicle_id: "unit-1", unit_number: "NAB 0002" }, distanceMeters: 80 },
    { vehicle: { vehicle_id: "unit-2", unit_number: "NAB 0003" }, distanceMeters: 90 },
  ] as any;
  expect(newlyNearbyVehicle(nearby, notified)).toBe(nearby[0]);
  expect(newlyNearbyVehicle(nearby, notified)).toBe(nearby[1]);
  expect(newlyNearbyVehicle(nearby, notified)).toBeNull();
  expect(newlyNearbyVehicle([], notified)).toBeNull();
  expect(newlyNearbyVehicle(nearby, notified)).toBe(nearby[0]);
});

test("a notification banner remains visible when the tools sheet is collapsed", () => {
  render();
  mockStates[15] = { title: "CHATCO Jeep Nearby!", message: "NAB 0002 is 80m away." };
  render().find(node => node.props.accessibilityLabel === "Collapse tools sheet")!.props.onPress();
  const tree = render();
  expect(tree.find(node => node.props.accessibilityLabel === "Expand tools sheet")).toBeDefined();
  expect(tree.find(node => node.props.accessibilityLabel === "Dismiss notification")).toBeDefined();
});
test("the visible hail pin is the web SVG rather than an icon-font glyph", () => {
  expect(render().some(node => node.props.name === "hail-pin" && node.props.size === 28)).toBe(true);
});
test("denied GPS has help next to hail, not a location panel", () => {
  render(); mockStates[5] = "denied";
  const tree = render();
  expect(tree.some(node => node.props.reason === "denied")).toBe(true);
  expect(tree.some(node => node.props.children === "Location access required")).toBe(false);
  expect(tree.find(node => node.props.accessibilityLabel === "Cannot hail")!.props.disabled).toBe(true);
  expect(tree.find(node => node.type === "Map")!.props.userLocation).toBeNull();
});
test("the GCash card opens scan and uses a web-matching gradient", () => {
  let tree = render();
  const card = tree.find(node => node.props.accessibilityLabel === "Pay with GCash")!;
  card.props.onPress();
  expect(props.onOpenScan).toHaveBeenCalledTimes(1);
  card.props.onLayout({ nativeEvent: { layout: { width: 350, height: 120 } } });
  tree = render();
  expect(tree.filter(node => node.type === "Stop").map(node => node.props.stopColor)).toEqual(["#1A5FB4", "#123B6E"]);
  expect(tree.find(node => node.type === "Gradient")?.props).toMatchObject({ x2: "100%", y2: "100%" });
  expect(tree.find(node => node.type === "Rect")?.props).toMatchObject({ width: 350, height: 120, rx: 16 });
});
test("GCash uses a rounded browser gradient on Expo Web", () => {
  const platform = jest.requireMock("react-native").Platform as { OS: string };
  platform.OS = "web";
  try {
    const gradient = render().find(node => node.type === "div" && String(node.props.style?.background).includes("linear-gradient"));
    expect(gradient?.props.style).toMatchObject({ borderRadius: 16, pointerEvents: "none" });
  } finally { platform.OS = "android"; }
});
test("dashboard omits SOS and keeps Share Ride", () => {
  expect(render().some(node => node.props.children === "SOS")).toBe(false);
  expect(render().some(node => node.props.children === "Share Ride")).toBe(true);
});
test("Share Ride opens the existing share flow", () => {
  render().find(node => node.type === "Button" && walk(node).some(child => child.props.children === "Share Ride"))!.props.onPress();
  expect(props.onOpenShareRide).toHaveBeenCalledTimes(1);
});

test("hail label distinguishes distance from the route and missing nearby jeeps", () => {
  render(); mockStates[5] = "available"; mockStates[4] = { latitude: 14.85, longitude: 120.85 };
  expect(render().some(node => node.props.children === "No nearby units")).toBe(true);
  expect(render().find(node => node.type === NearbyUnitsCard)!.props.unavailableReason).toBe("no-nearby-units");
  mockStates[4] = { latitude: 15.2, longitude: 121.2 };
  expect(render().some(node => node.props.children === "Too far")).toBe(true);
  expect(render().find(node => node.type === NearbyUnitsCard)!.props.unavailableReason).toBe("out-of-range");
  mockStates[5] = "unavailable";
  expect(render().some(node => node.props.children === "No GPS")).toBe(true);
});

test.each([
  ["out-of-range", "Too far from the route"],
  ["no-nearby-units", "No nearby units"],
] as const)("empty nearby card describes %s accurately", (unavailableReason, title) => {
  mockIndex = 0;
  const nodes = walk(NearbyUnitsCard({ vehicles: [], unavailableReason }));
  expect(nodes.some(node => node.props.children === title)).toBe(true);
  expect(nodes.some(node => node.props.children === "No units within 1 km")).toBe(false);
  if (unavailableReason === "out-of-range") expect(nodes.some(node => typeof node.props.children === "string" && node.props.children.includes("no available jeep"))).toBe(false);
});

test("the empty status card can be dismissed using its X", () => {
  const card = () => { mockIndex = 0; return walk(NearbyUnitsCard({ vehicles: [], unavailableReason: "out-of-range" })); };
  card().find(node => node.props.accessibilityLabel === "Dismiss unit status")!.props.onPress();
  expect(card()).toEqual([]);
});

test("dismissed route notice stays hidden when the card remounts during the app session", () => {
  const onDismiss = jest.fn();
  mockIndex = 0;
  const card = walk(NearbyUnitsCard({ vehicles: [], unavailableReason: "out-of-range", onDismiss }));
  card.find(node => node.props.accessibilityLabel === "Dismiss unit status")!.props.onPress();
  expect(onDismiss).toHaveBeenCalledTimes(1);
  mockStates = [];
  mockIndex = 0;
  expect(walk(NearbyUnitsCard({ vehicles: [], unavailableReason: "out-of-range", dismissed: true }))).toEqual([]);
  mockStates = [];
  mockIndex = 0;
  expect(walk(NearbyUnitsCard({ vehicles: [], unavailableReason: "out-of-range", dismissed: false })).some(node => node.props.children === "Too far from the route")).toBe(true);
});

function help() { mockIndex = 0; return walk(HailRangeHint({ reason: "denied", onRetry: jest.fn() })); }
test("the hail question mark opens and closes an independently interactive tooltip", () => {
  help().find(node => node.props.accessibilityLabel === "Why can't I hail?")!.props.onPress();
  expect(help().find(node => node.type === "Modal")!.props.visible).toBe(true);
  help().find(node => node.props.accessibilityLabel === "Close hail information")!.props.onPress();
  expect(help().find(node => node.type === "Modal")!.props.visible).toBe(false);
});
test("location guidance retains the device settings action outside the tools panel", () => {
  help().find(node => node.props.accessibilityLabel === "Why can't I hail?")!.props.onPress();
  help().find(node => node.type === "Pressable" && walk(node).some(child => child.props.children === "Open device settings"))!.props.onPress();
  expect(Linking.openSettings).toHaveBeenCalledTimes(1);
});
test("Android back dismisses hail information without starting a hail", () => {
  help().find(node => node.props.accessibilityLabel === "Why can't I hail?")!.props.onPress();
  help().find(node => node.type === "Modal")!.props.onRequestClose();
  expect(help().find(node => node.type === "Modal")!.props.visible).toBe(false);
});

test("Fare Matrix opens and repeatedly dismisses without replacing Share Ride or Payment History", () => {
  const open = () => render().find(node => node.props.accessibilityLabel === "Fare Matrix")!.props.onPress();
  for (let i = 0; i < 3; i++) {
    open();
    const sheet = render().find(node => node.type === "FareSheet")!;
    expect(sheet.props.visible).toBe(true); sheet.props.onClose();
    expect(render().find(node => node.type === "FareSheet")!.props.visible).toBe(false);
  }
  expect(render().some(node => node.props.accessibilityLabel === "Payment History")).toBe(true);
  expect(render().some(node => node.props.children === "Share Ride")).toBe(true);
});
