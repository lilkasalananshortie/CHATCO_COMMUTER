/// <reference types="jest" />
import { SosSlideToSend } from "../SosSlideToSend";
let mockGesture: any;
jest.mock("react", () => ({ ...jest.requireActual("react"), useState: (value: unknown) => [value, jest.fn()], useRef: (value: unknown) => ({ current: value }), useMemo: (fn: () => unknown) => fn() }));
jest.mock("react-native", () => ({ View: "View", Platform: { OS: "android" }, PanResponder: { create: (config: unknown) => { mockGesture = config; return { panHandlers: {} }; } }, Animated: { View: "AnimatedView", Value: class { value = 0; setValue(value: number) { this.value = value; } interpolate(config: any) { return { source: this, config }; } }, spring: () => ({ start: () => {} }) } }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useCommuterTheme: () => ({ isLight: true }) }));
jest.mock("../BrandText", () => ({ Text: "Text" }));
test("partial slides do not send; completed duplicate slides send once", async () => {
  let finish!: () => void;
  const onSend = jest.fn(() => new Promise<void>(done => { finish = done; }));
  SosSlideToSend({ onSend });
  mockGesture.onPanResponderMove(null, { dx: 100, dy: 0 }); mockGesture.onPanResponderRelease();
  expect(onSend).not.toHaveBeenCalled();
  mockGesture.onPanResponderMove(null, { dx: 260, dy: 0 }); mockGesture.onPanResponderRelease(); mockGesture.onPanResponderRelease();
  expect(onSend).toHaveBeenCalledTimes(1);
  finish(); await Promise.resolve();
});

test("red fill tracks the same drag value as the handle and spans the track", () => {
  const tree = SosSlideToSend({ onSend: jest.fn() });
  const fill = tree.props.children.find((child: any) => child.props.testID === "sos-progress-fill");
  const width = fill.props.style.width;
  expect(fill.props.style.backgroundColor).toBe("#DC2626");
  expect(width.config).toEqual({ inputRange: [0, 224], outputRange: [0, 280], extrapolate: "clamp" });
  mockGesture.onPanResponderMove(null, { dx: 112, dy: 0 });
  expect(width.source.value).toBe(112);
  mockGesture.onPanResponderMove(null, { dx: 400, dy: 0 });
  expect(width.source.value).toBe(224);
});
