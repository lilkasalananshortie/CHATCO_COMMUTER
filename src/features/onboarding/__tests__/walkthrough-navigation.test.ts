/// <reference types="jest" />
import React from "react";
import { OnboardingScreen } from "../OnboardingScreen";
import { WALKTHROUGH_SLIDES } from "../walkthrough-slides";

// Exercise the actual screen handlers without installing a native renderer.
// Effects are omitted; slide content must not depend on an animation callback.
let mockStates: unknown[] = [];
let mockCursor = 0;
let mockAnimationComplete: ((result: { finished: boolean }) => void) | null = null;
const mockTiming = jest.fn((..._args: unknown[]) => ({
  start: jest.fn((callback?: (result: { finished: boolean }) => void) => { mockAnimationComplete = callback ?? null; }),
  stop: jest.fn(),
}));
const mockSetItem = jest.fn((..._args: unknown[]) => Promise.resolve());
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
  View: "View", Text: "Text", Image: "Image", ScrollView: "ScrollView", Pressable: "Pressable",
  Animated: { View: "AnimatedView", Value: class {
    constructor(public value: number) {}
    setValue(value: number) { this.value = value; }
    interpolate(config: unknown) { return config; }
  }, timing: (...args: unknown[]) => mockTiming(...args) },
  AccessibilityInfo: {}, Easing: { in: (value: unknown) => value, out: (value: unknown) => value, cubic: "cubic" },
  StyleSheet: { create: (styles: unknown) => styles },
  PanResponder: { create: (config: unknown) => ({ panHandlers: config }) },
  useWindowDimensions: () => ({ width: 320, height: 720, fontScale: 1, scale: 1 }),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("expo-haptics", () => ({ impactAsync: () => Promise.resolve(), ImpactFeedbackStyle: { Light: 1, Medium: 2 } }));
jest.mock("@react-native-async-storage/async-storage", () => ({ setItem: (...args: unknown[]) => mockSetItem(...args) }));
jest.mock("../../../shared/ui/Mascot", () => ({ Mascot: "Mascot" }));
jest.mock("../../../../assets/logo-e-chatco.png", () => 1);

type Element = React.ReactElement<Record<string, unknown>>;
function elements(node: React.ReactNode): Element[] {
  if (!React.isValidElement(node)) return [];
  const element = node as Element;
  const children = element.props.children;
  return [element, ...(Array.isArray(children) ? children.flatMap(elements) : elements(children as React.ReactNode))];
}
function render(onFinish = jest.fn()) {
  mockCursor = 0;
  return elements(OnboardingScreen({ onFinish }) as React.ReactNode);
}
function press(nodes: Element[], label: string) {
  const button = nodes.find((node) => node.props.accessibilityLabel === label)!;
  (button.props.onPress as () => void)();
}
function expectVisible(nodes: Element[], index: number) {
  const content = nodes.find((node) => node.type === "ScrollView")!;
  const slide = content.props.children as Element;
  expect(content.key).toBeNull(); // Do not remount during an in-flight fade.
  expect(slide.type).toBe("AnimatedView");
  expect(nodes.some((node) => node.props.children === WALKTHROUGH_SLIDES[index]!.title)).toBe(true);
  expect(nodes.some((node) => node.props.children === WALKTHROUGH_SLIDES[index]!.description)).toBe(true);
  expect(nodes.some((node) => node.type === "Mascot" && node.props.pose === WALKTHROUGH_SLIDES[index]!.pose)).toBe(true);
}

beforeEach(() => { mockStates = []; mockCursor = 0; mockTiming.mockClear(); mockSetItem.mockClear(); mockAnimationComplete = null; });

test("every Next transition keeps the mascot, title, and description visible without animation callbacks", () => {
  let nodes = render();
  expect(nodes.some(node => node.type === "Image" && node.props.accessibilityLabel === "E-CHATCO logo")).toBe(true);
  expectVisible(nodes, 0);
  for (let index = 1; index < WALKTHROUGH_SLIDES.length; index++) {
    press(nodes, index === 1 ? "Get Started" : "Go to next slide");
    nodes = render();
    expectVisible(nodes, index);
  }
});

test("returning from slide two does not leave the content transparent", () => {
  let nodes = render();
  press(nodes, "Get Started");
  nodes = render();
  expectVisible(nodes, 1);
  press(nodes, "Go to previous slide");
  expectVisible(render(), 0);
});

test("Next animates the new slide without waiting to show its content", () => {
  mockStates[1] = false;
  let nodes = render();
  press(nodes, "Get Started");
  expect(mockTiming).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
    toValue: 1, duration: 340, useNativeDriver: true,
  }));
  nodes = render();
  expectVisible(nodes, 1);
  const slide = nodes.find(node => node.type === "ScrollView")!.props.children as Element;
  expect(slide.props.style).toEqual(expect.arrayContaining([expect.objectContaining({
    opacity: { inputRange: [0, 1], outputRange: [0.55, 1] },
    transform: [{ translateX: { inputRange: [0, 1], outputRange: [28, 0] } }],
  })]));
});

test("welcome slide has one Get Started action and no back button", () => {
  const nodes = render();
  expect(nodes.some(node => node.props.children === "WELCOME")).toBe(false);
  expect(nodes.some(node => Array.isArray(node.props.children) && node.props.children.includes(" / "))).toBe(false);
  const description = nodes.find(node => node.props.children === WALKTHROUGH_SLIDES[0]!.description)!;
  expect(description.props.style).toMatchObject({ textAlign: "center", fontSize: 17 });
  expect(nodes.some(node => node.props.accessibilityLabel === "Get Started" && node.props.accessibilityRole === "button")).toBe(true);
  expect(nodes.some(node => node.props.children === "Get Started")).toBe(true);
  expect(nodes.some(node => node.props.accessibilityLabel === "Go to previous slide")).toBe(false);
  expect(nodes.some(node => node.props.accessibilityLabel === "Go to next slide")).toBe(false);
});

test("Create Account waits for the exit transition before opening registration", async () => {
  mockStates[0] = WALKTHROUGH_SLIDES.length - 1;
  mockStates[1] = false;
  const onFinish = jest.fn();
  press(render(onFinish), "Create Account");
  await Promise.resolve();
  expect(mockSetItem).toHaveBeenCalledWith("@chatco_commuter_onboarding_completed", "true");
  expect(mockTiming).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
    toValue: 0, duration: 280, useNativeDriver: true,
  }));
  expect(onFinish).not.toHaveBeenCalled();
  expect(mockAnimationComplete).not.toBeNull();
  const complete = mockAnimationComplete as ((result: { finished: boolean }) => void) | null;
  complete?.({ finished: true });
  await Promise.resolve();
  expect(onFinish).toHaveBeenCalledWith("REGISTER");
});

test("Create Account opens registration immediately with reduced motion", async () => {
  mockStates[0] = WALKTHROUGH_SLIDES.length - 1;
  const onFinish = jest.fn();
  press(render(onFinish), "Create Account");
  await Promise.resolve();
  expect(mockTiming).not.toHaveBeenCalled();
  expect(onFinish).toHaveBeenCalledWith("REGISTER");
});
