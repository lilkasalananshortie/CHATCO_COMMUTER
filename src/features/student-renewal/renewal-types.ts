export type RenewalStatus = "NOT_RENEWED" | "PENDING" | "NEEDS_CORRECTION" | "APPROVED" | "REJECTED" | "CANCELLED" | "EXPIRED";
export type EducationLevel = "HIGH_SCHOOL" | "COLLEGE";
export interface RenewalApplication {
  id: string; revision: number; status: RenewalStatus; school_name: string; education_level: EducationLevel;
  grade_level: number | null; school_year: string; enrollment_term: string | null;
  reason: string | null; correction_due_at: string | null; submitted_at: string;
}
export interface RenewalState {
  cycle_year: number; deadline: string; opens_at: string; renewal_period: string;
  commuter_type: string; discount_eligible: boolean; discount_expires_at: string | null;
  status: RenewalStatus; can_submit: boolean; notice_active: boolean; reminder_due: boolean;
  can_switch_to_regular: boolean; application: RenewalApplication | null;
}
export const RENEWAL_LABELS: Record<RenewalStatus, string> = {
  NOT_RENEWED: "Not renewed", PENDING: "Pending renewal verification", NEEDS_CORRECTION: "Needs correction",
  APPROVED: "Renewed", REJECTED: "Rejected", CANCELLED: "Cancelled", EXPIRED: "Expired",
};
export interface RenewalFields {
  school_name: string; education_level: EducationLevel; grade_level: string; school_year: string; enrollment_term: string;
}
export type RenewalDocument = { uri: string; name: string; type: string; size?: number } | File;

export function proofPayload(document: RenewalDocument | null, required = true): FormData {
  const form = new FormData();
  // Local application debugging must not upload a selected file to R2.
  if (!required) return form;
  if (!document) throw new Error("Choose your supporting proof first.");
  if (document.size != null && document.size > 5 * 1024 * 1024) throw new Error("Enrollment proof must be 5MB or smaller.");
  if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(document.type)) throw new Error("Choose a JPG, PNG, WebP or PDF document.");
  form.append("document", document as any);
  return form;
}

export function renewalPayload(fields: RenewalFields, document: RenewalDocument | null, documentRequired = true): FormData {
  const form = proofPayload(document, documentRequired);
  if (!fields.school_name.trim() || fields.school_name.trim().length > 150) throw new Error("Enter your school name (up to 150 characters).");
  if (!fields.school_year.trim() || fields.school_year.trim().length > 20) throw new Error("Enter your school year (up to 20 characters).");
  if (!["HIGH_SCHOOL", "COLLEGE"].includes(fields.education_level)) throw new Error("Choose your education level.");
  if (fields.education_level === "HIGH_SCHOOL" && !/^(7|8|9|10|11|12)$/.test(fields.grade_level)) throw new Error("Choose Grade 7–12.");
  if (fields.education_level === "COLLEGE" && !fields.enrollment_term.trim()) throw new Error("Enter your semester or enrollment term.");
  if (fields.enrollment_term.trim().length > 50) throw new Error("Enrollment term must be 50 characters or fewer.");
  form.append("school_name", fields.school_name.trim());
  form.append("education_level", fields.education_level);
  form.append("school_year", fields.school_year.trim());
  if (fields.education_level === "HIGH_SCHOOL") form.append("grade_level", fields.grade_level);
  if ((fields.education_level === "COLLEGE" || Number(fields.grade_level) >= 11) && fields.enrollment_term.trim()) form.append("enrollment_term", fields.enrollment_term.trim());
  return form;
}
