/// <reference types="jest" />
import { LoginBoardingAnimation } from "../LoginBoardingAnimation";

let mockEffect: () => (() => void);
const mockReduced = jest.fn();
const mockStart = jest.fn();
const mockStop = jest.fn();
const mockSetFrame = jest.fn();
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useRef: (current: unknown) => ({ current }),
  useState: () => [0, mockSetFrame],
  useEffect: (effect: () => (() => void)) => { mockEffect = effect; },
}));
jest.mock("react-native", () => ({
  View: "View", Text: "Text",
  // Match React Native Web: Image has no resolveAssetSource static method.
  Image: "Image",
  StyleSheet: { create: (styles: unknown) => styles },
  useWindowDimensions: () => ({ width: 320 }),
  AccessibilityInfo: { isReduceMotionEnabled: () => mockReduced() },
  Easing: { cubic: "cubic", in: () => "in", inOut: () => "inOut" },
  Animated: {
    View: "AnimatedView",
    Value: class { interpolate(config: unknown) { return config; } },
    timing: () => ({ start: mockStart, stop: mockStop }), delay: jest.fn(),
    sequence: () => ({ start: mockStart, stop: mockStop }),
  },
}));
jest.mock("../../../../assets/mascot/mascot-boarding-sheet-v2.png", () => 1);

async function mount() {
  const complete = jest.fn();
  LoginBoardingAnimation({ onComplete: complete });
  const cleanup = mockEffect();
  await Promise.resolve();
  await Promise.resolve();
  return { complete, cleanup };
}
beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks();
  mockReduced.mockResolvedValue(false);
});
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

test("boarding must finish before navigating and navigation happens once", async () => {
  const { complete, cleanup } = await mount();
  expect(complete).not.toHaveBeenCalled();
  jest.advanceTimersByTime(2240);
  const done = mockStart.mock.calls[0]![0];
  done({ finished: true }); done({ finished: true });
  jest.advanceTimersByTime(5000);
  expect(complete).toHaveBeenCalledTimes(1);
  cleanup();
});
test("reduced motion skips the animated journey", async () => {
  mockReduced.mockResolvedValue(true);
  const { complete, cleanup } = await mount();
  expect(mockStart).not.toHaveBeenCalled();
  expect(complete).toHaveBeenCalledTimes(1);
  cleanup();
});
test("missing animation callback cannot strand the authenticated user", async () => {
  const { complete, cleanup } = await mount();
  jest.advanceTimersByTime(5000);
  expect(complete).toHaveBeenCalledTimes(1);
  cleanup();
});
test("unmount stops animation and prevents late navigation", async () => {
  const { complete, cleanup } = await mount();
  jest.advanceTimersByTime(2240);
  cleanup();
  mockStart.mock.calls[0]![0]({ finished: true });
  jest.advanceTimersByTime(5000);
  expect(mockStop).toHaveBeenCalledTimes(1);
  expect(complete).not.toHaveBeenCalled();
});
test("an interrupted animation does not claim completion", async () => {
  const { complete, cleanup } = await mount();
  jest.advanceTimersByTime(2240);
  mockStart.mock.calls[0]![0]({ finished: false });
  expect(complete).not.toHaveBeenCalled();
  cleanup();
});

test("plays all boarding poses in order before transitioning to dashboard", async () => {
  const { complete, cleanup } = await mount();
  jest.advanceTimersByTime(1700);
  expect(mockSetFrame.mock.calls.map((call) => call[0])).toEqual([1, 2, 3, 4, 5]);
  expect(mockStart).not.toHaveBeenCalled();
  expect(complete).not.toHaveBeenCalled();
  cleanup();
});

test("renders in browser without the native-only Image.resolveAssetSource API", async () => {
  const { Image } = jest.requireMock("react-native");
  expect(Image.resolveAssetSource).toBeUndefined();
  const { complete, cleanup } = await mount();
  jest.advanceTimersByTime(2240);
  mockStart.mock.calls[0]![0]({ finished: true });
  expect(complete).toHaveBeenCalledTimes(1);
  cleanup();
});
