/// <reference types="jest" />
import { usePublishedRoute } from "../usePublishedRoute";
import { request } from "../../../core/api/api-client";
import { appStorage } from "../../../core/storage/app-storage";

let mockStates: any[] = [], mockCursor = 0;
let mockEffect: () => () => void;
let mockRefresh: () => Promise<void>;
const mockStop = jest.fn();
jest.mock("react", () => ({
  useState: (initial: any) => {
    const index = mockCursor++;
    if (!(index in mockStates)) mockStates[index] = typeof initial === "function" ? initial() : initial;
    return [mockStates[index], (next: any) => { mockStates[index] = typeof next === "function" ? next(mockStates[index]) : next; }];
  },
  useEffect: (effect: () => () => void) => { mockEffect = effect; },
}));
jest.mock("../../../shared/foreground-poll", () => ({ foregroundPoll: (task: () => Promise<void>) => {
  mockRefresh = task;
  return { stop: mockStop };
} }));
jest.mock("../../../core/api/api-client", () => ({ request: jest.fn() }));
jest.mock("../../../core/storage/app-storage", () => ({ appStorage: { getItem: jest.fn(), setItem: jest.fn() } }));
function render() { mockCursor = 0; return usePublishedRoute(); }
beforeEach(() => { mockStates = []; jest.clearAllMocks(); (appStorage.getItem as jest.Mock).mockResolvedValue(null); });

test("identical route polls keep coordinates stable, but geometry changes replace them", async () => {
  const points = [[14, 120], [15, 121]];
  (request as jest.Mock).mockResolvedValue({ coordinates: points });
  render(); const stop = mockEffect();
  await mockRefresh();
  const first = render().coordinates;
  await mockRefresh();
  expect(render().coordinates).toBe(first);
  (request as jest.Mock).mockResolvedValue({ coordinates: [[14, 120], [16, 122]] });
  await mockRefresh();
  expect(render().coordinates).not.toBe(first);
  stop(); expect(mockStop).toHaveBeenCalledTimes(1);
});

test("failed or invalid refresh retains route and exposes cached state", async () => {
  (request as jest.Mock).mockResolvedValue({ coordinates: [[14, 120], [15, 121]] });
  render(); const stop = mockEffect(); await mockRefresh();
  const first = render().coordinates;
  (request as jest.Mock).mockResolvedValue({ coordinates: [] });
  await mockRefresh();
  expect(render()).toEqual({ coordinates: first, source: "cached" });
  (request as jest.Mock).mockRejectedValue(new Error("offline"));
  await mockRefresh(); expect(render().coordinates).toBe(first);
  stop();
});

test("late response after unmount cannot replace coordinates", async () => {
  let resolve!: (value: unknown) => void;
  (request as jest.Mock).mockReturnValue(new Promise(done => { resolve = done; }));
  const initial = render().coordinates; const stop = mockEffect();
  const pending = mockRefresh(); await Promise.resolve(); await Promise.resolve();
  stop(); resolve({ coordinates: [[14, 120], [15, 121]] }); await pending;
  expect(render().coordinates).toBe(initial);
});
