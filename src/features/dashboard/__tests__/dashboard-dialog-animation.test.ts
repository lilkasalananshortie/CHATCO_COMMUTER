/// <reference types="jest" />
import React from "react";
import { Animated } from "react-native";
import { DashboardDialog } from "../DashboardDialog";
let mockReduced = false;
let mockEffect: () => void | (() => void);
jest.mock("react", () => ({ ...jest.requireActual("react"), useRef: (initial: unknown) => ({ current: initial }), useState: (initial: unknown) => [initial, jest.fn()], useEffect: (effect: typeof mockEffect) => { mockEffect = effect; } }));
jest.mock("react-native", () => ({
  Modal: "Modal", Pressable: "Button", View: "View", ScrollView: "Scroll", Platform: { OS: "android" },
  useWindowDimensions: () => ({ height: 640 }),
  Animated: { View: "AnimatedView", Value: class { setValue = jest.fn(); interpolate = jest.fn(() => 0); }, timing: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })) },
  Easing: { bezier: jest.fn(() => "ease-out") },
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 16 }) }));
jest.mock("../../../shared/useReducedMotion", () => ({ useReducedMotion: () => mockReduced }));
jest.mock("../../../shared/ui/BrandText", () => ({ Text: "Text" }));
jest.mock("../../../shared/ui/WebIcon", () => ({ WebIcon: "Icon" }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useCommuterTheme: () => ({ colors: jest.requireActual("../../../core/theme/colors").commuterColors, isLight: false }) }));
type E = React.ReactElement<Record<string, any>>;
function walk(n: any): E[] { if (Array.isArray(n)) return n.flatMap(walk); if (!React.isValidElement(n)) return []; const e = n as E; return [e, ...walk(e.props.children)]; }
beforeEach(() => { mockReduced = false; jest.clearAllMocks(); });
test("web entrance moves the panel up 10px while fading over 300ms and stops on cleanup", () => {
  const nodes = walk(DashboardDialog({ visible: true, animateEntrance: true, children: null }));
  const cleanup = mockEffect();
  expect(Animated.timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ duration: 300, easing: "ease-out", toValue: 1 }));
  const panel = nodes.find(e => e.props.accessibilityViewIsModal)!;
  expect(panel.props.style.opacity.interpolate).toHaveBeenCalledWith({ inputRange: [0, 1], outputRange: [10, 0] });
  expect(nodes[0]!.props.animationType).toBe("none");
  if (cleanup) cleanup();
  expect((Animated.timing as jest.Mock).mock.results[0]!.value.stop).toHaveBeenCalledTimes(1);
});
test("reduced motion shows content immediately without an entrance animation", () => {
  mockReduced = true;
  const nodes = walk(DashboardDialog({ visible: true, animateEntrance: true, children: null }));
  mockEffect();
  expect(Animated.timing).not.toHaveBeenCalled();
  expect(nodes.find(e => e.props.accessibilityViewIsModal)!.props.style.opacity.setValue).toHaveBeenCalledWith(1);
});
