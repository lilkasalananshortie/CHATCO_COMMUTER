/// <reference types="jest" />
import React from "react";
import { QrScannerModal } from "../QrScannerModal";
import { commuterService } from "../../../core/api/commuter-service";
import { Linking } from "react-native";
import { GroupVoucherPicker } from "../GroupVoucherPicker";

let mockStates: any[] = [];
let mockRefs: any[] = [];
let mockCursor = 0;
let mockRefCursor = 0;
let mockLight = false;
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useMemo: (factory: () => unknown) => factory(),
  useEffect: () => {},
  useCallback: (callback: unknown) => callback,
  useRef: (initial: unknown) => {
    const index = mockRefCursor++;
    if (!(index in mockRefs)) mockRefs[index] = { current: initial };
    return mockRefs[index];
  },
  useState: (initial: unknown) => {
    const index = mockCursor++;
    if (!(index in mockStates)) mockStates[index] = initial;
    return [mockStates[index], (value: unknown) => { mockStates[index] = value; }];
  },
}));
jest.mock("react-native", () => ({
  View: "View", Text: "Text", TextInput: "Input", ScrollView: "ScrollView", TouchableOpacity: "Button", Modal: "Modal", ActivityIndicator: "Spinner",
  useWindowDimensions: () => ({ height: 844, width: 390 }), StyleSheet: { create: (styles: unknown) => styles }, Linking: { openURL: jest.fn() }, AppState: {},
}));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useCommuterTheme: () => ({
  isLight: mockLight,
  colors: mockLight ? { ...jest.requireActual("../../../core/theme/colors").commuterColors, surface: "#FFFFFF", textPrimary: "#111827", textSecondary: "#4B5563", textMuted: "#6B7280", border: "#E5E7EB", surfaceSecondary: "#F9FAFB" } : jest.requireActual("../../../core/theme/colors").commuterColors,
}) }));
jest.mock("expo-camera", () => ({ CameraView: "Camera", useCameraPermissions: () => [{ granted: true }, jest.fn()] }));
jest.mock("expo-haptics", () => ({ notificationAsync: () => Promise.resolve(), NotificationFeedbackType: { Success: 1 } }));
jest.mock("../../../core/api/commuter-service", () => ({ commuterService: { claimGcash: jest.fn(), redeemVoucherForGcash: jest.fn(), simulatePayment: jest.fn(), getPaymentStatus: jest.fn() } }));
jest.mock("../../../shared/useReducedMotion", () => ({ useReducedMotion: () => true }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 12 }) }));
const api = commuterService as jest.Mocked<typeof commuterService>;
type Element = React.ReactElement<Record<string, any>>;
function walk(node: React.ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(walk);
  if (!React.isValidElement(node)) return [];
  const element = node as Element;
  const children = element.props.children;
  return [element, ...(Array.isArray(children) ? children.flatMap(walk) : walk(children))];
}
const success = jest.fn();
const closed = jest.fn();
function render() {
  mockCursor = 0; mockRefCursor = 0;
  return walk(QrScannerModal({ visible: true, onClose: closed, onPaymentSuccess: success }) as React.ReactNode);
}
function button(label: string) {
  return render().find((e) => e.type === "Button" && walk(e).some((child) => child.props.children === label))!;
}
function scan() { render().find((e) => e.type === "Camera")!.props.onBarcodeScanned({ data: "qr-token" }); }
async function flush() { for (let i = 0; i < 6; i++) await Promise.resolve(); }
const claim = { transactionId: "ride", amount: 30, regularAmount: 30, discountAmount: 0, voucherAvailable: true, availableVoucher: { id: "v", type: "DISCOUNT" as const, amount: 5 }, isGroup: true };
beforeEach(() => {
  mockLight = false;
  mockStates = []; mockRefs = []; mockCursor = 0; mockRefCursor = 0;
  jest.resetAllMocks();
  api.claimGcash.mockResolvedValue(claim);
});

test("discount offer never promises the whole group a free ride", async () => {
  scan(); await flush();
  expect(render().some((e) => e.props.children === "Use ₱5.00 Discount Voucher?")).toBe(true);
  expect(render().some((e) => typeof e.props.children === "string" && e.props.children.includes("your seat only"))).toBe(true);
});
test("rapid scans send one claim request", async () => {
  let resolve!: (value: any) => void;
  api.claimGcash.mockReturnValue(new Promise((done) => { resolve = done; }));
  const nodes = render(); const scanHandler = nodes.find((e) => e.type === "Camera")!.props.onBarcodeScanned;
  scanHandler({ data: "qr-token" }); scanHandler({ data: "qr-token" });
  expect(api.claimGcash).toHaveBeenCalledTimes(1);
  resolve(claim); await flush();
});

