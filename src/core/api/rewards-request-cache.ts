import type { RewardProgress } from "../domain/types";

const REWARDS_CACHE_MS = 30_000;
let sessionKey: string | null = null;
let cached: RewardProgress | null = null;
let cachedAt = 0;
let inFlight: Promise<RewardProgress> | null = null;

export function clearRewardsRequestCache() {
  cached = null;
  cachedAt = 0;
  inFlight = null;
}

export function getSharedRewards(session: string | null, fetchRewards: () => Promise<RewardProgress>): Promise<RewardProgress> {
  if (sessionKey !== session) {
    sessionKey = session;
    clearRewardsRequestCache();
  }
  if (cached && Date.now() - cachedAt < REWARDS_CACHE_MS) return Promise.resolve(cached);
  if (inFlight) return inFlight;

  const request = fetchRewards();
  inFlight = request;
  void request.then(
    value => {
      if (sessionKey === session && inFlight === request) {
        cached = value;
        cachedAt = Date.now();
        inFlight = null;
      }
    },
    () => { if (inFlight === request) inFlight = null; },
  );
  return request;
}
