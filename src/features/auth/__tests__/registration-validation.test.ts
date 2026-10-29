/// <reference types="jest" />
import { registrationBirthdateError, registrationUsernameError } from "../registration-validation";

test("birthdate validation accepts real past dates and rejects invalid or future dates", () => {
  const today = new Date(2026, 9, 27);
  expect(registrationBirthdateError("2000-02-29", today)).toBeNull();
  expect(registrationBirthdateError("2001-02-29", today)).toBe("Use a valid date in YYYY-MM-DD format.");
  expect(registrationBirthdateError("2026-10-27", today)).toBe("Your birthdate must be in the past.");
  expect(registrationBirthdateError("2027-01-01", today)).toBe("Your birthdate must be in the past.");
});

test("username validation matches Laravel's allowed characters and 16-character limit", () => {
  expect(registrationUsernameError(" commuter.1 ")).toBeNull();
  expect(registrationUsernameError("has space")).toContain("letters, numbers");
  expect(registrationUsernameError("name+tag")).toContain("letters, numbers");
  expect(registrationUsernameError("a".repeat(17))).toContain("16 characters");
});
