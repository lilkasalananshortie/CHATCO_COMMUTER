/// <reference types="jest" />
import React from "react";
import { StudentRenewalEntry } from "../StudentRenewalEntry";
import type { RenewalState } from "../../student-renewal/renewal-types";

jest.mock("react-native", () => ({ View: "View", TouchableOpacity: "Button" }));
jest.mock("../../../shared/ui/BrandText", () => ({ Text: "Text" }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));

type Element = React.ReactElement<Record<string, any>>;
function walk(node: React.ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(walk);
  if (!React.isValidElement(node)) return [];
  const element = node as Element;
  return [element, ...walk(element.props.children)];
}
const state: RenewalState = {
  cycle_year: 2026, deadline: "2026-12-01T00:00:00+08:00", opens_at: "2026-11-01T00:00:00+08:00",
  renewal_period: "2026", commuter_type: "STUDENT", discount_eligible: true, discount_expires_at: null,
  status: "NOT_RENEWED", can_submit: true, notice_active: true, reminder_due: true,
  can_switch_to_regular: true, application: null,
};
const onOpen = jest.fn();
const render = (override: Partial<RenewalState> = {}) => walk(StudentRenewalEntry({ state: { ...state, ...override }, discountPercentage: 20, isLight: false, onOpen }));
const labels = (tree: Element[]) => tree.filter(node => node.type === "Text").map(node => String(node.props.children));

beforeEach(() => onOpen.mockClear());

test("profile renewal is shown only for a student with an active notice and opens the renewal screen", () => {
  expect(render({ notice_active: false })).toHaveLength(0);
  expect(render({ commuter_type: "REGULAR" })).toHaveLength(0);
  const tree = render();
  expect(labels(tree)).toContain("Renew student status");
  expect(labels(tree).some(label => label.includes("Dec 1, 2026") && label.includes("20% student discount"))).toBe(true);
  tree.find(node => node.type === "Button")!.props.onPress();
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test.each([
  ["PENDING", false, "View renewal status"],
  ["NEEDS_CORRECTION", true, "Submit corrected proof"],
  ["REJECTED", true, "Submit again"],
  ["REJECTED", false, "View renewal status"],
] as const)("%s state with can_submit=%s shows %s", (status, can_submit, action) => {
  expect(labels(render({ status, can_submit }))).toContain(action);
});
