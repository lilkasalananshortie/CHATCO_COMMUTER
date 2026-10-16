/// <reference types="jest" />
jest.mock("../api-client", () => ({ post: jest.fn(), request: jest.fn() }));
import { post, request } from "../api-client";
import { discountApplicationService } from "../discount-application-service";
import { commuterService } from "../commuter-service";
beforeEach(() => jest.resetAllMocks());
test("state uses dedicated mobile endpoint and preserves authoritative fields", async () => {
  (request as jest.Mock).mockResolvedValue({ status: "PENDING", commuter_type: "REGULAR", effective_fare_type: "REGULAR", can_submit: false });
  expect(await discountApplicationService.state()).toMatchObject({ status: "PENDING", effective_fare_type: "REGULAR", can_submit: false });
  expect(request).toHaveBeenCalledWith("/mobile/commuter/discount-applications");
});
test("submission sends original FormData unchanged", async () => {
  const form = new FormData(); form.append("requested_type", "PWD");
  await discountApplicationService.submit(form);
  expect(post).toHaveBeenCalledWith("/mobile/commuter/discount-applications", form);
});
test("cancellation sends only application identity", async () => {
  await discountApplicationService.cancel("application-id");
  expect(post).toHaveBeenCalledWith("/mobile/commuter/discount-applications/cancel", { application_id: "application-id" });
});
test.each([401, 403, 404, 409, 422, 429, 500])("HTTP %s is propagated, not treated as success", async (status) => {
  const error = Object.assign(new Error("Request rejected"), { status });
  (post as jest.Mock).mockRejectedValue(error);
  await expect(discountApplicationService.submit(new FormData())).rejects.toBe(error);
});
test("network failure is not automatically retried", async () => {
  (post as jest.Mock).mockRejectedValue(new Error("Offline"));
  await expect(discountApplicationService.cancel("id")).rejects.toThrow("Offline");
  expect(post).toHaveBeenCalledTimes(1);
});
test("application notices display as system announcements with original type retained", async () => {
  (request as jest.Mock).mockResolvedValue([{ id: "notice", type: "DISCOUNT_APPLICATION_DONE", message: "Approved" }]);
  expect((await commuterService.getAnnouncements())[0]).toMatchObject({ type: "SYSTEM", rawType: "DISCOUNT_APPLICATION_DONE", message: "Approved" });
});
