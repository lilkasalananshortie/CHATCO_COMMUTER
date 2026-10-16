/// <reference types="jest" />
import React from "react";
import { SosModal } from "../SosModal";
import { getSosLocation } from "../location-fix";
import { commuterService } from "../../../core/api/commuter-service";
let mockStates: any[] = [], mockRefs: any[] = [], mockEffects: Array<() => any> = [];
let mockStateIndex = 0, mockRefIndex = 0;
jest.mock("react", () => ({ ...jest.requireActual("react"), useCallback: (fn: unknown) => fn,
  useEffect: (fn: () => any) => { mockEffects.push(fn); },
  useRef: (initial: unknown) => { const i = mockRefIndex++; return mockRefs[i] ?? (mockRefs[i] = { current: initial }); },
  useState: (initial: unknown) => { const i = mockStateIndex++; if (!(i in mockStates)) mockStates[i] = initial; return [mockStates[i], (next: any) => { mockStates[i] = typeof next === "function" ? next(mockStates[i]) : next; }]; },
}));
jest.mock("react-native", () => ({ View: "View", Text: "Text", Modal: "Modal", TouchableOpacity: "Button", ActivityIndicator: "Spinner", StyleSheet: { create: (s: unknown) => s }, Linking: { openURL: jest.fn() } }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("../location-fix", () => ({ getSosLocation: jest.fn() }));
jest.mock("../../../core/api/commuter-service", () => ({ commuterService: { triggerSos: jest.fn(), getSosStatus: jest.fn() } }));
type Element = React.ReactElement<Record<string, any>>;
function walk(node: any): Element[] { if (Array.isArray(node)) return node.flatMap(walk); if (!React.isValidElement(node)) return []; const e = node as Element; return [e, ...walk(e.props.children)]; }
function render(visible = true) { mockStateIndex = 0; mockRefIndex = 0; mockEffects = []; return walk(SosModal({ visible, onClose: jest.fn() })); }
function send() { return render().find(e => e.type === "Button" && walk(e).some(child => child.props.children === "Send SOS"))!.props.onPress; }
beforeEach(() => { mockStates = []; mockRefs = []; jest.resetAllMocks(); });
test("GPS failure never calls the SOS API and offers retry/call controls", async () => {
  (getSosLocation as jest.Mock).mockRejectedValue(new Error("Location unavailable. Retry or call."));
  await send()();
  expect(commuterService.triggerSos).not.toHaveBeenCalled();
  const tree = render();
  expect(tree.some(e => e.props.children === "Try Again")).toBe(true);
  expect(tree.some(e => e.props.children === "PNP / 911")).toBe(true);
});
test("valid fix sends actual coordinates once despite duplicate activation", async () => {
  (getSosLocation as jest.Mock).mockResolvedValue({ latitude: 14.7, longitude: 120.9 });
  (commuterService.triggerSos as jest.Mock).mockResolvedValue({ id: "sos", status: "ACTIVE" });
  const activate = send(); await Promise.all([activate(), activate()]);
  expect(commuterService.triggerSos).toHaveBeenCalledTimes(1);
  expect(commuterService.triggerSos).toHaveBeenCalledWith(expect.objectContaining({ lat: 14.7, lng: 120.9 }));
});
test("late GPS response after modal/session unmount does not send an alert", async () => {
  let finish!: (value: unknown) => void;
  (getSosLocation as jest.Mock).mockReturnValue(new Promise(done => { finish = done; }));
  const action = send(); const cleanup = mockEffects[0]!();
  const pending = action(); cleanup();
  finish({ latitude: 14.7, longitude: 120.9 }); await pending;
  expect(commuterService.triggerSos).not.toHaveBeenCalled();
});
