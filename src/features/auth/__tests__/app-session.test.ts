/// <reference types="jest" />
import React from "react";
import App from "../../../../App";
import { setSessionEndedHandler } from "../../../core/api/api-client";
import { commuterService } from "../../../core/api/commuter-service";
import { authService } from "../../../core/api/auth-service";
let mockStates: any[] = [], mockRefs: any[] = [], mockEffects: Array<() => any> = [];
let mockStateIndex = 0, mockRefIndex = 0;
jest.mock("react", () => ({ ...jest.requireActual("react"),
  useCallback: (fn: unknown) => fn, useEffect: (fn: () => any) => { mockEffects.push(fn); },
  useRef: (initial: unknown) => { const i = mockRefIndex++; return mockRefs[i] ?? (mockRefs[i] = { current: initial }); },
  useState: (initial: unknown) => { const i = mockStateIndex++; if (!(i in mockStates)) mockStates[i] = initial; return [mockStates[i], (next: any) => { mockStates[i] = typeof next === "function" ? next(mockStates[i]) : next; }]; },
}));
jest.mock("react-native", () => ({ View: "View", Text: "Text", Pressable: "Pressable", Modal: "Modal", ActivityIndicator: "Spinner", StyleSheet: { create: (s: unknown) => s },
  Platform: { OS: "android" }, Animated: { View: "AnimatedView", Value: class { setValue() {} interpolate() {} }, timing: () => ({ start() {} }) }, Easing: { out: (v: any) => v, cubic: 1 } }));
