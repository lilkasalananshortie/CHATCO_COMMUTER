import { planGroupVouchers } from "../group-voucher-plan";
import { voucherWalletStatus } from "../rewards";
const seats = [17, 13.6, 13.6].map((fare, index) => ({ position: index + 1, fare, passengerType: "REGULAR", isPayer: index === 0 }));
test("group preview counts the payer once and starts with the full fare", () => {
  expect(planGroupVouchers(seats, []).remaining).toBe(44.2);
});
test("free rides cover the highest fares first", () => {
  expect(planGroupVouchers(seats, [{ id: "a", type: "REWARD", amount: null }, { id: "b", type: "REWARD", amount: null }]).remaining).toBe(13.6);
});
test("discount value can carry across seats", () => {
  expect(planGroupVouchers(seats, [{ id: "a", type: "DISCOUNT", amount: 25 }]).remaining).toBe(19.2);
});
test("unused vouchers are identified without creating negative fares", () => {
  const plan = planGroupVouchers(seats, [{ id: "a", type: "DISCOUNT", amount: 100 }, { id: "b", type: "DISCOUNT", amount: 5 }]);
  expect(plan.remaining).toBe(0); expect(plan.unused).toContain("b");
});
test("used vouchers remain used even after their expiry date", () => {
  expect(voucherWalletStatus({ id: "v", code: "code", status: "USED", expires_at: "2020-01-01" })).toBe("USED");
});
test("expired or malformed-expiry vouchers never appear available", () => {
  for (const expires_at of ["2020-01-01", "invalid"]) expect(voucherWalletStatus({ id: "v", code: "code", status: "AVAILABLE", expires_at })).toBe("EXPIRED");
});
test("available vouchers without expiry remain available", () => {
  expect(voucherWalletStatus({ id: "v", code: "code", status: "AVAILABLE" })).toBe("AVAILABLE");
});
