import { appendNativeMultipartFile } from "../../core/api/native-multipart-file";
import { pwdValidUntilError } from "../auth/registration-validation";

export type RenewalStatus = "NOT_RENEWED" | "PENDING" | "NEEDS_CORRECTION" | "APPROVED" | "REJECTED" | "CANCELLED" | "EXPIRED";
export type EducationLevel = "HIGH_SCHOOL" | "COLLEGE";
/** Students renew in one shared yearly window; PWDs around their own card date. */
export type RenewalKind = "STUDENT" | "PWD";
export interface RenewalApplication {
  id: string; revision: number; status: RenewalStatus; school_name: string | null; education_level: EducationLevel | null;
  grade_level: number | null; school_year: string | null; enrollment_term: string | null;
  reason: string | null; correction_due_at: string | null; submitted_at: string;
  /** PWD requests only. */
  valid_until?: string | null;
}
export interface RenewalState {
  /** Absent on student responses. */
  kind?: RenewalKind; valid_until?: string;
  cycle_year: number; deadline: string; opens_at: string; renewal_period: string;
  commuter_type: string; discount_eligible: boolean; discount_expires_at: string | null;
  status: RenewalStatus; can_submit: boolean; notice_active: boolean; reminder_due: boolean;
  can_switch_to_regular: boolean; application: RenewalApplication | null;
}
export const RENEWAL_LABELS: Record<RenewalStatus, string> = {
  NOT_RENEWED: "Not renewed", PENDING: "Pending renewal verification", NEEDS_CORRECTION: "Needs correction",
  APPROVED: "Renewed", REJECTED: "Rejected", CANCELLED: "Cancelled", EXPIRED: "Expired",
};
export const RENEWAL_COPY: Record<RenewalKind, {
  title: string; label: string; discount: string; discountLabel: string; proofShort: string; renewTitle: string; renewAction: string;
  correctedAction: string; regularAction: string; ready: string; correctionTitle: string; reminderTitle: string; reminderCorrectionTitle: string;
}> = {
  STUDENT: {
    title: "Student Renewal", label: "Student renewal", discount: "student discount", discountLabel: "Student discount", proofShort: "proof",
    renewTitle: "Renew your student status", renewAction: "Renew student status", correctedAction: "Submit corrected proof",
    regularAction: "No Longer a Student", ready: "your current school ID or enrollment proof", correctionTitle: "Update your enrollment proof",
    reminderTitle: "Student renewal reminder", reminderCorrectionTitle: "Enrollment proof needs a correction",
  },
  PWD: {
    title: "PWD Renewal", label: "PWD renewal", discount: "PWD discount", discountLabel: "PWD discount", proofShort: "PWD ID",
    renewTitle: "Renew your PWD ID", renewAction: "Renew PWD ID", correctedAction: "Submit corrected PWD ID",
    regularAction: "Switch to Regular", ready: "your renewed PWD ID", correctionTitle: "Update your PWD ID",
    reminderTitle: "PWD renewal reminder", reminderCorrectionTitle: "PWD ID needs a correction",
  },
};

/** A 'YYYY-MM-DD' card date as "Mar 15, 2027", with no time zone shift. */
export function formatCardDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[(month ?? 1) - 1]} ${day}, ${year}`;
}

/** Which renewal endpoint applies. A lapsed PWD is Regular with applied_type PWD. */
export function renewalKindFor(profile: { commuter_type?: string | null; applied_type?: string | null } | null | undefined): RenewalKind {
  const type = String(profile?.commuter_type ?? "").toUpperCase();
  const applied = String(profile?.applied_type ?? "").toUpperCase();
  return type === "PWD" || (type === "REGULAR" && applied === "PWD") ? "PWD" : "STUDENT";
}

export interface RenewalFields {
  school_name: string; education_level: EducationLevel | ""; grade_level: string; school_year: string; enrollment_term: string;
}
export type RenewalDocument = { uri: string; name: string; type: string; size?: number } | File;

export function schoolProofFieldsError(fields: RenewalFields): string | null {
  if (!fields.school_name.trim() || fields.school_name.trim().length > 150) return "Enter your school name (up to 150 characters).";
  if (!fields.school_year.trim() || fields.school_year.trim().length > 20) return "Enter your school year (up to 20 characters).";
  if (!["HIGH_SCHOOL", "COLLEGE"].includes(fields.education_level)) return "Choose your education level.";
  if (fields.education_level === "HIGH_SCHOOL" && !/^(7|8|9|10|11|12)$/.test(fields.grade_level)) return "Choose Grade 7–12.";
  if (fields.education_level === "COLLEGE" && !fields.enrollment_term.trim()) return "Enter your semester or enrollment term.";
  if (fields.enrollment_term.trim().length > 50) return "Enrollment term must be 50 characters or fewer.";
  return null;
}

type NativeProof = { uri: string; name: string; type: string };

export async function readNativeProof(document: RenewalDocument | null, required = true): Promise<NativeProof | undefined> {
  if (!required || !document || !("uri" in document)) return undefined;
  return { uri: document.uri, name: document.name, type: document.type };
}

export function proofPayload(document: RenewalDocument | null, required = true, nativeProof?: NativeProof): FormData {
  const form = new FormData();
  // Local application debugging must not upload a selected file to R2.
  if (!required) return form;
  if (!document) throw new Error("Choose your supporting proof first.");
  if (document.size != null && document.size > 5 * 1024 * 1024) throw new Error("Supporting proof must be 5MB or smaller.");
  if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(document.type)) throw new Error("Choose a JPG, PNG, WebP or PDF document.");
  if ("uri" in document) {
    if (!nativeProof) throw new Error("Unable to read the selected document.");
    appendNativeMultipartFile(form, "document", nativeProof);
  } else form.append("document", document);
  return form;
}

export function pwdRenewalPayload(validUntil: string, currentCardDate: string | null | undefined, document: RenewalDocument | null, nativeProof?: NativeProof): FormData {
  const form = proofPayload(document, true, nativeProof);
  const dateError = pwdValidUntilError(validUntil, currentCardDate);
  if (dateError) throw new Error(dateError);
  form.append("valid_until", validUntil.trim());
  return form;
}

export function renewalPayload(fields: RenewalFields, document: RenewalDocument | null, documentRequired = true, nativeProof?: NativeProof): FormData {
  const form = proofPayload(document, documentRequired, nativeProof);
  const fieldsError = schoolProofFieldsError(fields);
  if (fieldsError) throw new Error(fieldsError);
  form.append("school_name", fields.school_name.trim());
  form.append("education_level", fields.education_level);
  form.append("school_year", fields.school_year.trim());
  if (fields.education_level === "HIGH_SCHOOL") form.append("grade_level", fields.grade_level);
  if ((fields.education_level === "COLLEGE" || Number(fields.grade_level) >= 11) && fields.enrollment_term.trim()) form.append("enrollment_term", fields.enrollment_term.trim());
  return form;
}
