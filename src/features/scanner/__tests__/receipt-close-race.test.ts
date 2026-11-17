/// <reference types="jest" />
import React from "react";
import { ReceiptScanModal } from "../ReceiptScanModal";
import { commuterService } from "../../../core/api/commuter-service";

let states: unknown[] = [];
let refs: Array<{ current: unknown }> = [];
let stateIndex = 0;
let refIndex = 0;

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useMemo: (factory: () => unknown) => factory(),
  useEffect: () => {},
  useCallback: (callback: unknown) => callback,
  useRef: (initial: unknown) => { const index = refIndex++; return refs[index] ?? (refs[index] = { current: initial }); },
  useState: (initial: unknown) => {
    const index = stateIndex++;
    if (!(index in states)) states[index] = initial;
    return [states[index], (value: unknown) => { states[index] = value; }];
  },
}));
jest.mock("react-native", () => ({
  View: "View", TouchableOpacity: "Button", Modal: "Modal", ActivityIndicator: "Spinner",
  StyleSheet: { create: (styles: unknown) => styles, absoluteFill: {} },
}));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("expo-camera", () => ({ CameraView: "Camera", useCameraPermissions: () => [{ granted: true }, jest.fn()] }));
jest.mock("expo-haptics", () => ({ notificationAsync: () => Promise.resolve(), NotificationFeedbackType: { Success: 1 } }));
jest.mock("../../../shared/ui/BrandText", () => ({ Text: "Text", TextInput: "Input" }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useCommuterTheme: () => ({ colors: jest.requireActual("../../../core/theme/colors").commuterColors, isLight: false }) }));
jest.mock("../../../core/api/commuter-service", () => ({ commuterService: { claimReceipt: jest.fn() } }));

type Element = React.ReactElement<Record<string, any>>;
function walk(node: React.ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(walk);
  if (!React.isValidElement(node)) return [];
  const element = node as Element;
  return [element, ...walk(element.props.children)];
}
const closed = jest.fn();
const claimed = jest.fn();
function render(visible = true) {
  stateIndex = 0;
  refIndex = 0;
  return walk(ReceiptScanModal({ visible, onClose: closed, onClaimed: claimed }) as React.ReactNode);
}

beforeEach(() => { states = []; refs = []; jest.clearAllMocks(); });

test.each(["resolve", "reject"])("a receipt request that %ss after closing does not change the next scan", async outcome => {
  let resolve!: (value: unknown) => void;
  let reject!: (reason: unknown) => void;
  (commuterService.claimReceipt as jest.Mock).mockReturnValue(new Promise((yes, no) => { resolve = yes; reject = no; }));
  const nodes = render();
  nodes.find(node => node.type === "Camera")!.props.onBarcodeScanned({ data: "receipt-token" });
  expect(commuterService.claimReceipt).toHaveBeenCalledTimes(1);
  nodes.find(node => node.props.accessibilityLabel === "Close")!.props.onPress();
  if (outcome === "resolve") resolve({ transactionId: "old", alreadyClaimed: false, amount: 20 });
  else reject(new Error("old request failed"));
  await Promise.resolve();
  await Promise.resolve();
  expect(closed).toHaveBeenCalledTimes(1);
  expect(claimed).not.toHaveBeenCalled();
  expect(render().some(node => node.type === "Camera")).toBe(true);
  expect(states[0]).toBe("scanning");
  expect(states[1]).toBeNull();
});

test("a failed scan offers manual entry and submits the printed claim code", async () => {
  (commuterService.claimReceipt as jest.Mock)
    .mockRejectedValueOnce(new Error("Receipt not recognised"))
    .mockResolvedValueOnce({ transactionId: "ride", alreadyClaimed: false, amount: 20 });
  render().find(node => node.type === "Camera")!.props.onBarcodeScanned({ data: "bad-qr" });
  await Promise.resolve();
  expect(render().some(node => node.props.children === "Couldn't Claim")).toBe(true);

  render().find(node => node.props.accessibilityLabel === "Enter receipt code manually")!.props.onPress();
  const manual = render();
  expect(manual.some(node => node.type === "Input")).toBe(true);
  manual.find(node => node.type === "Input")!.props.onChangeText("CLAIM CODE: Ab12 Cd34");
  render().find(node => node.props.accessibilityLabel === "Claim ride with receipt code")!.props.onPress();
  expect(commuterService.claimReceipt).toHaveBeenLastCalledWith("Ab12Cd34");
  await Promise.resolve();
  expect(render().some(node => node.props.children === "Ride Counted!")).toBe(true);
});
