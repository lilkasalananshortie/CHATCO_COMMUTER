/// <reference types="jest" />
import { formatRegistrationBirthdate, philippineToday, pwdValidUntilError, registrationBirthdateError, registrationUsernameError } from "../registration-validation";

test.each([
  ["", ""], ["2", "2"], ["2000", "2000"], ["20000", "2000-0"],
  ["200002", "2000-02"], ["2000022", "2000-02-2"], ["20000229", "2000-02-29"],
  ["2000/02/29", "2000-02-29"], ["2000-02-29", "2000-02-29"],
  ["2000-02-", "2000-02"], ["letters", ""], ["20000229123", "2000-02-29"],
])("formats typed or pasted birthdate %s as %s", (input, expected) => {
  expect(formatRegistrationBirthdate(input)).toBe(expected);
});

test("birthdate validation accepts real past dates and rejects invalid or future dates", () => {
  const today = new Date(2026, 9, 27);
  expect(registrationBirthdateError("2000-02-29", today)).toBeNull();
  expect(registrationBirthdateError("2001-02-29", today)).toBe("Use a valid date in YYYY-MM-DD format.");
  expect(registrationBirthdateError("2026-10-27", today)).toBe("Your birthdate must be in the past.");
  expect(registrationBirthdateError("2027-01-01", today)).toBe("Your birthdate must be in the past.");
});

test("Philippine date rolls over at 4 PM UTC", () => {
  expect(philippineToday(new Date("2026-11-21T15:59:00Z"))).toBe("2026-11-21");
  expect(philippineToday(new Date("2026-11-21T16:00:00Z"))).toBe("2026-11-22");
});

test("PWD card date must be real, future, and within five years", () => {
  const now = new Date("2026-11-21T04:00:00Z");
  expect(pwdValidUntilError("", null, now)).toContain("valid-until");
  expect(pwdValidUntilError("2027-02-30", null, now)).toContain("valid date");
  expect(pwdValidUntilError("2026-11-21", null, now)).toContain("future");
  expect(pwdValidUntilError("2026-11-22", null, now)).toBeNull();
  expect(pwdValidUntilError("2031-12-31", null, now)).toBeNull();
  expect(pwdValidUntilError("2032-01-01", null, now)).toContain("2031");
});

test("a renewed PWD card must outlast the current card and today", () => {
  const now = new Date("2026-11-21T04:00:00Z");
  expect(pwdValidUntilError("2027-03-15", "2027-03-15", now)).toContain("later than");
  expect(pwdValidUntilError("2027-03-16", "2027-03-15", now)).toBeNull();
  expect(pwdValidUntilError("2026-11-21", "2026-10-01", now)).toContain("later than");
  expect(pwdValidUntilError("2026-11-22", "2026-10-01", now)).toBeNull();
});

test("username validation matches Laravel's allowed characters and 16-character limit", () => {
  expect(registrationUsernameError(" commuter.1 ")).toBeNull();
  expect(registrationUsernameError("has space")).toContain("letters, numbers");
  expect(registrationUsernameError("name+tag")).toContain("letters, numbers");
  expect(registrationUsernameError("a".repeat(17))).toContain("16 characters");
});
