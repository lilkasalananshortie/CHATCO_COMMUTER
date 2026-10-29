/// <reference types="jest" />
import React from "react";
import { FeedbackScreen } from "../FeedbackScreen";
import { commuterService } from "../../../core/api/commuter-service";
import type { Trip } from "../../../core/domain/types";
let mockStates: any[] = [], mockRefs: any[] = [], mockStateIndex = 0, mockRefIndex = 0;
jest.mock("react", () => ({
  ...jest.requireActual("react"), useEffect: () => {}, useCallback: (fn: unknown) => fn, useMemo: (fn: () => unknown) => fn(),
  useState: (initial: unknown) => { const index = mockStateIndex++; if (!(index in mockStates)) mockStates[index] = initial;
    return [mockStates[index], (next: any) => { mockStates[index] = typeof next === "function" ? next(mockStates[index]) : next; }]; },
  useRef: (initial: unknown) => { const index = mockRefIndex++; return mockRefs[index] ?? (mockRefs[index] = { current: initial }); },
}));
jest.mock("react-native", () => ({ View: "View", Text: "Text", ScrollView: "ScrollView", TouchableOpacity: "Button", TextInput: "Input", ActivityIndicator: "Spinner", Animated: { View: "AnimatedView", Value: class { setValue() {} interpolate() { return 0; } } }, Easing: { out: (value: unknown) => value, ease: 1 }, StyleSheet: { create: (styles: unknown) => styles } }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("react-native-svg", () => ({ __esModule: true, default: "Svg", Circle: "Circle", Path: "Path", Line: "Line", Polyline: "Polyline", Rect: "Rect" }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useCommuterTheme: () => ({ isLight: false }) }));
jest.mock("expo-camera", () => ({ CameraView: "Camera", useCameraPermissions: () => [{ granted: true }, jest.fn()] }));
jest.mock("expo-haptics", () => ({ notificationAsync: () => Promise.resolve(), NotificationFeedbackType: { Success: 1 } }));
jest.mock("../../../shared/ui/Mascot", () => ({ Mascot: "Mascot" }));
jest.mock("../../../core/api/commuter-service", () => ({ commuterService: { submitFeedback: jest.fn(), scanQr: jest.fn() } }));
type Element = React.ReactElement<Record<string, any>>;
function walk(node: any): Element[] { if (Array.isArray(node)) return node.flatMap(walk); if (!React.isValidElement(node)) return []; const e = node as Element; return [e, ...walk(e.props.children)]; }
const trip: Trip = { id: "ride", transaction_id: "ride", shift_id: "shift", payment_method: "CASH", can_leave_feedback: true };
function render(initialTrip: Trip | null = trip) { mockStateIndex = 0; mockRefIndex = 0; return walk(FeedbackScreen({ initialTrip })); }
function submit() { return render().find(e => e.type === "Button" && walk(e).some(child => typeof child.props.children === "string" && child.props.children.trim() === "Submit Feedback"))!; }
function ratings() { render(); mockStates[6] = 5; mockStates[7] = ["Safe Driving"]; mockStates[8] = "Driver note"; mockStates[9] = 2; mockStates[10] = ["Wrong Change"]; mockStates[11] = "Conductor note"; }
beforeEach(() => { mockStates = []; mockRefs = []; jest.resetAllMocks(); });
test("history feedback sends the shift, not transaction id, and retains unequal scores", async () => {
  ratings(); await submit().props.onPress();
  expect(commuterService.submitFeedback).toHaveBeenCalledWith(expect.objectContaining({ shift_id: "shift", rating: 5, conductor_rating: 2 }));
});
test("rapid submit taps send one feedback request", async () => {
  (commuterService.submitFeedback as jest.Mock).mockReturnValue(new Promise(() => {}));
  ratings(); const action = submit().props.onPress;
  void action(); void action(); expect(commuterService.submitFeedback).toHaveBeenCalledTimes(1);
});
test("existing feedback is displayed read-only without submit controls", () => {
  const tree = render({ ...trip, has_feedback: true, can_leave_feedback: false, feedback: { id: "f", shift_id: "shift", rating: 5, conductor_rating: 2, created_at: "2026-10-15" } });
  expect(tree.some(e => e.props.children === "Feedback Submitted")).toBe(true);
  expect(tree.some(e => e.type === "Input")).toBe(false);
  expect(commuterService.submitFeedback).not.toHaveBeenCalled();
});
test("ineligible history cannot submit even when handler is invoked directly", async () => {
  ratings(); mockStateIndex = 0; mockRefIndex = 0;
  const tree = walk(FeedbackScreen({ initialTrip: { ...trip, can_leave_feedback: false } }));
  await tree.find(e => e.type === "Button" && walk(e).some(child => typeof child.props.children === "string" && child.props.children.trim() === "Submit Feedback"))!.props.onPress();
  expect(commuterService.submitFeedback).not.toHaveBeenCalled();
});
test("scanner no longer provides an invented recent ride shortcut", () => {
  expect(render(null).some(e => typeof e.props.children === "string" && e.props.children.includes("Rate Recent Ride"))).toBe(false);
});

test("scanner copies the web modal header padding and 192px scan frame", () => {
  const tree = render(null);
  const camera = tree.find(e => e.type === "Camera")!;
  expect(camera).toBeDefined();
  const styles = tree.map(e => Object.assign({}, ...[e.props.style].flat().filter(Boolean)));
  expect(styles.some(s => s.padding === 20 && s.borderBottomWidth === 1)).toBe(true);
  expect(styles.some(s => s.width === 192 && s.height === 192)).toBe(true);
  expect(styles.some(s => s.width === 24 && s.borderTopWidth === 2)).toBe(true);
  expect(tree.some(e => e.props.accessibilityLabel === "Turn on flashlight")).toBe(false);
});

test("no-crew lookup offers check again for the same scanned unit without manual input", async () => {
  const raw = JSON.stringify({ vehicle_id: "vehicle", unit_number: "Unit 1" });
  (commuterService.scanQr as jest.Mock).mockRejectedValueOnce(Object.assign(new Error("No crew today"), { status: 404 }));
  const camera = render(null).find(e => e.type === "Camera")!;
  camera.props.onBarcodeScanned({ data: raw });
  for (let i = 0; i < 8; i++) await Promise.resolve();
  const tree = render(null);
  expect(tree.some(e => e.props.children === "No crew on duty")).toBe(true);
  expect(tree.some(e => e.type === "Input")).toBe(false);
  (commuterService.scanQr as jest.Mock).mockResolvedValueOnce({ shiftId: "shift", unitNumber: "Unit 1" });
  tree.find(e => e.type === "Button" && walk(e).some(c => c.props.children === "Check again"))!.props.onPress();
  for (let i = 0; i < 8; i++) await Promise.resolve();
  expect(commuterService.scanQr).toHaveBeenNthCalledWith(2, raw);
  expect(render(null).some(e => e.props.children === "No crew on duty")).toBe(false);
});
