/// <reference types="jest" />
import React from "react";
import { DiscountSchoolProofFields, EMPTY_APPLICATION_SCHOOL_FIELDS } from "../DiscountSchoolProofFields";
import type { RenewalFields } from "../../student-renewal/renewal-types";

let mockStates: unknown[] = [];
let mockCursor = 0;
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: (initial: unknown) => {
    const slot = mockCursor++;
    if (!(slot in mockStates)) mockStates[slot] = initial;
    return [mockStates[slot], (next: unknown) => { mockStates[slot] = next; }];
  },
}));
jest.mock("react-native", () => ({ Pressable: "Pressable", View: "View" }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("../../../shared/ui/BrandText", () => ({ Text: "Text" }));
jest.mock("../../../shared/ui/FeatureControls", () => ({ FeatureInput: "Input" }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useCommuterTheme: () => ({ isLight: true, colors: { textPrimary: "#111", textSecondary: "#555", textMuted: "#777", primary: "#1A5FB4", border: "#ddd", borderSubtle: "#eee", surface: "#fff" } }) }));

type Element = React.ReactElement<Record<string, any>>;
function walk(node: React.ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(walk);
  if (!React.isValidElement(node)) return [];
  const element = node as Element;
  return [element, ...walk(element.props.children)];
}
function choice(nodes: Element[], label: string) {
  return nodes.find(node => node.type === "Pressable" && walk(node).some(child => child.props.children === label))!;
}

test("student form follows web's unselected education and always-visible term flow", () => {
  let fields: RenewalFields = { ...EMPTY_APPLICATION_SCHOOL_FIELDS };
  const render = () => { mockCursor = 0; return walk(DiscountSchoolProofFields({ fields, onChange: (next) => { fields = next; }, disabled: false })); };
  let nodes = render();
  expect(nodes.find(node => node.props.label === "School")?.props.placeholder).toBe("Name of your school or university");
  expect(nodes.find(node => node.props.label === "School year")?.props.placeholder).toMatch(/^For example, \d{4}–\d{4}$/);
  expect(nodes.some(node => node.props.accessibilityLabel === "Grade level")).toBe(false);
  expect(nodes.some(node => node.props.accessibilityLabel === "Enrollment term")).toBe(true);

  choice(nodes, "High school").props.onPress();
  nodes = render();
  expect(nodes.some(node => node.props.accessibilityLabel === "Grade level")).toBe(true);
  nodes.find(node => node.props.accessibilityLabel === "Grade level")!.props.onPress();
  nodes = render();
  expect(nodes.find(node => node.props.style?.top === 48)?.props.style.position).toBe("absolute");
  nodes.find(node => node.props.accessibilityLabel === "Grade 11")!.props.onPress();
  expect(fields.grade_level).toBe("11");

  nodes = render();
  choice(nodes, "College").props.onPress();
  expect(fields.education_level).toBe("COLLEGE");
  expect(fields.grade_level).toBe("");
  nodes = render();
  expect(nodes.some(node => node.props.accessibilityLabel === "Grade level")).toBe(false);
  nodes.find(node => node.props.accessibilityLabel === "Enrollment term")!.props.onPress();
  nodes = render();
  expect(nodes.find(node => node.props.style?.top === 48 && walk(node).some(child => child.props.accessibilityLabel === "1st Semester"))?.props.style.position).toBe("absolute");
  nodes.find(node => node.props.accessibilityLabel === "1st Semester")!.props.onPress();
  expect(fields.enrollment_term).toBe("1st Semester");
});
