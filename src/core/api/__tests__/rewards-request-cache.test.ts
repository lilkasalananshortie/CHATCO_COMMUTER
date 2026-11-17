/// <reference types="jest" />
import { clearRewardsRequestCache, getSharedRewards } from "../rewards-request-cache";

beforeEach(() => {
  jest.useFakeTimers();
  clearRewardsRequestCache();
});
afterEach(() => jest.useRealTimers());

test("shares an in-flight rewards request and reuses its result for the poll interval", async () => {
  const fetchRewards = jest.fn(async () => ({ totalRides: 2, ridesNeeded: 10, vouchers: [], availableVoucherCount: 0 }));
  const first = getSharedRewards("session-a", fetchRewards);
  const second = getSharedRewards("session-a", fetchRewards);
  expect(second).toBe(first);
  await first;
  await getSharedRewards("session-a", fetchRewards);
  expect(fetchRewards).toHaveBeenCalledTimes(1);

  jest.advanceTimersByTime(30_001);
  await getSharedRewards("session-a", fetchRewards);
  expect(fetchRewards).toHaveBeenCalledTimes(2);
});

test("does not reuse rewards after an account change or explicit invalidation", async () => {
  const fetchRewards = jest.fn(async () => ({ totalRides: 0, ridesNeeded: 10, vouchers: [], availableVoucherCount: 0 }));
  await getSharedRewards("session-a", fetchRewards);
  await getSharedRewards("session-b", fetchRewards);
  clearRewardsRequestCache();
  await getSharedRewards("session-b", fetchRewards);
  expect(fetchRewards).toHaveBeenCalledTimes(3);
});

test("failed rewards requests can be retried", async () => {
  const fetchRewards = jest.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ vouchers: [] });
  await expect(getSharedRewards("session-a", fetchRewards)).rejects.toThrow("offline");
  await expect(getSharedRewards("session-a", fetchRewards)).resolves.toEqual({ vouchers: [] });
  expect(fetchRewards).toHaveBeenCalledTimes(2);
});
