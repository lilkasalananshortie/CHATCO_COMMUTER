/// <reference types="jest" />
jest.mock("react-native", () => ({ Platform: { OS: "android" } }));
jest.mock("expo-file-system/legacy", () => ({}));
jest.mock("../../storage/device-id", () => ({ getCommuterDeviceId: jest.fn(), COMMUTER_DEVICE_TYPE: "MOBILE" }));
jest.mock("../../storage/app-storage", () => ({ appStorage: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } }));
jest.mock("../api-client", () => ({ request: jest.fn(), post: jest.fn(), resetSessionEndedNotified: jest.fn(), TOKEN_KEY: "chatco_commuter_session",
  NetworkError: class NetworkError extends Error {} }));
import { appStorage } from "../../storage/app-storage";
import { authService } from "../auth-service";
import { NetworkError, post, request, TOKEN_KEY } from "../api-client";
const user = { id: "owner", name: "Real User", role: "COMMUTER", email: "owner@example.test" };
beforeEach(() => {
  jest.resetAllMocks();
  (appStorage.getItem as jest.Mock).mockImplementation(async key => key === TOKEN_KEY ? "token" : JSON.stringify(user));
});
test("restart validates existing bearer session before restoring current user", async () => {
  (request as jest.Mock).mockResolvedValue({ user, profile: { commuter_type: "STUDENT" } });
  expect(await authService.restoreSession()).toMatchObject({ user, token: "token", profile: { commuter_type: "STUDENT" } });
  expect(request).toHaveBeenCalledWith("/mobile/user");
});
test("offline startup keeps only genuine cached user, never invents a profile", async () => {
  (request as jest.Mock).mockRejectedValue(new NetworkError("offline"));
  expect(await authService.restoreSession()).toEqual({ user, token: "token" });
  expect(appStorage.removeItem).not.toHaveBeenCalled();
});
test.each([401, 403])("invalid session %s is cleared instead of treated as offline", async status => {
  (request as jest.Mock).mockRejectedValue(Object.assign(new Error("invalid"), { status }));
  expect(await authService.restoreSession()).toBeNull();
  expect(appStorage.removeItem).toHaveBeenCalledWith(TOKEN_KEY);
  expect(appStorage.removeItem).toHaveBeenCalledWith("chatco_commuter_user");
});
test("wrong-role restored session is not allowed into commuter shell", async () => {
  (request as jest.Mock).mockResolvedValue({ user: { ...user, role: "CONDUCTOR" } });
  expect(await authService.restoreSession()).toBeNull();
});
test("offline without a genuine cached user does not invent a login", async () => {
  (appStorage.getItem as jest.Mock).mockImplementation(async key => key === TOKEN_KEY ? "token" : null);
  (request as jest.Mock).mockRejectedValue(new NetworkError("offline"));
  expect(await authService.restoreSession()).toBeNull();
});
test("offline logout removes local credentials and reports unconfirmed remote revocation", async () => {
  (post as jest.Mock).mockRejectedValue(new NetworkError("offline"));
  expect(await authService.logout()).toEqual({ serverRevoked: false });
  expect(appStorage.removeItem).toHaveBeenCalledWith(TOKEN_KEY);
  expect(appStorage.removeItem).toHaveBeenCalledWith("chatco_commuter_user");
});
test("successful and already-revoked logout both finish locally", async () => {
  (post as jest.Mock).mockResolvedValue({});
  expect(await authService.logout()).toEqual({ serverRevoked: true });
  (post as jest.Mock).mockRejectedValue(Object.assign(new Error("expired"), { status: 401 }));
  expect(await authService.logout()).toEqual({ serverRevoked: true });
});
