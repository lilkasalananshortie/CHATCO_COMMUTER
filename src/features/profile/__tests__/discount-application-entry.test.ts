/// <reference types="jest" />
import React from "react";
import { DiscountApplicationEntry } from "../DiscountApplicationEntry";
import type { ApplicationState } from "../../discount-application/application-types";

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

const open = jest.fn();
const regular: ApplicationState = {
  commuter_type: "REGULAR", effective_fare_type: "REGULAR", discount_expires_at: null,
  document_required: true, can_submit: true, status: "NOT_APPLIED", application: null,
};
const render = (state: ApplicationState | null, loading = false) => walk(DiscountApplicationEntry({ state, loading, failed: false, isLight: true, onOpen: open }));
const text = (tree: Element[]) => tree.filter(node => node.type === "Text").map(node => String(node.props.children));

beforeEach(() => open.mockClear());

test("regular profile uses the web discount copy and a primary action inside the card", () => {
  const tree = render(regular);
  expect(text(tree).join(" ")).toContain("Student, PWD or Senior Citizen?");
  expect(text(tree).join(" ")).toContain("Verify your ID to pay 20% less on every ride.");
  expect(text(tree)).toContain("Apply for a discount");
  expect(tree.find(node => node.type === "View")?.props.style).toMatchObject({ width: "100%", borderTopWidth: 1 });
  tree.find(node => node.type === "Button")!.props.onPress();
  expect(open).toHaveBeenCalledTimes(1);
});

test("an outstanding former-student renewal opens the renewal path", () => {
  const state: ApplicationState = { ...regular, status: "NEEDS_CORRECTION", application: {
    id: "renewal", request_type: "RENEWAL", requested_type: "STUDENT", revision: 1,
    status: "NEEDS_CORRECTION", reason: "New ID needed", submitted_at: "2026-11-01T00:00:00+08:00",
    school_name: null, education_level: null, grade_level: null, school_year: null,
    enrollment_term: null, correction_due_at: null,
  } };
  const labels = text(render(state));
  expect(labels.join(" ")).toContain("Student renewal: Needs correction");
  expect(labels).toContain("View Student renewal");
  expect(labels.join(" ")).toContain("New ID needed");
});

test("loading state does not offer an application before the server answers", () => {
  const tree = render(null, true);
  expect(text(tree)).toContain("Loading discount application status...");
  expect(tree.some(node => node.type === "Button")).toBe(false);
});
