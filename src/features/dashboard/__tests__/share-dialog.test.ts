/// <reference types="jest" />
import React from "react";
import { ShareRideModal } from "../../share/ShareRideModal";
import { commuterService } from "../../../core/api/commuter-service";
import * as Clipboard from "expo-clipboard";
let mockStates: any[] = [], mockIndex = 0;
jest.mock("react", () => ({ ...jest.requireActual("react"), useEffect: () => {}, useCallback: (fn: unknown) => fn, useRef: (value: unknown) => ({ current: value }),
  useState: (initial: unknown) => { const index = mockIndex++; if (!(index in mockStates)) mockStates[index] = initial; return [mockStates[index], (value: any) => { mockStates[index] = typeof value === "function" ? value(mockStates[index]) : value; }]; },
}));
jest.mock("react-native", () => ({ View: "View", TouchableOpacity: "Button", ActivityIndicator: "Spinner", Share: { share: jest.fn() }, AppState: {} }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("react-native-svg", () => ({ __esModule: true, default: "Svg", Path: "Path", Circle: "Circle", Line: "Line", Polyline: "Polyline", Rect: "Rect" }));
jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn().mockResolvedValue(undefined) }));
jest.mock("expo-location", () => ({}));
jest.mock("../../../core/api/commuter-service", () => ({ commuterService: { stopShareRide: jest.fn() } }));
jest.mock("../DashboardDialog", () => ({ DashboardDialog: "Dialog", useDashboardDialogStyles: () => ({ red: { color: "red" }, blue: { color: "blue" } }) }));
type Element = React.ReactElement<Record<string, any>>;
function walk(node: any): Element[] { if (Array.isArray(node)) return node.flatMap(walk); if (!React.isValidElement(node)) return []; const element = node as Element; return [element, ...walk(element.props.children)]; }
const onClose = jest.fn();
function render() { mockIndex = 0; return walk(ShareRideModal({ visible: true, onClose })); }
function button(text: string) { return render().find(node => node.type === "Button" && walk(node).some(child => child.props.children === text))!; }
beforeEach(() => { mockStates = []; jest.clearAllMocks(); jest.useFakeTimers(); render(); mockStates[0] = false; mockStates[2] = "https://chatco.online/share/test-link"; mockStates[4] = 1800; });
afterEach(() => jest.useRealTimers());
test("share dialog matches the web countdown-first hierarchy and footer actions", () => {
  const tree = render();
  expect(tree[0]!.props.title).toBe("Share live location");
  expect(tree.some(node => node.props.children === "Link active for")).toBe(true);
  expect(button("Stop sharing")).toBeDefined(); expect(button("Keep sharing")).toBeDefined();
  expect(tree.some(node => node.props.children === "LIVE")).toBe(false);
});
test("copy uses the existing share URL", async () => {
  await button("Copy").props.onPress();
  expect(Clipboard.setStringAsync).toHaveBeenCalledWith("https://chatco.online/share/test-link");
});
test("Keep sharing only closes the screen", () => {
  button("Keep sharing").props.onPress();
  expect(onClose).toHaveBeenCalledTimes(1); expect(commuterService.stopShareRide).not.toHaveBeenCalled();
});
test("expired links disable copying and remove stop controls", () => {
  mockStates[6] = true;
  expect(button("Copy").props.disabled).toBe(true);
  expect(render().some(node => node.props.children === "Stop sharing")).toBe(false);
  expect(button("Close")).toBeDefined();
});
test("duplicate stop taps call the existing backend action once", async () => {
  (commuterService.stopShareRide as jest.Mock).mockResolvedValue(undefined);
  const stop = button("Stop sharing").props.onPress;
  await Promise.all([stop(), stop()]);
  expect(commuterService.stopShareRide).toHaveBeenCalledTimes(1);
  expect(mockStates[9]).toBe(true);
});
