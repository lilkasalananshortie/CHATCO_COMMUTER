/// <reference types="jest" />
import { loadRewardsAndUpdates } from "../load-rewards";

describe("real rewards and announcement states", () => {
  test("successful empty lists remain empty, enabling the noticeboard", async () => {
    const result = await loadRewardsAndUpdates({ getRewards: async () => ({ vouchers: [], availableVoucherCount: 0 }), getAnnouncements: async () => [] });
    expect(result.rewards).toEqual({ status: "fulfilled", value: { vouchers: [], availableVoucherCount: 0 } });
    expect(result.announcements).toEqual({ status: "fulfilled", value: [] });
  });
  test("offline rewards never become a sample usable voucher", async () => {
    const error = Object.assign(new Error("offline"), { name: "NetworkError" });
    const result = await loadRewardsAndUpdates({ getRewards: async () => { throw error; }, getAnnouncements: async () => [] });
    expect(result.rewards).toEqual({ status: "rejected", reason: error });
  });
  test("announcement failure is not an empty-success noticeboard", async () => {
    const result = await loadRewardsAndUpdates({ getRewards: async () => ({ totalRides: 3 }), getAnnouncements: async () => { throw new Error("offline"); } });
    expect(result.rewards.status).toBe("fulfilled");
    expect(result.announcements.status).toBe("rejected");
  });
  test("server-earned voucher is returned unchanged", async () => {
    const data = { vouchers: [{ id: "earned-cycle-1", code: "REAL", status: "AVAILABLE" as const, expires_at: "2030-01-01" }] };
    const result = await loadRewardsAndUpdates({ getRewards: async () => data, getAnnouncements: async () => [] });
    if (result.rewards.status !== "fulfilled") throw new Error("Expected successful rewards");
    expect(result.rewards.value).toBe(data);
  });
});
