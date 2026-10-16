/// <reference types="jest" />
jest.mock("../../storage/app-storage", () => ({
  appStorage: { getItem: jest.fn().mockResolvedValue("session-token"), removeItem: jest.fn() },
}));
import { appStorage } from "../../storage/app-storage";

let client: typeof import("../api-client");
const previousUrl = process.env.EXPO_PUBLIC_API_URL;

beforeAll(async () => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.chatco.test";
  client = await import("../api-client");
});
afterAll(() => {
  if (previousUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = previousUrl;
});
beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

test("mobile requests retain bearer authentication and unwrap the existing envelope", async () => {
  const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true, json: async () => ({ success: true, data: { id: "shared-account" } }),
  } as Response);
  expect(await client.request("/mobile/user")).toEqual({ id: "shared-account" });
  expect(fetchMock).toHaveBeenCalledWith("https://api.chatco.test/api/v1/mobile/user",
    expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer session-token" }) }));
});

test("invalid mobile login does not revoke an existing local session", async () => {
  jest.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: false, status: 401, json: async () => ({ message: "Invalid credentials" }),
  } as Response);
  await expect(client.request("/mobile/auth/login")).rejects.toThrow("Invalid credentials");
  expect(appStorage.removeItem).not.toHaveBeenCalled();
});

test("expired authentication on a protected mobile route clears the session", async () => {
  const ended = jest.fn();
  client.resetSessionEndedNotified();
  const cleanup = client.setSessionEndedHandler(ended);
  jest.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: false, status: 401, json: async () => ({ message: "Unauthenticated" }),
  } as Response);
  try {
    await expect(client.request("/mobile/user")).rejects.toThrow("Unauthenticated");
    expect(appStorage.removeItem).toHaveBeenCalledWith(client.TOKEN_KEY);
    expect(ended).toHaveBeenCalledTimes(1);
  } finally {
    cleanup();
  }
});

test("paginated payload remains intact for mobile response mappers", async () => {
  const page = { data: [{ id: "ride-1" }], current_page: 2, last_page: 4, total: 70 };
  jest.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true, json: async () => ({ data: page }),
  } as Response);
  expect(await client.request("/mobile/commuter/payments?page=2")).toEqual(page);
});

test("late 401 for an old session never removes a newly stored login token", async () => {
  let finish!: (response: Response) => void;
  const ended = jest.fn();
  client.resetSessionEndedNotified();
  const cleanup = client.setSessionEndedHandler(ended);
  (appStorage.getItem as jest.Mock).mockResolvedValueOnce("old-token").mockResolvedValue("new-token");
  jest.spyOn(globalThis, "fetch").mockReturnValue(new Promise(done => { finish = done; }));
  const pending = client.request("/mobile/user");
  await Promise.resolve();
  finish({ ok: false, status: 401, json: async () => ({ message: "Unauthenticated" }) } as Response);
  await expect(pending).rejects.toThrow("Unauthenticated");
  expect(appStorage.removeItem).not.toHaveBeenCalled();
  expect(ended).not.toHaveBeenCalled();
  cleanup();
});
