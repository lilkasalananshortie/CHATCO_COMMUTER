/// <reference types="jest" />
import { registrationAgreement } from "../registration-agreement";
import { POLICY_VERSION, PRIVACY_SECTIONS, REGISTRATION_TERMS } from "../registration-policies";

test("consent is explicit and carries the matching backend versions", () => {
  expect(registrationAgreement({ terms: true, privacy: true, confirmation: true })).toEqual({
    terms_accepted: "true", privacy_acknowledged: "true", registration_confirmed: "true",
    terms_version: "2026-10-12", privacy_version: "2026-10-12",
  });
  expect(POLICY_VERSION).toBe("2026-10-12");
  expect(REGISTRATION_TERMS.length).toBeGreaterThan(0);
  expect(PRIVACY_SECTIONS.length).toBeGreaterThan(0);
});
test.each(["terms", "privacy", "confirmation"] as const)("missing %s never creates an accepted payload", (key) => {
  expect(() => registrationAgreement({ terms: true, privacy: true, confirmation: true, [key]: false })).toThrow("Please accept");
});
