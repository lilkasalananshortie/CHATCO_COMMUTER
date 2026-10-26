/// <reference types="jest" />
import React from "react";
import { PolicyReader } from "../PolicyReader";
import { PRIVACY_SECTIONS, REGISTRATION_TERMS } from "../../../features/auth/registration-policies";
jest.mock("react-native", () => ({ Modal: "Modal", ScrollView: "ScrollView", Text: "Text", TouchableOpacity: "Button", View: "View" }));
jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeArea" }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useCommuterTheme: () => ({ colors: { background: "light-bg", textPrimary: "light-text", textSecondary: "secondary", textMuted: "muted", primaryLight: "blue", border: "border" } }) }));
function walk(node: any): any[] {
  if (Array.isArray(node)) return node.flatMap(walk);
  if (!React.isValidElement(node)) return [];
  const element = node as React.ReactElement<Record<string, any>>;
  return [element, ...walk(element.props.children)];
}
test("closed reader renders no modal", () => { expect(PolicyReader({ policy: null, onClose: jest.fn() })).toBeNull(); });
test.each(["terms", "privacy"] as const)("%s reader preserves all existing policy text and matches the selected theme", policy => {
  const nodes = walk(PolicyReader({ policy, onClose: jest.fn() }));
  for (const section of policy === "terms" ? REGISTRATION_TERMS : PRIVACY_SECTIONS) {
    expect(nodes.some(node => node.props.children === section.title)).toBe(true);
    for (const paragraph of section.paragraphs) expect(nodes.some(node => node.props.children === paragraph)).toBe(true);
  }
  expect(nodes.find(node => node.type === "SafeArea").props.style.backgroundColor).toBe("light-bg");
});
test("close stays outside the scrolling content and Android back closes too", () => {
  const close = jest.fn(); const nodes = walk(PolicyReader({ policy: "terms", onClose: close }));
  const button = nodes.find(node => node.props.accessibilityLabel === "Close policy");
  const scroll = nodes.find(node => node.type === "ScrollView");
  expect(walk(scroll)).not.toContain(button);
  button.props.onPress(); nodes.find(node => node.type === "Modal").props.onRequestClose();
  expect(close).toHaveBeenCalledTimes(2);
});
