/// <reference types="jest" />
import React from "react";
import App from "../../../../App";
import { setSessionEndedHandler } from "../../../core/api/api-client";
import { commuterService } from "../../../core/api/commuter-service";
let mockStates: any[] = [], mockRefs: any[] = [], mockEffects: Array<() => any> = [];
let mockStateIndex = 0, mockRefIndex = 0;
jest.mock("react", () => ({ ...jest.requireActual("react"),
  useCallback: (fn: unknown) => fn, useEffect: (fn: () => any) => { mockEffects.push(fn); },
  useRef: (initial: unknown) => { const i = mockRefIndex++; return mockRefs[i] ?? (mockRefs[i] = { current: initial }); },
  useState: (initial: unknown) => { const i = mockStateIndex++; if (!(i in mockStates)) mockStates[i] = initial; return [mockStates[i], (next: any) => { mockStates[i] = typeof next === "function" ? next(mockStates[i]) : next; }]; },
}));
jest.mock("react-native", () => ({ View: "View", Modal: "Modal", ActivityIndicator: "Spinner", StyleSheet: { create: (s: unknown) => s },
  Animated: { View: "AnimatedView", Value: class { setValue() {} interpolate() {} }, timing: () => ({ start() {} }) }, Easing: { out: (v: any) => v, cubic: 1 } }));
jest.mock("react-native-safe-area-context", () => ({ SafeAreaProvider: "SafeArea", useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("expo-status-bar", () => ({ StatusBar: "StatusBar" }));
jest.mock("../../../shared/ui/BrandFonts", () => ({ BrandFonts: "BrandFonts" }));
jest.mock("@react-native-async-storage/async-storage", () => ({ getItem: jest.fn().mockResolvedValue("done") }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ ThemeProvider: "Theme" }));
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
jest.mock("../../sos/SosModal", () => ({ SosModal: "Sos" }));
jest.mock("../../share/ShareRideModal", () => ({ ShareRideModal: "Share" }));
jest.mock("../../fare/FareScreen", () => ({ FareScreen: "Fare" }));
jest.mock("../../student-renewal/StudentRenewalScreen", () => ({ StudentRenewalScreen: "Renewal" }));
jest.mock("../../student-renewal/RenewalReminder", () => ({ RenewalReminder: "Reminder" }));
jest.mock("../../student-renewal/useStudentRenewal", () => ({ useStudentRenewal: () => ({ state: null, refresh: jest.fn() }) }));
jest.mock("../../discount-application/DiscountApplicationScreen", () => ({ DiscountApplicationScreen: "Application" }));
jest.mock("../../discount-application/useDiscountApplication", () => ({ useDiscountApplication: () => ({ state: null }) }));
type Element = React.ReactElement<Record<string, any>>;
function walk(node: any): Element[] { if (Array.isArray(node)) return node.flatMap(walk); if (!React.isValidElement(node)) return []; const e = node as Element; return [e, ...walk(e.props.children)]; }
function render() { mockStateIndex = 0; mockRefIndex = 0; mockEffects = []; const main = walk(App()).find(e => typeof e.type === "function" && e.type.name === "MainApp")!; return walk((main.type as () => React.ReactNode)()); }
function register() { render(); mockEffects[1]!(); return (setSessionEndedHandler as jest.Mock).mock.calls.at(-1)![0] as () => void; }
const user = { id: "owner", role: "COMMUTER", email: "owner@example.test", name: "Owner" };
beforeEach(() => { mockStates = []; mockRefs = []; jest.clearAllMocks(); render(); mockStates[0] = false; mockStates[1] = false; });
test("actual App registers expiry handler and clears user/modals/feedback/badges", () => {
  mockStates[3] = user; mockStates[4] = { first_name: "Owner" }; mockStates[7] = { id: "old-ride" };
  for (let i = 8; i <= 13; i++) mockStates[i] = true;
  mockStates[14] = 4; mockStates[15] = 2; mockStates[16] = 3;
  register()();
  expect(render().some(e => e.type === "Login")).toBe(true);
  expect(mockStates[3]).toBeNull(); expect(mockStates[4]).toBeNull(); expect(mockStates[7]).toBeNull();
  expect(mockStates.slice(8, 14)).toEqual([false, false, false, false, false, false]);
  expect(mockStates.slice(14, 17)).toEqual([0, 0, 0]);
});
test("late profile response from a logged-out login cannot restore account state", async () => {
  let finish!: (value: any) => void;
  (commuterService.getProfile as jest.Mock).mockReturnValue(new Promise(done => { finish = done; }));
  const ended = register();
  render().find(e => e.type === "Login")!.props.onLoginSuccess(user, "token");
  ended(); finish({ profile: { first_name: "Old account" } });
  await Promise.resolve(); await Promise.resolve();
  expect(mockStates[3]).toBeNull(); expect(mockStates[4]).toBeNull();
});
