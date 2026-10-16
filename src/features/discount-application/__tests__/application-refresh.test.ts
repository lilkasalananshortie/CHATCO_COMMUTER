/// <reference types="jest" />
import { useDiscountApplication } from "../useDiscountApplication";
import { discountApplicationService } from "../../../core/api/discount-application-service";
import { AppState } from "react-native";
let mockStates: any[] = [], mockRefs: any[] = [], mockEffects: Array<() => void | (() => void)> = [];
let mockStateCursor = 0, mockRefCursor = 0;
let mockListener: (next: string) => void;
const mockRemove = jest.fn();
jest.mock("react", () => ({
  useCallback: (callback: unknown) => callback,
  useState: (initial: unknown) => {
    const slot = mockStateCursor++;
    if (!(slot in mockStates)) mockStates[slot] = initial;
    return [mockStates[slot], (next: any) => { mockStates[slot] = typeof next === "function" ? next(mockStates[slot]) : next; }];
  },
  useRef: (initial: unknown) => { const slot = mockRefCursor++; return mockRefs[slot] ?? (mockRefs[slot] = { current: initial }); },
  useEffect: (effect: () => void) => { mockEffects.push(effect); },
}));
jest.mock("react-native", () => ({ AppState: { currentState: "active", addEventListener: jest.fn((_event, listener) => { mockListener = listener; return { remove: mockRemove }; }) } }));
jest.mock("../../../core/api/discount-application-service", () => ({ discountApplicationService: { state: jest.fn() } }));
const backendState = { status: "PENDING", commuter_type: "REGULAR", effective_fare_type: "REGULAR", can_submit: false };
function render(owner?: string) {
  mockStateCursor = mockRefCursor = 0; mockEffects = [];
  return useDiscountApplication(owner);
}
async function flush() { for (let i = 0; i < 8; i++) await Promise.resolve(); }
beforeEach(() => {
  mockStates = []; mockRefs = []; mockEffects = []; jest.clearAllMocks(); jest.useFakeTimers();
  AppState.currentState = "active";
  (discountApplicationService.state as jest.Mock).mockResolvedValue(backendState);
});
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });
test("simultaneous refreshes share one read", async () => {
  const hook = render("user");
  await Promise.all([hook.refresh(), hook.refresh(), hook.refresh()]);
  expect(discountApplicationService.state).toHaveBeenCalledTimes(1);
  expect(render("user").state).toEqual(backendState);
});
test("account switch hides previous data and ignores its in-flight response", async () => {
  let resolve!: (value: unknown) => void;
  (discountApplicationService.state as jest.Mock).mockReturnValue(new Promise((done) => { resolve = done; }));
  const old = render("first"); const pending = old.refresh();
  expect(render("second").state).toBeNull();
  resolve(backendState); await pending;
  expect(render("second").state).toBeNull();
  await old.refresh();
  expect(discountApplicationService.state).toHaveBeenCalledTimes(1);
});
test("logout hides data immediately and makes no new request", async () => {
  await render("user").refresh();
  const hook = render(undefined);
  expect(hook.state).toBeNull(); await hook.refresh();
  expect(discountApplicationService.state).toHaveBeenCalledTimes(1);
});
test("failed revalidation clears stale eligibility", async () => {
  await render("user").refresh();
  (discountApplicationService.state as jest.Mock).mockRejectedValue(new Error("Offline"));
  await render("user").refresh();
  expect(render("user")).toMatchObject({ state: null, error: "Offline", loading: false });
});
test("missing backend gives a deployment message rather than a fake state", async () => {
  (discountApplicationService.state as jest.Mock).mockRejectedValue(Object.assign(new Error("Not found"), { status: 404 }));
  await render("user").refresh();
  expect(render("user").error).toContain("backend must be deployed");
});
test("resume and active fallback refresh; background fallback does not", async () => {
  render("user"); const cleanup = mockEffects[0]!() as () => void; await flush();
  expect(discountApplicationService.state).toHaveBeenCalledTimes(1);
  AppState.currentState = "background";
  jest.advanceTimersByTime(60000); await flush();
  expect(discountApplicationService.state).toHaveBeenCalledTimes(1);
  AppState.currentState = "active"; mockListener("active"); await flush();
  jest.advanceTimersByTime(60000); await flush();
  expect(discountApplicationService.state).toHaveBeenCalledTimes(3);
  cleanup(); expect(mockRemove).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(60000); await flush();
  expect(discountApplicationService.state).toHaveBeenCalledTimes(3);
});
test("post-write refresh waits for an old read then fetches fresh state", async () => {
  let resolve!: (value: unknown) => void;
  (discountApplicationService.state as jest.Mock).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  const hook = render("user"); const first = hook.refresh(); const after = hook.refreshAfterMutation();
  expect(discountApplicationService.state).toHaveBeenCalledTimes(1);
  resolve({ ...backendState, status: "NOT_APPLIED", can_submit: true });
  await first; await after;
  expect(discountApplicationService.state).toHaveBeenCalledTimes(2);
  expect(render("user").state).toEqual(backendState);
});
test("unmounted hook ignores late replies", async () => {
  let resolve!: (value: unknown) => void;
  (discountApplicationService.state as jest.Mock).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  render("user"); const cleanup = mockEffects[0]!() as () => void;
  cleanup(); resolve(backendState); await flush();
  expect(render("user").state).toBeNull();
});
