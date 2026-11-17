/// <reference types="jest" />
import React from "react";
import { Animated } from "react-native";
import { FareSheet } from "../FareSheet";
let mockReduced = false, mockMounted: boolean | undefined;
let mockEffect: () => void | (() => void);
let mockFinish: (result: { finished: boolean }) => void;
const mockProgress = { setValue: jest.fn(), interpolate: jest.fn(() => 0) };
jest.mock("react", () => ({ ...jest.requireActual("react"), useRef: () => ({ current: mockProgress }), useEffect: (fn: typeof mockEffect) => { mockEffect = fn; }, useState: (initial: boolean) => { if (mockMounted === undefined) mockMounted = initial; return [mockMounted, (value: boolean) => { mockMounted = value; }]; } }));
jest.mock("react-native", () => ({ StyleSheet: { absoluteFill: {} }, Modal: "Modal", Pressable: "Button", View: "View", Platform: { OS: "android" }, useWindowDimensions: () => ({ height: 320 }), Easing: { bezier: () => "ease-out" }, Animated: { View: "Panel", Value: class {}, timing: jest.fn(() => ({ start: (fn: typeof mockFinish) => { mockFinish = fn; }, stop: jest.fn() })) } }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 16 }) }));
jest.mock("../../../shared/useReducedMotion", () => ({ useReducedMotion: () => mockReduced }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useCommuterTheme: () => ({ colors: { surface: "white" } }) }));
jest.mock("../FareScreen", () => ({ FareScreen: "Calculator" }));
type E = React.ReactElement<Record<string, any>>;
function walk(n: any): E[] { if (Array.isArray(n)) return n.flatMap(walk); if (!React.isValidElement(n)) return []; const e = n as E; return [e, ...walk(e.props.children)]; }
function render(visible = true, onClose = jest.fn()) { return walk(FareSheet({ visible, onClose })); }
beforeEach(() => { mockReduced = false; mockMounted = undefined; jest.clearAllMocks(); });
test("Android Back, calculator X and backdrop dismiss the fare sheet", () => {
  const close = jest.fn(); const nodes = render(true, close);
  nodes.find(e => e.type === "Modal")!.props.onRequestClose();
  nodes.find(e => e.type === "Calculator")!.props.onClose();
  nodes.find(e => e.props.accessibilityLabel === "Dismiss Fare Matrix")!.props.onPress();
  expect(close).toHaveBeenCalledTimes(3);
  const panel = nodes.find(e => e.props.accessibilityViewIsModal)!;
  expect(panel.props.style.height).toBeLessThanOrEqual(296); expect(panel.props.style.paddingBottom).toBe(16);
  expect(nodes.some(e => e.props.children === "Fare Matrix" || e.props.children === "Close")).toBe(false);
});
test("reduced motion disables transitions and closed sheet releases calculator", () => {
  mockReduced = true;
  render(true); mockEffect();
  render(false); mockEffect();
  expect(render(false).some(e => e.type === "Calculator")).toBe(false);
  expect(Animated.timing).not.toHaveBeenCalled();
});
test("sheet slides both ways over 300ms and stays mounted until exit finishes", () => {
  render(true); const stop = mockEffect();
  expect(Animated.timing).toHaveBeenLastCalledWith(mockProgress, expect.objectContaining({ toValue: 1, duration: 300, easing: "ease-out" }));
  if (stop) stop();
  expect(render(false).find(e => e.type === "Modal")!.props.visible).toBe(true);
  mockEffect();
  expect(Animated.timing).toHaveBeenLastCalledWith(mockProgress, expect.objectContaining({ toValue: 0, duration: 300 }));
  mockFinish({ finished: false });
  expect(render(false).some(e => e.type === "Calculator")).toBe(true);
  mockFinish({ finished: true });
  expect(render(false).some(e => e.type === "Calculator")).toBe(false);
});
