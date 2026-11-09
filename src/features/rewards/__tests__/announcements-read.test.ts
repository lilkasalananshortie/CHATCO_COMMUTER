/// <reference types="jest" />
import React from "react";
import { RewardsScreen } from "../RewardsScreen";
import { commuterService } from "../../../core/api/commuter-service";
import { subscribeAnnouncementsRead } from "../../../core/domain/announcements-events";

let mockStates: any[] = [], mockRefs: any[] = [], mockEffects: Array<() => any> = [];
let mockStateIndex = 0, mockRefIndex = 0;
jest.mock("react", () => ({ ...jest.requireActual("react"),
  useMemo: (factory: () => any) => factory(), useCallback: (fn: any) => fn,
  useEffect: (effect: () => any) => { mockEffects.push(effect); },
  useState: (initial: any) => {
    const index = mockStateIndex++;
    if (!(index in mockStates)) mockStates[index] = initial;
    return [mockStates[index], (next: any) => { mockStates[index] = typeof next === "function" ? next(mockStates[index]) : next; }];
  },
  useRef: (initial: any) => { const index = mockRefIndex++; return mockRefs[index] ?? (mockRefs[index] = { current: initial }); },
}));
jest.mock("react-native", () => ({
  View: "View", ScrollView: "Scroll", TouchableOpacity: "Button", Modal: "Modal", ActivityIndicator: "Spinner", RefreshControl: "Refresh",
  StyleSheet: { create: (styles: unknown) => styles }, Platform: { OS: "web" },
  AppState: { currentState: "active", addEventListener: () => ({ remove() {} }) },
  Animated: { View: "AnimatedView", Value: class { interpolate() {} } },
}));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("expo-clipboard", () => ({}));
jest.mock("../../../shared/ui/BrandText", () => ({ Text: "Text" }));
jest.mock("../../../shared/ui/Mascot", () => ({ Mascot: "Mascot" }));
jest.mock("../../../shared/ui/MascotMessage", () => ({ MascotMessage: "MascotMessage" }));
jest.mock("../../../shared/useReducedMotion", () => ({ useReducedMotion: () => true }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useCommuterTheme: () => ({ colors: jest.requireActual("../../../core/theme/colors").commuterColors, isLight: false }) }));
jest.mock("../../scanner/ReceiptScanModal", () => ({ ReceiptScanModal: "Receipt" }));
jest.mock("../RewardsProgressRing", () => ({ RewardsProgressRing: "Ring", REWARD_RING_CIRCUMFERENCE: 100 }));
jest.mock("../../../core/domain/rewards-events", () => ({ subscribeRewardsChanged: () => () => {} }));
jest.mock("../../../core/api/commuter-service", () => ({ commuterService: {
  markAllAnnouncementsRead: jest.fn(), markAnnouncementRead: jest.fn(), getRewards: jest.fn(), getAnnouncements: jest.fn(),
} }));

type Element = React.ReactElement<Record<string, any>>;
function walk(node: any): Element[] {
  if (Array.isArray(node)) return node.flatMap(walk);
  if (!React.isValidElement(node)) return [];
  const element = node as Element;
  return [element, ...walk(element.props.children)];
}
function render() { mockStateIndex = mockRefIndex = 0; mockEffects = []; return walk(RewardsScreen({})); }
function markButton() { return render().find(node => node.props.accessibilityLabel === "Mark all notifications as read")!; }
async function flush() { for (let i = 0; i < 12; i++) await Promise.resolve(); }
const notice = { id: "notice", title: "Notice", content: "Update", type: "SYSTEM", is_read: false, isRead: false };
beforeEach(() => {
  jest.resetAllMocks(); mockStates = []; mockRefs = [];
  render(); mockStates[0] = { vouchers: [] }; mockStates[1] = [{ ...notice }]; mockStates[2] = false; mockStates[15] = "announcements";
  (commuterService.markAllAnnouncementsRead as jest.Mock).mockResolvedValue(undefined);
});

test("mark all persists read state, updates the list, and signals badge refresh", async () => {
  const badgeRefresh = jest.fn(), unsubscribe = subscribeAnnouncementsRead(badgeRefresh);
  try {
    await markButton().props.onPress();
    expect(commuterService.markAllAnnouncementsRead).toHaveBeenCalledTimes(1);
    expect(mockStates[1][0]).toMatchObject({ is_read: true, isRead: true });
    expect(markButton().props.disabled).toBe(true);
    expect(badgeRefresh).toHaveBeenCalledTimes(1);
  } finally { unsubscribe(); }
});

test("failure leaves notices unread, shows an error, and allows retry", async () => {
  (commuterService.markAllAnnouncementsRead as jest.Mock).mockRejectedValueOnce(new Error("offline"));
  await markButton().props.onPress();
  expect(mockStates[1][0].is_read).toBe(false);
  expect(render().some(node => node.props.accessibilityRole === "alert" && String(node.props.children).includes("Couldn't mark"))).toBe(true);
  expect(markButton().props.disabled).toBe(false);
  await markButton().props.onPress();
  expect(mockStates[1][0].is_read).toBe(true);
});

test("repeated clicks share one mutation", async () => {
  let finish!: () => void;
  (commuterService.markAllAnnouncementsRead as jest.Mock).mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
  const button = markButton(); const pending = button.props.onPress(); await button.props.onPress();
  expect(markButton().props.accessibilityState.busy).toBe(true);
  expect(commuterService.markAllAnnouncementsRead).toHaveBeenCalledTimes(1);
  finish(); await pending;
});

test("a refresh started before mark all cannot restore stale unread notices", async () => {
  jest.useFakeTimers();
  let finish!: (value: any) => void;
  (commuterService.getRewards as jest.Mock).mockResolvedValue({ vouchers: [] });
  (commuterService.getAnnouncements as jest.Mock).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  render(); const cleanup = mockEffects[1]!();
  try {
    await markButton().props.onPress();
    finish([{ ...notice }]); await flush();
    expect(mockStates[1][0].is_read).toBe(true);
  } finally { cleanup(); jest.useRealTimers(); }
});
