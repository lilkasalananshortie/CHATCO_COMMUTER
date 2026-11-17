/// <reference types="jest" />
import React from "react";
import { RewardsRenewalNotice } from "../RewardsRenewalNotice";
import type { RenewalState } from "../../student-renewal/renewal-types";

let helpOpen = false;
jest.mock("react", () => ({ ...jest.requireActual("react"), useState: () => [helpOpen, (value: any) => { helpOpen = typeof value === "function" ? value(helpOpen) : value; }] }));
jest.mock("react-native", () => ({ View: "View", TouchableOpacity: "Button" }));
jest.mock("../../../shared/ui/BrandText", () => ({ Text: "Text" }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useCommuterTheme: () => ({ isLight: false, colors: { primary: "#1A5FB4" } }) }));

type Element = React.ReactElement<Record<string, any>>;
function walk(node: React.ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(walk);
  if (!React.isValidElement(node)) return [];
  const element = node as Element;
  return [element, ...walk(element.props.children)];
}
const state: RenewalState = {
  cycle_year: 2026, deadline: "2026-12-01T00:00:00+08:00", opens_at: "2026-11-01T00:00:00+08:00",
  renewal_period: "November 1–30, 2026", commuter_type: "STUDENT", discount_eligible: true,
  discount_expires_at: null, status: "NOT_RENEWED", can_submit: true, notice_active: true,
  reminder_due: true, can_switch_to_regular: true, application: null,
};
const onOpen = jest.fn();
const render = (override: Partial<RenewalState> = {}) => walk(RewardsRenewalNotice({ renewal: { ...state, ...override }, onOpen }));
const labels = (tree: Element[]) => tree.filter(node => node.type === "Text").map(node => String(node.props.children));
beforeEach(() => { helpOpen = false; onOpen.mockClear(); });

test("Updates shows the web renewal card and opens the renewal screen", () => {
  const tree = render();
  for (const label of ["Student renewal", "For renewal", "Renew your student status", "Renewal period", "November 1–30, 2026", "Student discount", "Available", "Renew student status"]) expect(labels(tree)).toContain(label);
  tree.find(node => node.type === "Button" && labels(walk(node)).includes("Renew student status"))!.props.onPress();
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test("pending and correction states use the web action and review copy", () => {
  expect(labels(render({ status: "PENDING", can_submit: false }))).toContain("View renewal status");
  expect(labels(render({ status: "NEEDS_CORRECTION" }))).toContain("Submit corrected proof");
});

test("What happens next expands in place", () => {
  render().find(node => node.props.accessibilityLabel === "What happens next")!.props.onPress();
  expect(labels(render())).toContain("What happens next");
});
