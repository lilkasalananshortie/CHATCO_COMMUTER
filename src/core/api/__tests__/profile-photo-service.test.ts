/// <reference types="jest" />
jest.mock("../api-client", () => ({ post: jest.fn(), request: jest.fn(), put: jest.fn() }));
import { post } from "../api-client";
import { commuterService } from "../commuter-service";

beforeEach(() => jest.resetAllMocks());
test("uses mobile photo endpoint and returns the authoritative profile", async () => {
  const body = new FormData();
  const profile = { commuter_type: "REGULAR", profile_image_url: "https://media.example.test/photo.jpg" };
  (post as jest.Mock).mockResolvedValue({ user: { id: "owner" }, profile });
  expect(await commuterService.uploadProfilePhoto(body)).toEqual({ ...profile, id: "owner" });
  expect(post).toHaveBeenCalledWith("/mobile/commuter/profile/photo", body);
});
test.each([401, 403, 422, 502])("propagates HTTP %s without retrying or inventing a URL", async status => {
  const error = Object.assign(new Error("Rejected"), { status });
  (post as jest.Mock).mockRejectedValue(error);
  await expect(commuterService.uploadProfilePhoto(new FormData())).rejects.toBe(error);
  expect(post).toHaveBeenCalledTimes(1);
});
