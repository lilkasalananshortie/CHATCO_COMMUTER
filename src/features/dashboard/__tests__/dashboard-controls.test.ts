/// <reference types="jest" />
import React from "react";
import { DashboardScreen } from "../DashboardScreen";
import { HailRangeHint } from "../HailRangeHint";
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
jest.mock("../PaymentHistoryModal", () => ({ PaymentHistoryModal: "History" }));
jest.mock("../../../shared/ui/MascotMessage", () => ({ MascotMessage: "Notice" }));
jest.mock("../useHoldToConfirm", () => ({ useHoldToConfirm: () => ({ holding: false, start: jest.fn(), cancel: jest.fn(), consumeCompleted: () => false }) }));
type Element = React.ReactElement<Record<string, any>>;
function walk(node: any): Element[] { if (Array.isArray(node)) return node.flatMap(walk); if (!React.isValidElement(node)) return []; const element = node as Element; return [element, ...walk(element.props.children)]; }
const props = { onOpenScan: jest.fn(), onOpenShareRide: jest.fn(), onOpenSos: jest.fn(), onOpenProfile: jest.fn() };
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

test("hail is present on the first render before any layout measurement", () => {
  const tree = render();
  expect(mockStates[14]).toBe(0);
  expect(tree.find(node => node.props.testID === "dashboard-hail-overlay")).toBeDefined();
  expect(tree.find(node => node.props.accessibilityLabel === "Cannot hail")).toBeDefined();
});
test("hail stays below the header and inside a short viewport with a tall tools panel", () => {
  render(); mockStates[14] = 500; mockStates[15] = 320;
  const dock = render().find(node => node.props.testID === "dashboard-hail-dock")!;
  const position = dock.props.style[1];
  expect(position.bottom).toBeGreaterThanOrEqual(12);
  expect(320 - position.bottom - 88).toBeGreaterThanOrEqual(96);
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
  const tree = render(); tree.find(node => node.props.accessibilityLabel === "Pay with GCash")!.props.onPress();
  expect(props.onOpenScan).toHaveBeenCalledTimes(1);
  expect(tree.filter(node => node.type === "Stop").map(node => node.props.stopColor)).toEqual(["#1A5FB4", "#123B6E"]);
});
test("SOS requires two taps, not a single click", () => {
  const now = jest.spyOn(Date, "now").mockReturnValue(100);
  const button = render().find(node => node.type === "Button" && walk(node).some(child => child.props.children === "SOS"))!;
  button.props.onPress(); expect(props.onOpenSos).not.toHaveBeenCalled();
  now.mockReturnValue(600); button.props.onPress(); expect(props.onOpenSos).toHaveBeenCalledTimes(1);
});
test("Share Ride opens the existing share flow", () => {
  render().find(node => node.type === "Button" && walk(node).some(child => child.props.children === "Share Ride"))!.props.onPress();
  expect(props.onOpenShareRide).toHaveBeenCalledTimes(1);
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
