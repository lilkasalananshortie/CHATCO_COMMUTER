/// <reference types="jest" />
import { renewalPayload, type RenewalFields } from "../renewal-types";
const fields: RenewalFields = { school_name: " School ", education_level: "HIGH_SCHOOL", grade_level: "10", school_year: "2027-2028", enrollment_term: "" };
const file = () => new File(["image"], "proof.jpg", { type: "image/jpeg" });
test("high school proof carries grade and trims school name", () => {
  const payload = renewalPayload(fields, file());
  expect(payload.get("school_name")).toBe("School");
  expect(payload.get("grade_level")).toBe("10");
  expect(payload.get("document")).toBeInstanceOf(File);
});
test("college does not send a leftover grade", () => {
  const payload = renewalPayload({ ...fields, education_level: "COLLEGE", enrollment_term: "1st Semester" }, file());
  expect(payload.has("grade_level")).toBe(false);
  expect(payload.get("enrollment_term")).toBe("1st Semester");
});
test("college requires semester", () => {
  expect(() => renewalPayload({ ...fields, education_level: "COLLEGE" }, file())).toThrow("semester");
});
test("missing document cannot be submitted", () => { expect(() => renewalPayload(fields, null)).toThrow("proof"); });
test("oversized file is rejected before upload", () => {
  expect(() => renewalPayload(fields, { uri: "file://proof.jpg", type: "image/jpeg", name: "proof.jpg", size: 5242881 })).toThrow("5MB");
});
test("unsupported document is rejected", () => {
  expect(() => renewalPayload(fields, new File(["bad"], "proof.txt", { type: "text/plain" }))).toThrow("JPG");
});
test("invalid high school grade is rejected", () => { expect(() => renewalPayload({ ...fields, grade_level: "1" }, file())).toThrow("7–12"); });
test("PDF proof is accepted in browser", () => {
  expect(renewalPayload(fields, new File(["pdf"], "proof.pdf", { type: "application/pdf" })).has("document")).toBe(true);
});
test("blank school and school year are rejected", () => {
  expect(() => renewalPayload({ ...fields, school_name: " " }, file())).toThrow("school name");
  expect(() => renewalPayload({ ...fields, school_year: " " }, file())).toThrow("school year");
});
