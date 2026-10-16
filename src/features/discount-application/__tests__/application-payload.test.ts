/// <reference types="jest" />
import { applicationPayload, canCancelApplication, type ApplicationState } from "../application-types";
import { EMPTY_SCHOOL_FIELDS } from "../../student-renewal/SchoolProofFields";
jest.mock("react-native", () => ({ StyleSheet: { create: (value: unknown) => value } }));
const state: ApplicationState = { commuter_type: "REGULAR", effective_fare_type: "REGULAR", discount_expires_at: null,
  document_required: true, can_submit: true, status: "NOT_APPLIED", application: null };
const fields = { ...EMPTY_SCHOOL_FIELDS, school_name: " School ", school_year: "2026-2027", grade_level: "10" };
const proof = () => new File(["proof"], "proof.pdf", { type: "application/pdf" });

test.each(["PWD", "SENIOR"] as const)("%s sends proof and category, never leftover school fields", (category) => {
  const form = applicationPayload(state, category, fields, proof());
  expect(form.get("requested_type")).toBe(category);
  expect(form.get("document")).toBeInstanceOf(File);
  expect(form.has("school_name")).toBe(false);
  expect(form.has("grade_level")).toBe(false);
  expect(form.has("application_id")).toBe(false);
});
test("student shares renewal validation and trimming", () => {
  const form = applicationPayload(state, "STUDENT", fields, proof());
  expect(form.get("school_name")).toBe("School");
  expect(form.get("grade_level")).toBe("10");
  expect(() => applicationPayload(state, "STUDENT", { ...fields, school_year: "" }, proof())).toThrow("school year");
});
test("college requires term and excludes leftover grade", () => {
  expect(() => applicationPayload(state, "STUDENT", { ...fields, education_level: "COLLEGE" }, proof())).toThrow("semester");
  const form = applicationPayload(state, "STUDENT", { ...fields, education_level: "COLLEGE", enrollment_term: "1st Semester" }, proof());
  expect(form.has("grade_level")).toBe(false);
});
test("proof is mandatory unless backend explicitly disables it", () => {
  expect(() => applicationPayload(state, "PWD", fields, null)).toThrow("proof");
  expect(() => applicationPayload({ ...state, document_required: undefined as any }, "PWD", fields, null)).toThrow("proof");
  expect(applicationPayload({ ...state, document_required: false }, "PWD", fields, proof()).has("document")).toBe(false);
  expect(applicationPayload({ ...state, document_required: false }, "STUDENT", fields, null).get("school_name")).toBe("School");
});
test("invalid and oversized proof cannot upload", () => {
  expect(() => applicationPayload(state, "SENIOR", fields, new File(["bad"], "proof.txt", { type: "text/plain" }))).toThrow("JPG");
  expect(() => applicationPayload(state, "PWD", fields, { uri: "file://proof.jpg", name: "proof.jpg", type: "image/jpeg", size: 5242881 })).toThrow("5MB");
});
test("ineligible or pending account cannot submit", () => {
  expect(() => applicationPayload({ ...state, can_submit: false, status: "PENDING" }, "PWD", fields, proof())).toThrow("cannot submit");
  expect(() => applicationPayload({ ...state, commuter_type: "PWD" }, "PWD", fields, proof())).toThrow("cannot submit");
  expect(() => applicationPayload(state, "" as any, fields, proof())).toThrow("category");
});
const correction: ApplicationState = { ...state, status: "NEEDS_CORRECTION", application: {
  id: "application", request_type: "APPLICATION", requested_type: "PWD", revision: 4, status: "NEEDS_CORRECTION", reason: "Clearer ID",
  submitted_at: "2026-10-15", correction_due_at: null, school_name: null, school_year: null, education_level: null, grade_level: null, enrollment_term: null,
} };
test("corrections include authoritative id and revision and cannot change category", () => {
  const form = applicationPayload(correction, "PWD", fields, proof());
  expect(form.get("application_id")).toBe("application");
  expect(form.get("revision")).toBe("4");
  expect(() => applicationPayload(correction, "SENIOR", fields, proof())).toThrow("Cancel");
});
test("renewal correction cannot be submitted through application endpoint", () => {
  expect(() => applicationPayload({ ...correction, application: { ...correction.application!, request_type: "RENEWAL" } }, "PWD", fields, proof())).toThrow("Student Renewal");
});
test("only pending/correction applications are cancellable", () => {
  expect(canCancelApplication(correction)).toBe(true);
  expect(canCancelApplication({ ...correction, status: "PENDING" })).toBe(true);
  for (const status of ["APPROVED", "REJECTED", "CANCELLED", "EXPIRED"] as const) expect(canCancelApplication({ ...correction, status })).toBe(false);
  expect(canCancelApplication({ ...correction, application: { ...correction.application!, request_type: "RENEWAL" } })).toBe(false);
});
