/// <reference types="jest" />
import { isVoucherAvailable, normalizeRewards, voucherLabel } from "../rewards";
import { notifyRewardsChanged, subscribeRewardsChanged } from "../rewards-events";

test("backend camelCase progress and expiry are preserved", () => {
  const result = normalizeRewards({ currentCycleRides: 4, ridesNeeded: 8, totalRides: 20, archivedVoucherCount: 12,
    vouchers: [{ id: "v", code: "code", type: "DISCOUNT", amount: "5.00", status: "AVAILABLE", expiresAt: "2099-01-01T00:00:00Z", rideOrigin: "Admin" }] });
  expect(result).toMatchObject({ currentCycleRides: 4, ridesNeeded: 8, totalRides: 20, progressPercent: 50, archivedVoucherCount: 12, availableVoucherCount: 1 });
  expect(result.vouchers![0]).toMatchObject({ type: "DISCOUNT", amount: 5, expires_at: "2099-01-01T00:00:00Z", rideOrigin: "Admin" });
});
test("legacy snake_case responses still work", () => {
  expect(normalizeRewards({ current_cycle_rides: 3, rides_needed: 10, total_rides: 13 })).toMatchObject({ currentCycleRides: 3, ridesNeeded: 10, totalRides: 13 });
});
test("expired and used vouchers do not inflate badges", () => {
  const result = normalizeRewards({ vouchers: [
    { id: "expired", status: "AVAILABLE", expiresAt: "2020-01-01" },
    { id: "used", status: "USED" }, { id: "valid", status: "AVAILABLE", expiresAt: null },
  ] });
  expect(result.availableVoucherCount).toBe(1);
  expect(result.vouchers![0]!.status).toBe("EXPIRED");
});
test("authoritative available voucher count is preserved for the rewards badge", () => {
  const result = normalizeRewards({ availableVoucherCount: 3, vouchers: [{ id: "v", status: "AVAILABLE" }] });
  expect(result.availableVoucherCount).toBe(3);
});
test("invalid expiry is not treated as usable", () => {
  expect(isVoucherAvailable({ id: "x", code: "x", status: "AVAILABLE", expires_at: "invalid" })).toBe(false);
});
test("zero thresholds cannot cause division by zero", () => {
  expect(Number.isFinite(normalizeRewards({ ridesNeeded: 0 }).progressPercent)).toBe(true);
});
test("free and peso discount labels are distinct", () => {
  expect(voucherLabel({ type: "DISCOUNT", amount: 5 })).toBe("₱5.00 Discount Voucher");
  expect(voucherLabel({ type: "FREE_RIDE" })).toBe("Free Ride Voucher");
  expect(voucherLabel({ type: "REWARD" })).toBe("Free Ride Voucher");
});
test("refresh subscriptions are removable", () => {
  const changed = jest.fn(); const off = subscribeRewardsChanged(changed);
  notifyRewardsChanged(); off(); notifyRewardsChanged();
  expect(changed).toHaveBeenCalledTimes(1);
});
