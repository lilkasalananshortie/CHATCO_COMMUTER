/// <reference types="jest" />
import React from "react";
import { OnboardingScreen } from "../OnboardingScreen";
import { WALKTHROUGH_SLIDES } from "../walkthrough-slides";

// Exercise the actual screen handlers without installing a native renderer.
// Effects are omitted; animation must never be needed to reveal slide content.
let mockStates: unknown[] = [];
let mockCursor = 0;
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useEffect: () => {},
  useMemo: (factory: () => unknown) => factory(),
  useRef: (initial: unknown) => ({ current: initial }),
  useState: (initial: unknown) => {
    const slot = mockCursor++;
    if (!(slot in mockStates)) mockStates[slot] = initial;
    return [mockStates[slot], (value: unknown) => { mockStates[slot] = value; }];
  },
}));
jest.mock("react-native", () => ({
  View: "View", Text: "Text", ScrollView: "ScrollView", Pressable: "Pressable",
  Animated: { View: "AnimatedView", Value: class { constructor(public value: number) {} } },
  AccessibilityInfo: {}, Easing: {},
  StyleSheet: { create: (styles: unknown) => styles },
  PanResponder: { create: (config: unknown) => ({ panHandlers: config }) },
  useWindowDimensions: () => ({ width: 320, height: 720, fontScale: 1, scale: 1 }),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("expo-haptics", () => ({ impactAsync: () => Promise.resolve(), ImpactFeedbackStyle: { Light: 1, Medium: 2 } }));
jest.mock("@react-native-async-storage/async-storage", () => ({ setItem: () => Promise.resolve() }));
jest.mock("../../../shared/ui/Mascot", () => ({ Mascot: "Mascot" }));

type Element = React.ReactElement<Record<string, unknown>>;
function elements(node: React.ReactNode): Element[] {
  if (!React.isValidElement(node)) return [];
  const element = node as Element;
  const children = element.props.children;
  return [element, ...(Array.isArray(children) ? children.flatMap(elements) : elements(children as React.ReactNode))];
}
function render() {
  mockCursor = 0;
  return elements(OnboardingScreen({ onFinish: jest.fn() }) as React.ReactNode);
}
function press(nodes: Element[], label: string) {
  const button = nodes.find((node) => node.props.accessibilityLabel === label)!;
  (button.props.onPress as () => void)();
}
function expectVisible(nodes: Element[], index: number) {
  const content = nodes.find((node) => node.type === "ScrollView")!;
  const slide = content.props.children as Element;
  expect(content.key).toBeNull(); // Do not remount during an in-flight fade.
  expect(slide.type).toBe("View");
  expect(slide.props.style).not.toHaveProperty("opacity");
  expect(nodes.some((node) => node.props.children === WALKTHROUGH_SLIDES[index]!.title)).toBe(true);
  expect(nodes.some((node) => node.props.children === WALKTHROUGH_SLIDES[index]!.description)).toBe(true);
  expect(nodes.some((node) => node.type === "Mascot" && node.props.pose === WALKTHROUGH_SLIDES[index]!.pose)).toBe(true);
}

beforeEach(() => { mockStates = []; mockCursor = 0; });

test("every Next transition keeps the mascot, title, and description visible without animation callbacks", () => {
  let nodes = render();
  expectVisible(nodes, 0);
  for (let index = 1; index < WALKTHROUGH_SLIDES.length; index++) {
    press(nodes, "Go to next slide");
    nodes = render();
    expectVisible(nodes, index);
  }
});

test("returning from slide two does not leave the content transparent", () => {
  let nodes = render();
  press(nodes, "Go to next slide");
  nodes = render();
  expectVisible(nodes, 1);
  press(nodes, "Go to previous slide");
  expectVisible(render(), 0);
});
