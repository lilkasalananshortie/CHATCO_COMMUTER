/// <reference types="jest" />
jest.mock("../api-client", () => ({ post: jest.fn(), request: jest.fn(), put: jest.fn(), del: jest.fn() }));
import { post, request } from "../api-client";
import { commuterService } from "../commuter-service";
import { studentRenewalService } from "../student-renewal-service";
const mockPost = post as jest.Mock;
const mockRequest = request as jest.Mock;
beforeEach(() => { jest.resetAllMocks(); mockPost.mockResolvedValue({}); mockRequest.mockResolvedValue({}); });

test("live share update targets the original token instead of general commuter presence", async () => {
  await commuterService.updateShareRideLocation({ lat: 14.8, lng: 120.9, token: "trk_original" });
  expect(mockPost).toHaveBeenCalledWith("/mobile/commuter/share-ride", { lat: 14.8, lng: 120.9, token: "trk_original", rotate: false });
});
test("hail reads preserve authoritative expiry and active recovery state", async () => {
  mockRequest.mockResolvedValue({ id: "hail", status: "PENDING", expires_at: "2026-10-17T01:00:00Z" });
  expect(await commuterService.getActiveHail()).toMatchObject({ id: "hail", expires_at: "2026-10-17T01:00:00Z" });
  expect(await commuterService.getHailStatus("hail")).toMatchObject({ expires_at: "2026-10-17T01:00:00Z" });
});
test("network error is not the same as no active hail", async () => {
  mockRequest.mockRejectedValue(new Error("offline"));
  await expect(commuterService.getActiveHail()).rejects.toThrow("offline");
  await expect(commuterService.getHailStatus("hail")).rejects.toThrow("offline");
});
test("payment history retains server-wide summary independently of loaded rows", async () => {
  mockRequest.mockResolvedValue({ data: [], summary: { total_spent: 500, ride_count: 20, average_fare: 25 }, total: 21, last_page: 2 });
  expect(await commuterService.getPaymentHistory()).toMatchObject({ summary: { total_spent: 500, ride_count: 20, average_fare: 25 } });
});

test("GCash claim preserves offered voucher type and peso amount", async () => {
  mockPost.mockResolvedValue({ transaction_id: "ride", amount: "30.00", voucher_available: true,
    available_voucher: { id: "v", type: "DISCOUNT", amount: "5.00" }, is_group: true });
  expect(await commuterService.claimGcash("token")).toMatchObject({ transactionId: "ride", amount: 30, availableVoucher: { id: "v", type: "DISCOUNT", amount: 5 }, isGroup: true });
  expect(mockPost).toHaveBeenCalledWith("/mobile/commuter/payments/claim", { qr_token: "token" });
});
test("redeeming selected voucher sends its id and preserves remaining group balance", async () => {
  mockPost.mockResolvedValue({ transaction_id: "ride", amount: "25", checkout_url: "https://checkout.test/remaining", is_group: true });
  expect(await commuterService.redeemVoucherForGcash("ride", "v")).toMatchObject({ amount: 25, checkoutUrl: "https://checkout.test/remaining", voucherAvailable: false, isGroup: true });
  expect(mockPost).toHaveBeenCalledWith("/mobile/commuter/payments/ride/redeem-voucher", { voucher_id: "v" });
});
test("fully covered ride retains zero amount and no checkout", async () => {
  mockPost.mockResolvedValue({ transaction_id: "ride", amount: 0, checkout_url: null });
  expect(await commuterService.redeemVoucherForGcash("ride")).toMatchObject({ amount: 0, checkoutUrl: null });
  expect(mockPost).toHaveBeenCalledWith("/mobile/commuter/payments/ride/redeem-voucher", {});
});
test("redemption failures propagate instead of being reported as success", async () => {
  mockPost.mockRejectedValue(new Error("Voucher expired"));
  await expect(commuterService.redeemVoucherForGcash("ride", "v")).rejects.toThrow("expired");
});
test("payment status uses the dedicated mobile endpoint and escapes identifiers", async () => {
  mockRequest.mockResolvedValue({ status: "PENDING" });
  expect(await commuterService.getPaymentStatus("ride/id")).toEqual({ status: "PENDING" });
  expect(mockRequest).toHaveBeenCalledWith("/mobile/payments/ride%2Fid/status");
});
test("rewards read accepts backend camelCase response", async () => {
  mockRequest.mockResolvedValue({ currentCycleRides: 5, ridesNeeded: 10, totalRides: 25 });
  expect(await commuterService.getRewards()).toMatchObject({ currentCycleRides: 5, totalRides: 25 });
});
test("private voucher and renewal notices map to supported presentation types", async () => {
  mockRequest.mockResolvedValue([{ id: "v", type: "voucher_received" }, { id: "r", type: "STUDENT_RENEWAL_DONE" }]);
  const announcements = await commuterService.getAnnouncements();
  expect(announcements[0]).toMatchObject({ type: "VOUCHER", rawType: "voucher_received" });
  expect(announcements[1]).toMatchObject({ type: "SYSTEM", rawType: "STUDENT_RENEWAL_DONE" });
});
test("renewal state uses only the mobile namespace", async () => {
  mockRequest.mockResolvedValue({ can_submit: false });
  await studentRenewalService.state();
  expect(mockRequest).toHaveBeenCalledWith("/mobile/commuter/student-renewal");
});
test("renewal upload sends FormData unchanged", async () => {
  const form = new FormData(); form.append("school_name", "School");
  await studentRenewalService.submit(form);
  expect(mockPost).toHaveBeenCalledWith("/mobile/commuter/student-renewal", form);
});
test.each(["snooze", "dismiss"] as const)("%s reminder preference is persisted by backend", async (action) => {
  await studentRenewalService.reminder(action);
  expect(mockPost).toHaveBeenCalledWith("/mobile/commuter/student-renewal/reminder", { action });
});
test("switch to Regular sends explicit confirmation", async () => {
  await studentRenewalService.switchToRegular();
  expect(mockPost).toHaveBeenCalledWith("/mobile/commuter/student-renewal/regular", { confirmed: true });
});
test("proof storage failures remain retryable errors", async () => {
  mockPost.mockRejectedValue(new Error("The document could not be stored. Please try again."));
  await expect(studentRenewalService.submit(new FormData())).rejects.toThrow("try again");
});
