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
  Animated: { View: "AnimatedView", Value: class { setValue() {} interpolate() {} } },
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
  markAllAnnouncementsRead: jest.fn(), markAnnouncementRead: jest.fn(), getRewards: jest.fn(), getAnnouncements: jest.fn(), getAnnouncementsPage: jest.fn(), getUnreadAnnouncementCount: jest.fn(),
} }));

type Element = React.ReactElement<Record<string, any>>;
function walk(node: any): Element[] {
  if (Array.isArray(node)) return node.flatMap(walk);
  if (!React.isValidElement(node)) return [];
  const element = node as Element;
  return [element, ...walk(element.props.children)];
}
function render(props: React.ComponentProps<typeof RewardsScreen> = {}) { mockStateIndex = mockRefIndex = 0; mockEffects = []; return walk(RewardsScreen(props)); }
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

test("updates remain accessible when rewards fail, including from the home bell", () => {
  mockStates = []; mockRefs = [];
  let tree = render({ initialSection: "announcements" });
  expect(tree.some(node => node.props.accessibilityLabel === "Loading updates")).toBe(true);

  mockStates[0] = null;
  mockStates[1] = [{ ...notice }];
  mockStates[2] = false;
  mockStates[4] = new Error("Rewards unavailable");
  tree = render({ initialSection: "announcements" });
  expect(tree.some(node => node.props.children === "Notice")).toBe(true);
  expect(tree.some(node => node.props.children === "Update")).toBe(true);
  const rewardsTab = tree.find(node => node.props.accessibilityRole === "tab" && walk(node).some(child => child.props.children === "Rewards"))!;
  rewardsTab.props.onPress();
  tree = render({ initialSection: "announcements" });
  expect(tree.some(node => node.type === "MascotMessage")).toBe(true);
  expect(tree.some(node => node.props.accessibilityRole === "tab" && walk(node).some(child => child.props.children === "Updates"))).toBe(true);
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
  (commuterService.getUnreadAnnouncementCount as jest.Mock).mockResolvedValue(1);
  (commuterService.getAnnouncementsPage as jest.Mock).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  render(); const cleanup = mockEffects[3]!();
  try {
    await markButton().props.onPress();
    finish({ items: [{ ...notice }], page: 1, lastPage: 1 }); await flush();
    expect(mockStates[1][0].is_read).toBe(true);
  } finally { cleanup(); jest.useRealTimers(); }
});

test("older updates skip duplicates and survive the background refresh", async () => {
  jest.useFakeTimers();
  const older = { ...notice, id: "older", title: "Older" };
  (commuterService.getRewards as jest.Mock).mockResolvedValue({ vouchers: [] });
  (commuterService.getUnreadAnnouncementCount as jest.Mock).mockResolvedValue(2);
  (commuterService.getAnnouncementsPage as jest.Mock)
    .mockResolvedValueOnce({ items: [notice], page: 1, lastPage: 2 })
    .mockResolvedValueOnce({ items: [notice, older], page: 2, lastPage: 2 })
    .mockResolvedValue({ items: [{ ...notice, title: "Fresh" }], page: 1, lastPage: 2 });
  render(); const cleanup = mockEffects[3]!();
  try {
    await flush();
    await render().find(node => node.props.accessibilityLabel === "Load older updates")!.props.onPress();
    await flush();
    expect(commuterService.getAnnouncementsPage).toHaveBeenLastCalledWith(2);
    expect(mockStates[1].map((item: { id: string }) => item.id)).toEqual(["notice", "older"]);
    expect(render().some(node => node.props.accessibilityLabel === "Load older updates")).toBe(false);
    await jest.advanceTimersByTimeAsync(30000);
    expect(mockStates[1].map((item: { title: string }) => item.title)).toEqual(["Fresh", "Older"]);
  } finally { cleanup(); jest.useRealTimers(); }
});

test("mark all stays available for unread updates on pages not loaded yet", async () => {
  jest.useFakeTimers();
  (commuterService.getRewards as jest.Mock).mockResolvedValue({ vouchers: [] });
  (commuterService.getUnreadAnnouncementCount as jest.Mock).mockResolvedValue(3);
  (commuterService.getAnnouncementsPage as jest.Mock).mockResolvedValue({ items: [{ ...notice, is_read: true, isRead: true }], page: 1, lastPage: 2 });
  render(); const cleanup = mockEffects[3]!();
  try {
    await flush();
    expect(markButton().props.disabled).toBe(false);
    await markButton().props.onPress();
    expect(commuterService.markAllAnnouncementsRead).toHaveBeenCalledTimes(1);
    expect(markButton().props.disabled).toBe(true);
  } finally { cleanup(); jest.useRealTimers(); }
});

test("rewards help matches the three web steps, uses the live reward target and keeps Got it", () => {
  mockStates[0] = { vouchers: [], ridesNeeded: 12 }; mockStates[9] = true;
  const nodes = render();
  expect(nodes.some(node => node.props.children === "How rewards work")).toBe(true);
  for (const title of ["1. Complete paid rides", "2. Earn a free ride", "3. Use it with GCash"]) expect(nodes.some(node => node.props.children === title)).toBe(true);
  expect(nodes.some(node => typeof node.props.children === "string" && node.props.children.startsWith("Every 12 paid rides"))).toBe(true);
  expect(nodes.some(node => typeof node.props.children === "string" && node.props.children.includes("Each receipt can be claimed once"))).toBe(true);
  expect(nodes.some(node => typeof node.props.children === "string" && node.props.children.includes("remaining fare is paid by GCash"))).toBe(true);
  expect(nodes.some(node => node.props.children === "4. Use it on a ride")).toBe(false);
  const modal = nodes.find(node => node.type === "Modal" && walk(node).some(child => child.props.children === "How rewards work"))!;
  expect(modal.props.visible).toBe(true);
  walk(modal).find(node => node.type === "Button" && walk(node).some(child => child.props.children === "Got it"))!.props.onPress();
  expect(render().find(node => node.type === "Modal" && walk(node).some(child => child.props.children === "How rewards work"))!.props.visible).toBe(false);
});
