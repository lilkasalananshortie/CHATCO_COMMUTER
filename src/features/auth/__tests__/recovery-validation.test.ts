/// <reference types="jest" />
import { validateRecovery } from "../recovery-validation";

const valid = { email: "commuter@example.com", code: "123456", password: "ChatCo2026!", confirmation: "ChatCo2026!" };

describe("password recovery validation", () => {
  test("registered email syntax accepted", () => expect(validateRecovery("email", valid)).toBeNull());
  test("invalid email stops the request", () => expect(validateRecovery("email", { ...valid, email: "invalid" })).not.toBeNull());
  test.each(["", "12345", "abcdef"])("invalid reset code %s is rejected", (code) => expect(validateRecovery("code", { ...valid, code })).not.toBeNull());
  test("six digit reset code accepted", () => expect(validateRecovery("code", valid)).toBeNull());
  test.each(["short", "password123!", "Password!", "Password123", "A1!".repeat(50)])("weak/oversized password is rejected", (password) => expect(validateRecovery("password", { ...valid, password, confirmation: password })).not.toBeNull());
  test("confirmation mismatch is rejected", () => expect(validateRecovery("password", { ...valid, confirmation: "Different1!" })).toBe("Passwords do not match."));
  test("backend-compatible password accepted", () => expect(validateRecovery("password", valid)).toBeNull());
});
