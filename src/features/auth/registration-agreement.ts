import { POLICY_VERSION } from "./registration-policies";

export type AgreementChoices = { terms: boolean; privacy: boolean; confirmation: boolean };

export function registrationAgreement(choices: AgreementChoices): Record<string, string> {
  if (!choices.terms || !choices.privacy || !choices.confirmation) {
    throw new Error("Please accept the terms, acknowledge privacy, and confirm your registration details.");
  }
  return {
    terms_accepted: "true", privacy_acknowledged: "true", registration_confirmed: "true",
    terms_version: POLICY_VERSION, privacy_version: POLICY_VERSION,
  };
}
