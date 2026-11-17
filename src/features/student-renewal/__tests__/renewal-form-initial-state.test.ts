/// <reference types="jest" />
import React from "react";
import { StudentRenewalScreen } from "../StudentRenewalScreen";
import type { RenewalState } from "../renewal-types";

jest.mock("react", () => ({ ...jest.requireActual("react"), useState: (value: unknown) => [value, jest.fn()], useRef: (value: unknown) => ({ current: value }), useEffect: () => {} }));
jest.mock("react-native", () => ({ View: "View", ScrollView: "ScrollView", TouchableOpacity: "Button", Modal: "Modal", ActivityIndicator: "Spinner" }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("../../../shared/ui/BrandText", () => ({ Text: "Text" }));
jest.mock("../../../shared/ui/FeatureControls", () => ({ FeatureButton: "FeatureButton", useFeatureStyles: () => ({ screen: {}, content: {}, card: {}, error: {}, title: {}, heading: {}, text: {}, muted: {} }) }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useCommuterTheme: () => ({ isLight: false, colors: { surface: "#071A2E", border: "#333", surfaceHover: "#123", surfaceSecondary: "#123", textPrimary: "white", textSecondary: "#aaa" } }) }));
jest.mock("../../../core/api/student-renewal-service", () => ({ studentRenewalService: { submit: jest.fn(), switchToRegular: jest.fn() } }));
jest.mock("../pick-renewal-document", () => ({ pickRenewalDocument: jest.fn() }));
jest.mock("../SupportingDocumentField", () => ({ SupportingDocumentField: "DocumentField" }));

type Element = React.ReactElement<Record<string, any>>;
function walk(node: React.ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(walk);
  if (!React.isValidElement(node)) return [];
  const element = node as Element;
  return [element, ...walk(element.props.children)];
}
const state = { can_submit: true, commuter_type: "STUDENT", status: "NOT_RENEWED", renewal_period: "November 2026", opens_at: "2026-11-01T00:00:00+08:00", deadline: "2026-12-01T00:00:00+08:00", discount_eligible: true, application: null } as RenewalState;

test("a new renewal starts with no education, grade, or term selected and no premature error", () => {
  const tree = walk(StudentRenewalScreen({ state, loading: false, loadError: "", backLabel: "Settings", onRefresh: async () => {}, onClose: () => {} }));
  const fields = tree.find(node => typeof node.type === "function" && node.type.name === "DiscountSchoolProofFields")!.props.fields;
  expect(fields).toMatchObject({ education_level: "", grade_level: "", enrollment_term: "" });
  expect(tree.find(node => node.type === "FeatureButton" && node.props.label === "Submit for verification")!.props.disabled).toBe(true);
  expect(tree.some(node => node.type === "Text" && String(node.props.children).includes("Enter your school name"))).toBe(false);
});
