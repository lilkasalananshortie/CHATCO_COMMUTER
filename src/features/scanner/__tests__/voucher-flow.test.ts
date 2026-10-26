/// <reference types="jest" />
import React from "react";
import { QrScannerModal } from "../QrScannerModal";
import { commuterService } from "../../../core/api/commuter-service";
import { Linking } from "react-native";

let mockStates: any[] = [];
let mockRefs: any[] = [];
let mockCursor = 0;
let mockRefCursor = 0;
jest.mock("react", () => ({
  ...jest.requireActual("react"),
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
  StyleSheet: { create: (styles: unknown) => styles }, Linking: { openURL: jest.fn() }, AppState: {},
}));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useCommuterTheme: () => ({ colors: {} }) }));
jest.mock("expo-camera", () => ({ CameraView: "Camera", useCameraPermissions: () => [{ granted: true }, jest.fn()] }));
jest.mock("expo-haptics", () => ({ notificationAsync: () => Promise.resolve(), NotificationFeedbackType: { Success: 1 } }));
jest.mock("../../../core/api/commuter-service", () => ({ commuterService: { claimGcash: jest.fn(), redeemVoucherForGcash: jest.fn(), simulatePayment: jest.fn(), getPaymentStatus: jest.fn() } }));
const api = commuterService as jest.Mocked<typeof commuterService>;
type Element = React.ReactElement<Record<string, any>>;
function walk(node: React.ReactNode): Element[] {
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
