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
jest.mock("../../../core/api/commuter-service", () => ({ commuterService: { createShareRide: jest.fn(), stopShareRide: jest.fn() } }));
jest.mock("../DashboardDialog", () => ({ DashboardDialog: "Dialog", useDashboardDialogStyles: () => ({ red: { color: "red" }, blue: { color: "blue" } }) }));
type Element = React.ReactElement<Record<string, any>>;
function walk(node: any): Element[] { if (Array.isArray(node)) return node.flatMap(walk); if (!React.isValidElement(node)) return []; const element = node as Element; return [element, ...walk(element.props.children)]; }
const onClose = jest.fn();
function render() { mockIndex = 0; return walk(ShareRideModal({ visible: true, onClose })); }
function button(text: string) { return render().find(node => node.type === "Button" && walk(node).some(child => child.props.children === text))!; }
beforeEach(() => { mockStates = []; jest.clearAllMocks(); jest.useFakeTimers(); render(); });
afterEach(() => jest.useRealTimers());
test("opening the dialog shows Generate link and Close without starting the countdown", () => {
  const tree = render();
  expect(tree[0]!.props.title).toBe("Share live location");
  expect(tree[0]!.props.animateEntrance).toBe(true);
  expect(tree.some(node => node.props.accessibilityRole === "timer")).toBe(false);
  expect(button("Generate link")).toBeDefined();
  button("Close").props.onPress();
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(commuterService.createShareRide).not.toHaveBeenCalled();
});

test("generating a link reveals the timer with Cancel and Close", async () => {
  (commuterService.createShareRide as jest.Mock).mockResolvedValue({ token: "token", share_url: "https://chatco.online/share/test-link", expires_at: new Date(Date.now() + 1800000).toISOString() });
  await button("Generate link").props.onPress();
  mockStates[4] = 1800;
  const tree = render();
  expect(commuterService.createShareRide).toHaveBeenCalledTimes(1);
  expect(tree.some(node => node.props.accessibilityRole === "timer")).toBe(true);
  expect(button("Cancel")).toBeDefined();
  expect(button("Close")).toBeDefined();
});

test("closing while generation is pending stops the unseen link", async () => {
  let resolveLink!: (value: { token: string; share_url: string; expires_at: string }) => void;
  (commuterService.createShareRide as jest.Mock).mockReturnValue(new Promise(resolve => { resolveLink = resolve; }));
  (commuterService.stopShareRide as jest.Mock).mockResolvedValue(undefined);
  const tree = render();
  const action = (label: string) => tree.find(node => node.type === "Button" && walk(node).some(child => child.props.children === label))!;
  const pending = action("Generate link").props.onPress();
  action("Close").props.onPress();
  resolveLink({ token: "token", share_url: "https://chatco.online/share/test-link", expires_at: new Date(Date.now() + 1800000).toISOString() });
  await pending;
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(commuterService.stopShareRide).toHaveBeenCalledTimes(1);
  expect(mockStates[2]).toBe("");
});

function showActiveLink() { mockStates[2] = "https://chatco.online/share/test-link"; mockStates[3] = new Date(Date.now() + 1800000).toISOString(); mockStates[4] = 1800; }
test("copy uses the existing share URL", async () => {
  showActiveLink();
  await button("Copy").props.onPress();
  expect(Clipboard.setStringAsync).toHaveBeenCalledWith("https://chatco.online/share/test-link");
});
test("Close keeps the active share running", () => {
  showActiveLink();
  button("Close").props.onPress();
  expect(onClose).toHaveBeenCalledTimes(1); expect(commuterService.stopShareRide).not.toHaveBeenCalled();
});
test("expired links disable copying and remove stop controls", () => {
  showActiveLink();
  mockStates[6] = true;
  expect(render().some(node => node.props.accessibilityRole === "timer")).toBe(false);
  expect(button("Generate link")).toBeDefined();
  expect(button("Close")).toBeDefined();
});
test("duplicate stop taps call the existing backend action once", async () => {
  showActiveLink();
  (commuterService.stopShareRide as jest.Mock).mockResolvedValue(undefined);
  const stop = button("Cancel").props.onPress;
  await Promise.all([stop(), stop()]);
  expect(commuterService.stopShareRide).toHaveBeenCalledTimes(1);
  expect(mockStates[9]).toBe(true);
});
