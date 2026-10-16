/// <reference types="jest" />
jest.mock("../api-client", () => ({ post: jest.fn(), request: jest.fn(), put: jest.fn(), del: jest.fn() }));
import { post, put, request } from "../api-client";
import { commuterService } from "../commuter-service";

const profile = { user: { id: "owner", role: "COMMUTER" }, profile: { commuter_type: "STUDENT", contact_number: "09180000000" } };
beforeEach(() => { jest.resetAllMocks(); });
test("password code and resend send all existing Laravel fields", async () => {
  const fields = { current_password: "old", password: "New-Pass123!", password_confirmation: "New-Pass123!" };
  await commuterService.requestPasswordChangeCode(fields);
  await commuterService.requestPasswordChangeCode(fields);
  expect(post).toHaveBeenNthCalledWith(1, "/mobile/commuter/change-password/request-code", fields);
  expect(post).toHaveBeenNthCalledWith(2, "/mobile/commuter/change-password/request-code", fields);
  await commuterService.confirmPasswordChange({ ...fields, code: "123456" });
  expect(post).toHaveBeenLastCalledWith("/mobile/commuter/change-password/confirm", { ...fields, code: "123456" });
});
test("profile update unwraps profile and retains real account id", async () => {
  (put as jest.Mock).mockResolvedValue(profile);
  expect(await commuterService.updateProfile({ contact_number: "09180000000" })).toEqual({ ...profile.profile, id: "owner" });
});
test.each([401, 403, 500, undefined])("profile error %s never falls back to a generic user", async status => {
  (request as jest.Mock).mockRejectedValue(Object.assign(new Error("failed"), { status }));
  await expect(commuterService.getProfile()).rejects.toThrow("failed");
  expect(request).toHaveBeenCalledTimes(1);
});
test("missing profile route can use actual legacy profile envelope", async () => {
  (request as jest.Mock).mockRejectedValueOnce(Object.assign(new Error("missing"), { status: 404 })).mockResolvedValueOnce(profile);
  expect((await commuterService.getProfile()).profile.id).toBe("owner");
  expect(request).toHaveBeenLastCalledWith("/mobile/user");
});
test("generic user response is not fabricated into a profile", async () => {
  (request as jest.Mock).mockResolvedValue({ id: "owner", role: "COMMUTER" });
  await expect(commuterService.getProfile()).rejects.toThrow("profile");
});
test("signed feedback QR preserves the authoritative shift", async () => {
  (post as jest.Mock).mockResolvedValue({ shift_id: "shift-A", unit_number: "J-01" });
  expect(await commuterService.scanQr("signed-token")).toMatchObject({ shiftId: "shift-A" });
  expect(post).toHaveBeenCalledWith("/mobile/commuter/qr/scan", { token: "signed-token" });
});
test("permanent vehicle QR uses scan-public without weakening paid-ride feedback checks", async () => {
  (post as jest.Mock).mockResolvedValue({ shift_id: "shift-B" });
  expect(await commuterService.scanQr(JSON.stringify({ vehicle_id: "vehicle" }))).toMatchObject({ shiftId: "shift-B" });
  expect(post).toHaveBeenCalledWith("/mobile/commuter/qr/scan-public", { vehicle_id: "vehicle" });
});
test("missing resolved shift fails closed", async () => {
  (post as jest.Mock).mockResolvedValue({ unit_number: "J-01" });
  await expect(commuterService.scanQr("token")).rejects.toThrow("No shift");
});
test("JSON-wrapped signed token uses the same authenticated scan contract", async () => {
  (post as jest.Mock).mockResolvedValue({ shift_id: "shift-A" });
  await commuterService.scanQr(JSON.stringify({ qr_token: "signed-token" }));
  expect(post).toHaveBeenCalledWith("/mobile/commuter/qr/scan", { token: "signed-token" });
});
test("payment history preserves backend row identity, shift, zero fare and pagination", async () => {
  (request as jest.Mock).mockResolvedValue({ data: [{ transaction_id: "ride-A", shift_id: "shift-A", final_amount: 0, amount: 17, payment_method: "VOUCHER", status: "PAID", can_leave_feedback: true }], current_page: 3, last_page: 7, total: 140 });
  expect(await commuterService.getPaymentHistory(3)).toMatchObject({ page: 3, lastPage: 7, total: 140,
    items: [{ id: "ride-A", transaction_id: "ride-A", shift_id: "shift-A", final_amount: 0, can_leave_feedback: true }] });
});
