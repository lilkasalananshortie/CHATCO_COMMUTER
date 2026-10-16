import { renewalPayload, proofPayload, type RenewalDocument, type RenewalFields, type RenewalStatus, type EducationLevel } from "../student-renewal/renewal-types";

export const DISCOUNT_CATEGORIES = { STUDENT: "Student", PWD: "PWD", SENIOR: "Senior Citizen" } as const;
export type DiscountCategory = keyof typeof DISCOUNT_CATEGORIES;
export interface DiscountApplication {
  id: string; request_type: "APPLICATION" | "RENEWAL"; requested_type: DiscountCategory;
  revision: number; status: RenewalStatus; reason: string | null; submitted_at: string;
  school_name: string | null; education_level: EducationLevel | null; grade_level: number | null;
  school_year: string | null; enrollment_term: string | null; correction_due_at: string | null;
}
export interface ApplicationState {
  commuter_type: string; effective_fare_type: string; discount_expires_at: string | null;
  document_required: boolean; can_submit: boolean; status: RenewalStatus | "NOT_APPLIED";
  application: DiscountApplication | null;
}
export const APPLICATION_LABELS: Record<ApplicationState["status"], string> = {
  NOT_APPLIED: "Not applied", NOT_RENEWED: "Not applied", PENDING: "Pending verification",
  NEEDS_CORRECTION: "Needs correction", APPROVED: "Approved", REJECTED: "Rejected", CANCELLED: "Cancelled", EXPIRED: "Expired",
};
export function canCancelApplication(state: ApplicationState): boolean {
  return state.application?.request_type === "APPLICATION" && ["PENDING", "NEEDS_CORRECTION"].includes(state.status);
}
export function applicationPayload(state: ApplicationState, category: DiscountCategory | "", fields: RenewalFields, document: RenewalDocument | null): FormData {
  if (!state.can_submit || state.commuter_type !== "REGULAR") throw new Error("This account cannot submit an application. Refresh its status.");
  if (!Object.prototype.hasOwnProperty.call(DISCOUNT_CATEGORIES, category)) throw new Error("Choose a discount category.");
  const current = state.application;
  const correction = state.status === "NEEDS_CORRECTION";
  if (correction && (!current || current.request_type !== "APPLICATION")) throw new Error("Open Student Renewal to correct this request.");
  if (correction && current?.requested_type !== category) throw new Error("Cancel this application first to change its discount category.");
  // Only an explicit backend false allows local debugging without proof. Do not infer this from the device's development mode.
  const form = category === "STUDENT" ? renewalPayload(fields, document, state.document_required !== false) : proofPayload(document, state.document_required !== false);
  form.append("requested_type", category);
  if (correction && current) {
    form.append("application_id", current.id);
    form.append("revision", String(current.revision));
  }
  return form;
}
