/// <reference types="jest" />
import React from "react";
import { Animated } from "react-native";
import { LostFoundSkeleton } from "../LostFoundSkeleton";
let mockReduced = false, mockLight = false;
let mockEffect: () => void | (() => void);
const mockPulse = { setValue: jest.fn(), stopAnimation: jest.fn() };
jest.mock("react", () => ({ ...jest.requireActual("react"), useRef: () => ({ current: mockPulse }), useEffect: (fn: typeof mockEffect) => { mockEffect = fn; } }));
jest.mock("react-native", () => ({ View: "View", Platform: { OS: "android" }, useWindowDimensions: () => ({ width: 390 }), Easing: { bezier: () => "pulse" }, Animated: { View: "AnimatedView", Value: class {}, timing: jest.fn(), sequence: jest.fn(), loop: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })) } }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useCommuterTheme: () => ({ isLight: mockLight }) }));
jest.mock("../../../shared/useReducedMotion", () => ({ useReducedMotion: () => mockReduced }));
type E = React.ReactElement<Record<string, any>>;
function walk(n: any): E[] { if (Array.isArray(n)) return n.flatMap(walk); if (!React.isValidElement(n)) return []; const e = n as E; return [e, ...walk(e.props.children)]; }
beforeEach(() => { mockReduced = mockLight = false; jest.clearAllMocks(); });
test("found and watched items use web day/trip groups and clipped horizontal item placeholders", () => {
  const tree = walk(LostFoundSkeleton({}));
  expect(tree.filter(e => e.props.testID === "found-day-skeleton")).toHaveLength(2);
  expect(tree.filter(e => e.props.testID === "found-trip-skeleton")).toHaveLength(4);
  expect(tree.filter(e => e.props.testID === "found-item-skeleton")).toHaveLength(10);
  expect(tree[0]!.props.accessibilityState.busy).toBe(true);
  expect(tree[0]!.props.pointerEvents).toBe("none");
});
test("My Claims uses four large placeholders instead of found-item groups", () => {
  const tree = walk(LostFoundSkeleton({ claims: true }));
  expect(tree.filter(e => e.props.testID === "claim-skeleton-card")).toHaveLength(4);
  expect(tree.filter(e => e.props.testID === "found-day-skeleton")).toHaveLength(0);
  expect(tree[0]!.props.accessibilityLabel).toBe("Loading your claims");
});
test("pulse stops when loading finishes and reduced motion stays static", () => {
  LostFoundSkeleton({}); const cleanup = mockEffect();
  expect(Animated.loop).toHaveBeenCalledTimes(1);
  if (cleanup) cleanup();
  expect((Animated.loop as jest.Mock).mock.results[0]!.value.stop).toHaveBeenCalledTimes(1);
  expect(mockPulse.stopAnimation).toHaveBeenCalledTimes(1);
  jest.clearAllMocks(); mockReduced = true;
  LostFoundSkeleton({}); mockEffect();
  expect(Animated.loop).not.toHaveBeenCalled();
  expect(mockPulse.setValue).toHaveBeenCalledWith(1);
});
test("light mode uses white placeholder cards", () => {
  mockLight = true;
  const card = walk(LostFoundSkeleton({ claims: true })).find(e => e.props.testID === "claim-skeleton-card")!;
  expect(card.props.style).toMatchObject({ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" });
});
