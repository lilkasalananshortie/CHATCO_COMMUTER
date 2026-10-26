jest.mock("../api-client", () => ({ post: jest.fn(), request: jest.fn(), put: jest.fn() }));
import { post } from "../api-client";
import { commuterService } from "../commuter-service";
beforeEach(() => jest.resetAllMocks());
test("group claim keeps all voucher choices and server seat fares", async () => {
  (post as jest.Mock).mockResolvedValue({ transaction_id: "t", amount: "30.60", is_group: true, available_vouchers: [{ id: "v", type: "DISCOUNT", amount: "5.00", expires_at: null }], seats: [{ position: 1, fare: "17", passenger_type: "REGULAR", is_payer: true }] });
  expect(await commuterService.claimGcash("qr")).toMatchObject({ amount: 30.6, availableVouchers: [{ id: "v", amount: 5 }], seats: [{ position: 1, fare: 17, isPayer: true }] });
});
test("group vouchers use the existing mobile route and voucher_ids", async () => {
  (post as jest.Mock).mockResolvedValue({ amount: 13.6, transaction_id: "t" });
  expect((await commuterService.redeemVoucherForGcash("t", ["a", "b"])).amount).toBe(13.6);
  expect(post).toHaveBeenCalledWith("/mobile/commuter/payments/t/redeem-voucher", { voucher_ids: ["a", "b"] });
});
test("solo voucher contract is preserved", async () => {
  (post as jest.Mock).mockResolvedValue({ amount: 0 });
  await commuterService.redeemVoucherForGcash("t", "a");
  expect(post).toHaveBeenCalledWith("/mobile/commuter/payments/t/redeem-voucher", { voucher_id: "a" });
});
test("redemption failures are propagated, not converted to success", async () => {
  (post as jest.Mock).mockRejectedValue(new Error("Voucher already used"));
  await expect(commuterService.redeemVoucherForGcash("t", ["a"])).rejects.toThrow("already used");
});
