/// <reference types="jest" />
import React from "react";
import { DiscountApplicationScreen } from "../DiscountApplicationScreen";
import { DiscountApplicationEntry } from "../DiscountApplicationEntry";
import { discountApplicationService } from "../../../core/api/discount-application-service";
import type { ApplicationState } from "../application-types";
let mockStates: any[] = [], mockRefs: any[] = [], mockDeps: any[] = [], mockEffects: Array<() => void> = [];
let mockStateCursor = 0, mockRefCursor = 0, mockEffectCursor = 0;
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: (initial: unknown) => {
    const slot = mockStateCursor++;
    if (!(slot in mockStates)) mockStates[slot] = initial;
    return [mockStates[slot], (next: any) => { mockStates[slot] = typeof next === "function" ? next(mockStates[slot]) : next; }];
  },
  useRef: (initial: unknown) => { const slot = mockRefCursor++; return mockRefs[slot] ?? (mockRefs[slot] = { current: initial }); },
  useEffect: (effect: () => void, deps: unknown[]) => {
    const slot = mockEffectCursor++;
    if (!mockDeps[slot] || deps.some((dep, i) => dep !== mockDeps[slot][i])) { mockDeps[slot] = deps; mockEffects.push(effect); }
  },
}));
jest.mock("react-native", () => ({ ActivityIndicator: "Spinner", KeyboardAvoidingView: "Keyboard", Modal: "Modal", ScrollView: "Scroll", Text: "Text", View: "View", TouchableOpacity: "Button", Platform: { OS: "android" } }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("../../profile/ProfileIcon", () => ({ ProfileIcon: "ProfileIcon" }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useCommuterTheme: () => ({ colors: { background: "#fff", surface: "#fff", surfaceSecondary: "#f9fafb", surfaceHover: "#f3f4f6", border: "#e5e7eb", borderSubtle: "#e5e7eb", textPrimary: "#111827", textSecondary: "#4b5563", textMuted: "#6b7280", primary: "#1a5fb4", danger: "#ef4444" }, isLight: true }) }));
jest.mock("../../../shared/ui/FeatureControls", () => ({ FeatureButton: "Button", FeatureInput: "Input", featureStyles: {}, useFeatureStyles: () => ({ screen: {}, content: {}, title: {}, heading: {}, text: {}, muted: {}, error: {}, card: {} }) }));
jest.mock("../../student-renewal/SchoolProofFields", () => ({ SchoolProofFields: "SchoolProofFields" }));
jest.mock("../../student-renewal/SupportingDocumentField", () => {
  const React = jest.requireActual("react");
  return { SupportingDocumentField: ({ label, onChoose }: { label: string; onChoose: () => void }) => React.createElement("DocumentButton", { label, onChoose }) };
});
jest.mock("../../../core/api/discount-application-service", () => ({ discountApplicationService: { submit: jest.fn(), cancel: jest.fn() } }));
jest.mock("../../student-renewal/pick-renewal-document", () => ({ pickRenewalDocument: jest.fn(async () => new File(["proof"], "id.jpg", { type: "image/jpeg" })) }));
const state: ApplicationState = { commuter_type: "REGULAR", effective_fare_type: "REGULAR", discount_expires_at: null, document_required: true, can_submit: true, status: "NOT_APPLIED", application: null };
let current: ApplicationState | null;
const refresh = jest.fn(async () => {}), close = jest.fn(), renewal = jest.fn();
type Element = React.ReactElement<Record<string, any>>;
function walk(node: React.ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(walk);
  if (!React.isValidElement(node)) return [];
  const element = node as Element;
  return [element, ...walk(element.props.children)];
}
function render(loadError = "") {
  mockStateCursor = mockRefCursor = mockEffectCursor = 0;
  const nodes = walk(DiscountApplicationScreen({ state: current, loading: false, loadError, onRefresh: refresh, onClose: close, onGoHome: close, onOpenRenewal: renewal }));
  mockEffects.splice(0).forEach((effect) => effect());
  return nodes;
}
function button(label: string) { return render().find((node) => node.props.label === label || node.props.accessibilityLabel === label)!; }
async function flush() { for (let i = 0; i < 12; i++) await Promise.resolve(); }
async function choosePwd() { render(); button("PWD").props.onPress(); button("Choose supporting document").props.onChoose(); await flush(); }
beforeEach(() => {
  mockStates = []; mockRefs = []; mockDeps = []; mockEffects = []; current = state;
  jest.clearAllMocks();
  (discountApplicationService.submit as jest.Mock).mockResolvedValue({ ...state, can_submit: false, status: "PENDING" });
});
test("double submit taps send one request, then show pending rather than an editable form", async () => {
  await choosePwd();
  let resolve!: (value: unknown) => void;
  (discountApplicationService.submit as jest.Mock).mockReturnValue(new Promise((done) => { resolve = done; }));
  button("Submit application").props.onPress();
  const press = button("Confirm submission").props.onPress;
  press(); press();
  expect(discountApplicationService.submit).toHaveBeenCalledTimes(1);
  resolve({ ...state, status: "PENDING", can_submit: false }); await flush();
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(render().some((node) => node.props.label === "Submit application")).toBe(false);
  expect(render().some((node) => node.props.children === "Pending verification")).toBe(true);
});
test("offline submission remains retryable and never displays success", async () => {
  await choosePwd();
  (discountApplicationService.submit as jest.Mock).mockRejectedValue(new Error("Offline"));
  button("Submit application").props.onPress(); button("Confirm submission").props.onPress(); await flush();
  expect(render().some((node) => node.props.children === "Offline")).toBe(true);
  expect(refresh).not.toHaveBeenCalled();
  expect(button("Submit application").props.disabled).toBe(false);
});
test("stale revision conflict refreshes status instead of retrying a write", async () => {
  await choosePwd();
  (discountApplicationService.submit as jest.Mock).mockRejectedValue(Object.assign(new Error("Changed by Admin"), { status: 409 }));
  button("Submit application").props.onPress(); button("Confirm submission").props.onPress(); await flush();
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(discountApplicationService.submit).toHaveBeenCalledTimes(1);
});
const application = { id: "request", revision: 3, request_type: "APPLICATION", requested_type: "PWD", status: "NEEDS_CORRECTION", reason: "Clearer ID", school_name: null, education_level: null, grade_level: null, school_year: null, enrollment_term: null, submitted_at: "2026-10-15", correction_due_at: null } as const;
test("correction prefills its category, locks category changes, and sends its revision", async () => {
  current = { ...state, status: "NEEDS_CORRECTION", application };
  render();
  expect(button("PWD").props.disabled).toBe(true);
  button("Choose supporting document").props.onChoose(); await flush();
  button("Submit corrected documents").props.onPress(); button("Confirm submission").props.onPress(); await flush();
  const form = (discountApplicationService.submit as jest.Mock).mock.calls[0][0] as FormData;
  expect(form.get("application_id")).toBe("request"); expect(form.get("revision")).toBe("3");
});
test("cancellation requires confirmation and rapid confirmation taps write once", async () => {
  current = { ...state, can_submit: false, status: "PENDING", application: { ...application, status: "PENDING" } };
  (discountApplicationService.cancel as jest.Mock).mockResolvedValue({ ...state, status: "CANCELLED" });
  render(); button("Cancel application").props.onPress();
  expect(discountApplicationService.cancel).not.toHaveBeenCalled();
  const press = button("Confirm cancellation").props.onPress; press(); press(); await flush();
  expect(discountApplicationService.cancel).toHaveBeenCalledTimes(1);
  expect(discountApplicationService.cancel).toHaveBeenCalledWith("request");
});
test("a renewal request links to renewal, never to application submission", () => {
  current = { ...state, status: "PENDING", can_submit: false, application: { ...application, request_type: "RENEWAL" } };
  render(); button("View Student renewal").props.onPress();
  expect(renewal).toHaveBeenCalledTimes(1);
  expect(render().some((node) => node.props.label === "Cancel application")).toBe(false);
});
test("failed status fetch hides the form and offers refresh", () => {
  expect(render("Backend unavailable").some((node) => node.props.label === "PWD")).toBe(false);
  expect(render("Backend unavailable").some((node) => node.props.label === "Refresh status")).toBe(true);
});
test("approved discounted account no longer gets a Profile application entry", () => {
  expect(DiscountApplicationEntry({ state: { ...state, commuter_type: "PWD", effective_fare_type: "PWD", status: "APPROVED" }, loading: false, error: "", commuterType: "REGULAR", onOpen: close })).toBeNull();
});
