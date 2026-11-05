/// <reference types="jest" />
/// <reference types="node" />
import { NetworkError, REQUEST_TIMEOUT_MS, request } from "../api-client";

jest.mock("../../storage/app-storage", () => ({ appStorage: { getItem: jest.fn(async () => null) } }));

test("a request aborted by the timeout reports a timeout without logging an unexpected network error", async () => {
  jest.useFakeTimers();
  const originalFetch = global.fetch;
  const errorLog = jest.spyOn(console, "error").mockImplementation(() => {});
  global.fetch = jest.fn((_url, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new Error("signal is aborted without reason")));
  })) as jest.Mock;
  try {
    const pending = request("/mobile/routes/active");
    await Promise.resolve();
    const result = expect(pending).rejects.toThrow(new NetworkError("The ChatCo server did not respond within 15s. Check your connection and try again."));
    await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    await result;
    expect(errorLog).not.toHaveBeenCalled();
  } finally {
    global.fetch = originalFetch;
    errorLog.mockRestore();
    jest.useRealTimers();
  }
});