test("GCash scanning keeps the camera and close action without manual token entry", () => {
  const nodes = render();
  expect(nodes.some(node => node.type === "Camera")).toBe(true);
  expect(nodes.some(node => node.props.accessibilityLabel === "Close scanner")).toBe(true);
  expect(nodes.some(node => node.type === "Input" || node.props.children === "Enter token manually" || node.props.children === "Payment QR Token")).toBe(false);
});
test("voucher id is submitted once and the remaining amount is shown", async () => {
  scan(); await flush();
  let resolve!: (value: any) => void;
  api.redeemVoucherForGcash.mockReturnValue(new Promise((done) => { resolve = done; }));
  const press = button("Use My Voucher").props.onPress;
  const first = press(); const second = press();
  expect(api.redeemVoucherForGcash).toHaveBeenCalledTimes(1);
  expect(api.redeemVoucherForGcash).toHaveBeenCalledWith("ride", "v");
  resolve({ ...claim, amount: 25, voucherAvailable: false, availableVoucher: null });
  await Promise.all([first, second]);
  expect(mockStates[0]).toBe("confirm");
  expect(mockStates[1].amount).toBe(25);
  expect(success).not.toHaveBeenCalled();
});
test("fully covered voucher succeeds only after redemption response", async () => {
  scan(); await flush();
  api.redeemVoucherForGcash.mockResolvedValue({ ...claim, amount: 0, voucherAvailable: false });
  await button("Use My Voucher").props.onPress();
  expect(mockStates[0]).toBe("success"); expect(success).toHaveBeenCalledTimes(1);
});
test("opening checkout cannot mark the payment paid", async () => {
  api.claimGcash.mockResolvedValue({ ...claim, voucherAvailable: false, checkoutUrl: "https://checkout.test" });
  (Linking.openURL as jest.Mock).mockResolvedValue(undefined);
  scan(); await flush();
  expect(mockStates[0]).toBe("awaiting_payment"); expect(success).not.toHaveBeenCalled();
  api.getPaymentStatus.mockResolvedValue({ status: "PENDING" });
  await button("Check payment status").props.onPress();
  expect(mockStates[0]).toBe("awaiting_payment");
  api.getPaymentStatus.mockResolvedValue({ status: "PAID" });
  await button("Check payment status").props.onPress();
  expect(mockStates[0]).toBe("success"); expect(success).toHaveBeenCalledTimes(1);
});
test("sandbox non-paid response never displays success", async () => {
  api.claimGcash.mockResolvedValue({ ...claim, voucherAvailable: false });
  scan(); await flush();
  api.simulatePayment.mockResolvedValue({ status: "EXPIRED" });
  await button("Confirm").props.onPress();
  expect(mockStates[0]).toBe("failed"); expect(success).not.toHaveBeenCalled();
});
test("expired voucher errors are shown, not swallowed", async () => {
  scan(); await flush();
  api.redeemVoucherForGcash.mockRejectedValue(new Error("Voucher expired"));
  await button("Use My Voucher").props.onPress();
  expect(mockStates[0]).toBe("failed"); expect(mockStates[2]).toBe("Voucher expired");
});
test("late checkout response cannot reopen a closed scanner", async () => {
  api.claimGcash.mockResolvedValue({ ...claim, voucherAvailable: false, checkoutUrl: "https://checkout.test" });
  let resolve!: () => void;
  (Linking.openURL as jest.Mock).mockReturnValue(new Promise<void>((done) => { resolve = done; }));
  scan(); await flush();
  render().find((e) => e.type === "Modal")!.props.onRequestClose();
  resolve(); await flush();
  expect(mockStates[0]).toBe("scanning"); expect(closed).toHaveBeenCalledTimes(1);
  expect(success).not.toHaveBeenCalled();
});

test.each([false, true])("all payment states render readable text in light=%s appearance", light => {
  mockLight = light;
  for (const [step, label] of [
    ["scanning", "Scan Payment QR"],
    ["verifying", "Verifying Transaction"],
    ["voucher_offer", "Use ₱5.00 Discount Voucher?"],
    ["confirm", "Amount Due"],
    ["redirecting", "Processing Payment"],
    ["awaiting_payment", "Waiting for payment confirmation"],
    ["success", "Payment Claimed"],
    ["failed", "Payment Failed"],
  ]) {
    mockStates = [step, claim, "Connection unavailable", "", false, false];
    const nodes = render();
    const text = nodes.find(node => node.props.children === label)!;
    expect(text).toBeDefined();
    expect(text.props.style.color).toBe(light ? (step === "confirm" ? "#6B7280" : "#111827") : (step === "confirm" ? "rgba(255, 255, 255, 0.4)" : "#FFFFFF"));
    expect(nodes.find(node => node.props.accessibilityLabel === "Close scanner")).toBeDefined();
  }
});

test.each([false, true])("group vouchers use the selected appearance without redeeming on render (light=%s)", light => {
  mockLight = light;
  const use = jest.fn();
  const nodes = walk(GroupVoucherPicker({
    vouchers: [{ id: "v", type: "DISCOUNT", amount: 5 }],
    seats: [{ position: 1, passengerType: "REGULAR", fare: 30, isPayer: true }],
    onUse: use,
    onPayInstead: jest.fn(),
  }));
  expect(nodes.find(node => node.props.children === "Use vouchers for your group")!.props.style.color).toBe(light ? "#111827" : "#FFFFFF");
  expect(nodes.find(node => node.props.accessibilityRole === "checkbox")!.props.style[1].backgroundColor).toBe(light ? "#F9FAFB" : jest.requireActual("../../../core/theme/colors").commuterColors.surfaceSecondary);
  expect(use).not.toHaveBeenCalled();
  expect(api.redeemVoucherForGcash).not.toHaveBeenCalled();
});