jest.mock("react-native-safe-area-context", () => ({ SafeAreaProvider: "SafeArea", useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("expo-status-bar", () => ({ StatusBar: "StatusBar" }));
jest.mock("../../../shared/ui/BrandFonts", () => ({ BrandFonts: "BrandFonts" }));
jest.mock("../../../shared/ui/BrandText", () => ({ Text: "Text", TextInput: "TextInput" }));
jest.mock("@react-native-async-storage/async-storage", () => ({ getItem: jest.fn().mockResolvedValue("done") }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ ThemeProvider: "Theme", useCommuterTheme: () => ({ colors: jest.requireActual("../../../core/theme/colors").commuterColors }) }));
jest.mock("../../../core/api/api-client", () => ({ setSessionEndedHandler: jest.fn(() => jest.fn()) }));
jest.mock("../../../core/api/auth-service", () => ({ authService: { restoreSession: jest.fn().mockResolvedValue(null) } }));
jest.mock("../../../core/api/commuter-service", () => ({ commuterService: { getProfile: jest.fn() } }));
jest.mock("../../../core/domain/rewards-events", () => ({ subscribeRewardsChanged: jest.fn() }));
jest.mock("../../../shared/ui/CommuterBottomNav", () => ({ CommuterBottomNav: "Nav" }));
jest.mock("../../../shared/ui/MascotErrorBoundary", () => ({ MascotErrorBoundary: "Boundary" }));
jest.mock("../../splash/SplashScreen", () => ({ SplashScreen: "Splash" }));
jest.mock("../../onboarding/OnboardingScreen", () => ({ OnboardingScreen: "Onboarding", ONBOARDING_STORAGE_KEY: "onboarding" }));
jest.mock("../LoginScreen", () => ({ LoginScreen: "Login" }));
jest.mock("../RegisterScreen", () => ({ RegisterScreen: "Register" }));
jest.mock("../../dashboard/DashboardScreen", () => ({ DashboardScreen: "Dashboard" }));
jest.mock("../../lostfound/LostFoundScreen", () => ({ LostFoundScreen: "LostFound" }));
jest.mock("../../rewards/RewardsScreen", () => ({ RewardsScreen: "Rewards" }));
jest.mock("../../feedback/FeedbackScreen", () => ({ FeedbackScreen: "Feedback" }));
jest.mock("../../profile/ProfileScreen", () => ({ ProfileScreen: "Profile" }));
jest.mock("../../scanner/QrScannerModal", () => ({ QrScannerModal: "Scanner" }));
jest.mock("../../scanner/ReceiptScanModal", () => ({ ReceiptScanModal: "Receipt" }));
jest.mock("../../share/ShareRideModal", () => ({ ShareRideModal: "Share" }));
jest.mock("../../fare/FareScreen", () => ({ FareScreen: "Fare" }));
jest.mock("../../student-renewal/StudentRenewalScreen", () => ({ StudentRenewalScreen: "Renewal" }));
jest.mock("../../student-renewal/RenewalReminder", () => ({ RenewalReminder: "Reminder" }));
jest.mock("../../student-renewal/useStudentRenewal", () => ({ useStudentRenewal: () => ({ state: null, refresh: jest.fn() }) }));
jest.mock("../../discount-application/DiscountApplicationScreen", () => ({ DiscountApplicationScreen: "Application" }));
jest.mock("../../discount-application/useDiscountApplication", () => ({ useDiscountApplication: () => ({ state: null, refresh: jest.fn(), refreshAfterMutation: jest.fn() }) }));
type Element = React.ReactElement<Record<string, any>>;
function walk(node: any): Element[] { if (Array.isArray(node)) return node.flatMap(walk); if (!React.isValidElement(node)) return []; const e = node as Element; return [e, ...walk(e.props.children)]; }
function render() { mockStateIndex = 0; mockRefIndex = 0; mockEffects = []; const main = walk(App()).find(e => typeof e.type === "function" && e.type.name === "MainApp")!; return walk((main.type as () => React.ReactNode)()); }
function register() { render(); mockEffects[2]!(); return (setSessionEndedHandler as jest.Mock).mock.calls.at(-1)![0] as () => void; }
const user = { id: "owner", role: "COMMUTER", email: "owner@example.test", name: "Owner" };
beforeEach(() => { mockStates = []; mockRefs = []; jest.clearAllMocks(); render(); mockStates[0] = false; mockStates[1] = false; });
test("actual App registers expiry handler and clears user/modals/feedback/badges", () => {
  mockStates[2] = user; mockStates[3] = { first_name: "Owner" };
  mockStates[7] = "rewards"; mockStates[9] = { id: "old-ride" };
  for (let i = 10; i <= 14; i++) mockStates[i] = true;
  mockStates[15] = 4; mockStates[16] = 2; mockStates[17] = 3; mockStates[18] = true;
  register()();
  expect(render().some(e => e.type === "Login")).toBe(true);
  expect(mockStates[2]).toBeNull(); expect(mockStates[3]).toBeNull(); expect(mockStates[7]).toBe("home"); expect(mockStates[9]).toBeNull();
  expect(mockStates.slice(10, 15)).toEqual([false, false, false, false, false]);
  expect(mockStates.slice(15, 18)).toEqual([0, 0, 0]); expect(mockStates[18]).toBe(false);
});
test("late profile response from a logged-out login cannot restore account state", async () => {
  let finish!: (value: any) => void;
  (commuterService.getProfile as jest.Mock).mockReturnValue(new Promise(done => { finish = done; }));
  const ended = register();
  render().find(e => e.type === "Login")!.props.onLoginSuccess(user, "token");
  ended(); finish({ profile: { first_name: "Old account" } });
  await Promise.resolve(); await Promise.resolve();
  expect(mockStates[2]).toBeNull(); expect(mockStates[3]).toBeNull();
});

test("Feedback highlights its bottom tab while open and restores the previous tab on close", () => {
  (commuterService.getProfile as jest.Mock).mockResolvedValue({ profile: { first_name: "Owner" } });
  render().find(e => e.type === "Login")!.props.onLoginSuccess(user, "token");
  render().find(e => e.type === "Nav")!.props.onTabChange("rewards");
  expect(render().find(e => e.type === "Nav")!.props.activeTab).toBe("rewards");
  render().find(e => e.type === "Nav")!.props.onTabChange("feedback");
  expect(render().find(e => e.type === "Nav")!.props.activeTab).toBe("feedback");
  render().find(e => e.type === "Feedback")!.props.onFeedbackComplete();
  expect(render().find(e => e.type === "Nav")!.props.activeTab).toBe("rewards");
});

test("home bell opens the web-sourced Updates section", () => {
  (commuterService.getProfile as jest.Mock).mockResolvedValue({ profile: { first_name: "Owner" } });
  render().find(e => e.type === "Login")!.props.onLoginSuccess(user, "token");
  render().find(e => e.type === "Dashboard")!.props.onOpenAnnouncements();
  const rewards = render().find(e => e.type === "Rewards")!;
  expect(rewards.props.initialSection).toBe("announcements");
  expect(render().find(e => e.type === "Nav")!.props.activeTab).toBe("rewards");
});

test("student renewal opened from Settings returns to Settings", () => {
  (commuterService.getProfile as jest.Mock).mockResolvedValue({ profile: { first_name: "Owner" } });
  render().find(e => e.type === "Login")!.props.onLoginSuccess(user, "token");
  render().find(e => e.type === "Nav")!.props.onTabChange("profile");
  render().find(e => e.type === "Profile")!.props.onOpenRenewal();
  const renewal = render().find(e => e.type === "Renewal")!;
  expect(renewal.props.backLabel).toBe("Settings");
  renewal.props.onClose();
  expect(render().find(e => e.type === "Nav")!.props.activeTab).toBe("profile");
  expect(render().find(e => e.type === "Profile")).toBeDefined();
});

test("student renewal opened from Updates returns to Rewards & Updates", () => {
  (commuterService.getProfile as jest.Mock).mockResolvedValue({ profile: { first_name: "Owner" } });
  render().find(e => e.type === "Login")!.props.onLoginSuccess(user, "token");
  render().find(e => e.type === "Nav")!.props.onTabChange("rewards");
  render().find(e => e.type === "Rewards")!.props.onOpenRenewal();
  const renewal = render().find(e => e.type === "Renewal")!;
  expect(renewal.props.backLabel).toBe("Rewards & Updates");
  renewal.props.onClose();
  expect(render().find(e => e.type === "Nav")!.props.activeTab).toBe("rewards");
});

test("cached offline account is gated until the server validates its session", async () => {
  mockStates[2] = user;
  expect(render().some(e => e.type === "Text" && e.props.children === "Session not verified")).toBe(true);
  expect(render().some(e => e.type === "Dashboard")).toBe(false);
  (authService.restoreSession as jest.Mock).mockResolvedValue({ user, token: "token" });
  const retry = render().find(e => e.type === "Pressable" && walk(e).some(child => child.props.children === "Try again"))!;
  await retry.props.onPress();
  expect(render().some(e => e.type === "Dashboard")).toBe(true);
});
