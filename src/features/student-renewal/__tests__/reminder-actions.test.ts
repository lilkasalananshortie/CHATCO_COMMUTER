/// <reference types="jest" />
import React from "react";
import { RenewalReminder } from "../RenewalReminder";
import { studentRenewalService } from "../../../core/api/student-renewal-service";
import type { RenewalState } from "../renewal-types";
let mockStates: any[] = [];
let mockRefs: any[] = [];
let mockCursor = 0;
let mockRefCursor = 0;
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useRef: (initial: unknown) => {
    const slot = mockRefCursor++;
    if (!(slot in mockRefs)) mockRefs[slot] = { current: initial };
    return mockRefs[slot];
  },
  useState: (initial: unknown) => {
    const slot = mockCursor++;
    if (!(slot in mockStates)) mockStates[slot] = initial;
    return [mockStates[slot], (value: unknown) => { mockStates[slot] = value; }];
  },
}));
jest.mock("react-native", () => ({ Modal: "Modal", ScrollView: "ScrollView", Text: "Text", View: "View" }));
jest.mock("../../../shared/ui/FeatureControls", () => ({ FeatureButton: "Button", featureStyles: {}, useFeatureStyles: () => ({ card: {}, title: {}, text: {}, muted: {}, error: {} }) }));
jest.mock("../../../core/api/student-renewal-service", () => ({ studentRenewalService: { reminder: jest.fn() } }));
const state = { reminder_due: true, deadline: "2027-10-01T00:00:00+08:00", renewal_period: "September 2027" } as RenewalState;
const refresh = jest.fn().mockResolvedValue(undefined);
const open = jest.fn();
type Element = React.ReactElement<Record<string, any>>;
function walk(node: React.ReactNode): Element[] {
  if (!React.isValidElement(node)) return [];
  const element = node as Element; const children = element.props.children;
  return [element, ...(Array.isArray(children) ? children.flatMap(walk) : walk(children))];
}
function render(enabled = true, value: RenewalState | null = state) {
  mockCursor = 0; mockRefCursor = 0;
  return walk(RenewalReminder({ state: value, enabled, onOpen: open, onRefresh: refresh }));
}
function button(label: string) { return render().find((node) => node.props.label === label)!; }
beforeEach(() => { mockStates = []; mockRefs = []; jest.clearAllMocks(); (studentRenewalService.reminder as jest.Mock).mockResolvedValue({ reminder_due: false }); });

test.each([
  ["Remind me tomorrow", "snooze"], ["Hide reminders for this cycle", "dismiss"],
])("%s persists the matching preference before hiding", async (label, action) => {
  await button(label!).props.onPress();
  // onPress deliberately returns void, so flush the async action.
  await Promise.resolve(); await Promise.resolve();
  expect(studentRenewalService.reminder).toHaveBeenCalledWith(action);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(render()[0]!.props.visible).toBe(false);
});
test("rapid reminder taps produce one write", async () => {
  let resolve!: (value: any) => void;
  (studentRenewalService.reminder as jest.Mock).mockReturnValue(new Promise((done) => { resolve = done; }));
  const press = button("Remind me tomorrow").props.onPress;
  press(); press(); expect(studentRenewalService.reminder).toHaveBeenCalledTimes(1);
  resolve({}); await Promise.resolve(); await Promise.resolve();
});
test("failed preference save leaves the reminder available with an error", async () => {
  (studentRenewalService.reminder as jest.Mock).mockRejectedValue(new Error("Offline"));
  button("Remind me tomorrow").props.onPress(); await Promise.resolve(); await Promise.resolve();
  expect(render()[0]!.props.visible).toBe(true);
  expect(render().some((node) => node.props.children === "Offline")).toBe(true);
  expect(refresh).not.toHaveBeenCalled();
});
test("reminder does not open when backend says it is not due", () => {
  expect(render(true, { ...state, reminder_due: false })[0]!.props.visible).toBe(false);
  expect(render(false)[0]!.props.visible).toBe(false);
  expect(render(true, null)[0]!.props.visible).toBe(false);
});
test("viewing renewal opens the form without writing a dismissal", () => {
  button("View student renewal").props.onPress();
  expect(open).toHaveBeenCalledTimes(1);
  expect(studentRenewalService.reminder).not.toHaveBeenCalled();
  expect(render()[0]!.props.visible).toBe(false);
});
