/// <reference types="jest" />
import { useHoldToConfirm } from "../useHoldToConfirm";
let mockRefs: any[] = [], mockRefIndex = 0, mockEffects: Array<() => any> = [];
let mockAppState: (state: string) => void;
jest.mock("react", () => ({ useCallback: (fn: unknown) => fn, useState: (initial: unknown) => [initial, jest.fn()], useRef: (initial: unknown) => { const i = mockRefIndex++; return mockRefs[i] ?? (mockRefs[i] = { current: initial }); }, useEffect: (fn: () => any) => { mockEffects.push(fn); } }));
jest.mock("react-native", () => ({ AppState: { addEventListener: (_: string, listener: (state: string) => void) => { mockAppState = listener; return { remove: jest.fn() }; } } }));
const confirm = jest.fn();
function render(enabled = true) { mockRefIndex = 0; mockEffects = []; return useHoldToConfirm(confirm, enabled); }
beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); mockRefs = []; });
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });
test("short tap never creates a hail", () => { const hold = render(); hold.start(); jest.advanceTimersByTime(599); hold.cancel(); jest.advanceTimersByTime(1000); expect(confirm).not.toHaveBeenCalled(); });
test("600ms hold creates one hail and release cannot cancel it", () => { const hold = render(); hold.start(); jest.advanceTimersByTime(600); hold.cancel(); jest.advanceTimersByTime(1000); expect(confirm).toHaveBeenCalledTimes(1); expect(hold.consumeCompleted()).toBe(true); expect(hold.consumeCompleted()).toBe(false); });
test("disabled or newly invalid assignment cannot confirm", () => { render(false).start(); jest.advanceTimersByTime(1000); expect(confirm).not.toHaveBeenCalled(); const hold = render(); hold.start(); render(false); jest.advanceTimersByTime(600); expect(confirm).not.toHaveBeenCalled(); });
test("background transition cancels an unfinished hold", () => { const hold = render(); mockEffects[1]!(); hold.start(); mockAppState("background"); jest.advanceTimersByTime(1000); expect(confirm).not.toHaveBeenCalled(); });
