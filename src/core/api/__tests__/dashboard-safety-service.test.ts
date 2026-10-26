/// <reference types="jest" />
jest.mock("../api-client", () => ({ request: jest.fn(), post: jest.fn(), put: jest.fn(), del: jest.fn() }));
import { request } from "../api-client";
import { commuterService } from "../commuter-service";
beforeEach(() => jest.resetAllMocks());
test("SOS stop uses the authenticated mobile PATCH route", async () => {
  (request as jest.Mock).mockResolvedValue({ id: "sos", status: "RESOLVED" });
  expect(await commuterService.stopSos("sos")).toMatchObject({ status: "RESOLVED" });
  expect(request).toHaveBeenCalledWith("/mobile/commuter/sos/sos/stop", { method: "PATCH" });
});
test("stop failure remains a failure", async () => {
  (request as jest.Mock).mockRejectedValue(Object.assign(new Error("Not your alert"), { status: 404 }));
  await expect(commuterService.stopSos("other")).rejects.toThrow("Not your alert");
});
