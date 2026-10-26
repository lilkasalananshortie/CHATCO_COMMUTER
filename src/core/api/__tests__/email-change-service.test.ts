/// <reference types="jest" />
jest.mock("../api-client", () => ({ post: jest.fn(), request: jest.fn() }));
import { post, request } from "../api-client";
import { emailChangeService } from "../email-change-service";
beforeEach(() => jest.clearAllMocks());
test("resumes the current session-bound email change", async () => {
  await emailChangeService.state(); expect(request).toHaveBeenCalledWith("/mobile/commuter/change-email");
});
test("starts through the dedicated mobile route", async () => {
  await emailChangeService.start(); expect(post).toHaveBeenCalledWith("/mobile/commuter/change-email/start");
});
test.each(["old", "new"] as const)("sends %s verification with request identity", async stage => {
  await emailChangeService.sendCode("id", stage, "new@example.com");
  expect(post).toHaveBeenCalledWith("/mobile/commuter/change-email/send-code", { request_id: "id", stage, email: "new@example.com" });
});
test("password and code identity methods do not mix secret fields", async () => {
  await emailChangeService.verify("id", "password", "secret");
  expect(post).toHaveBeenLastCalledWith(expect.any(String), { request_id: "id", method: "password", current_password: "secret" });
  await emailChangeService.verify("id", "email", "123456");
  expect(post).toHaveBeenLastCalledWith(expect.any(String), { request_id: "id", method: "email", code: "123456" });
});
test("confirmation and cancellation retain the flow identity", async () => {
  await emailChangeService.confirm("id", "123456");
  expect(post).toHaveBeenLastCalledWith("/mobile/commuter/change-email/confirm", { request_id: "id", code: "123456" });
  await emailChangeService.cancel("id");
  expect(post).toHaveBeenLastCalledWith("/mobile/commuter/change-email/cancel", { request_id: "id" });
});
