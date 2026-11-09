/// <reference types="jest" />
import { AppState, Platform } from "react-native";
import { foregroundPoll } from "../foreground-poll";

let mockListener: (state: string) => void;
const mockRemove = jest.fn();
jest.mock("react-native", () => ({
  AppState: { currentState: "active", addEventListener: jest.fn((_event, listener) => {
    mockListener = listener;
    return { remove: mockRemove };
  }) },
  Platform: { OS: "android" },
}));
async function flush() { for (let i = 0; i < 8; i++) await Promise.resolve(); }
beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks();
  AppState.currentState = "active";
  Object.assign(Platform, { OS: "android" });
});
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

test("slow requests and manual refreshes share one in-flight task", async () => {
  let finish!: () => void;
  const task = jest.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  const poll = foregroundPoll(task, 2000);
  await flush();
  await jest.advanceTimersByTimeAsync(10000);
  const first = poll.refresh();
  expect(poll.refresh()).toBe(first);
  expect(task).toHaveBeenCalledTimes(1);
  finish(); await first;
  await jest.advanceTimersByTimeAsync(2000);
  expect(task).toHaveBeenCalledTimes(2);
  poll.stop(); finish();
});

test("mutation events revalidate after an in-flight read instead of losing the update", async () => {
  let finish!: () => void;
  const task = jest.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  const poll = foregroundPoll(task, 5000);
  await flush();
  const event = poll.refresh(true);
  const duplicateEvent = poll.refresh(true);
  expect(task).toHaveBeenCalledTimes(1);
  finish(); await flush();
  expect(task).toHaveBeenCalledTimes(2);
  finish(); await Promise.all([event, duplicateEvent]);
  poll.stop();
});

test("background ticks stop and returning to the foreground refreshes immediately", async () => {
  const task = jest.fn(async () => {});
  const poll = foregroundPoll(task, 5000);
  await flush();
  mockListener("background");
  await jest.advanceTimersByTimeAsync(30000);
  expect(task).toHaveBeenCalledTimes(1);
  mockListener("active"); await flush();
  expect(task).toHaveBeenCalledTimes(2);
  poll.stop(); mockListener("active");
  await jest.advanceTimersByTimeAsync(30000);
  expect(task).toHaveBeenCalledTimes(2);
  expect(mockRemove).toHaveBeenCalledTimes(1);
});

test("starts quietly in background and retries after a rejected foreground request", async () => {
  AppState.currentState = "background";
  const task = jest.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
  const poll = foregroundPoll(task, 5000);
  await flush(); expect(task).not.toHaveBeenCalled();
  mockListener("active"); await flush();
  await jest.advanceTimersByTimeAsync(5000);
  expect(task).toHaveBeenCalledTimes(2);
  poll.stop();
});

test("cleanup before the first microtask prevents a request", async () => {
  const task = jest.fn(async () => {});
  const poll = foregroundPoll(task, 5000);
  poll.stop(); await flush();
  expect(task).not.toHaveBeenCalled();
});

test("web refresh waits for visibility and connectivity and removes browser listeners", async () => {
  Object.assign(Platform, { OS: "web" });
  const listeners = new Map<string, () => void>();
  const doc = { visibilityState: "hidden", addEventListener: jest.fn((event, handler) => listeners.set(event, handler)), removeEventListener: jest.fn() };
  const win = { addEventListener: jest.fn((event, handler) => listeners.set(event, handler)), removeEventListener: jest.fn() };
  const nav = { onLine: true };
  const originals = ["window", "document", "navigator"].map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperties(globalThis, {
    window: { value: win, configurable: true }, document: { value: doc, configurable: true }, navigator: { value: nav, configurable: true },
  });
  try {
    const task = jest.fn(async () => {});
    const poll = foregroundPoll(task, 5000);
    await jest.advanceTimersByTimeAsync(10000);
    expect(task).not.toHaveBeenCalled();
    doc.visibilityState = "visible"; nav.onLine = false;
    listeners.get("visibilitychange")!(); await flush();
    expect(task).not.toHaveBeenCalled();
    nav.onLine = true; listeners.get("online")!(); await flush();
    expect(task).toHaveBeenCalledTimes(1);
    poll.stop();
    expect(doc.removeEventListener).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    expect(win.removeEventListener).toHaveBeenCalledWith("online", expect.any(Function));
  } finally {
    ["window", "document", "navigator"].forEach((key, index) => {
      const descriptor = originals[index];
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
});
