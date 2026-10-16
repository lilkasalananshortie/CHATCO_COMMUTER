/// <reference types="jest" />
import { getMascotErrorState, shouldIllustrateError } from "../mascot-error";

describe("mascot error states", () => {
  test.each(["NetworkError", "AbortError"])("%s shows connection recovery, not missing content", (name) => {
    expect(getMascotErrorState({ name }).pose).toBe("offline");
    expect(shouldIllustrateError({ name })).toBe(true);
  });
  test("missing API content uses the search pose", () => {
    expect(getMascotErrorState({ response: { status: 404 } }).pose).toBe("not-found");
  });
  test.each([400, 401, 403, 422, 429])("HTTP %i keeps the actionable form error", (status) => {
    expect(shouldIllustrateError({ status })).toBe(false);
  });
  test("server failures have a safe fallback without raw internals", () => {
    expect(shouldIllustrateError({ status: 503 })).toBe(true);
    expect(getMascotErrorState(new Error("private stack detail")).message).not.toContain("private");
  });
  test("unknown or null errors do not crash the error display", () => {
    expect(getMascotErrorState(null).pose).toBe("not-found");
    expect(getMascotErrorState(undefined).title).toBe("Something went wrong");
  });
});
