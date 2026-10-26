import type { Announcement, AnnouncementType } from "./types";

/** Same keyword precedence as web; retain raw type for custom/admin labels. */
export function mapAnnouncementType(raw: string): AnnouncementType {
  const type = String(raw ?? "").toLowerCase().trim();
  if (/^(student_renewal|discount_application)/.test(type)) return "SYSTEM";
  if (type === "voucher_received") return "VOUCHER";
  if (!type || type.includes("system")) return "SYSTEM";
  if (["claim_approved", "claim_rejected", "claim_released"].some(word => type.includes(word))) return "CLAIM_UPDATE";
  if (type.startsWith("saved_item")) return "SAVED_ITEM";
  if (["safety", "alert", "sos", "warning"].some(word => type.includes(word))) return "SAFETY";
  if (["promo", "holiday", "reward", "deal"].some(word => type.includes(word))) return "PROMO";
  if (["maintenance", "route", "schedule", "construction", "detour", "advisory", "service", "weather"].some(word => type.includes(word))) return "MAINTENANCE";
  return "CUSTOM";
}

export function announcementLabel(item: Pick<Announcement, "type" | "rawType">, fallback: string): string {
  if (/^discount_application/i.test(item.rawType ?? "")) return "Discount application";
  if (/^student_renewal/i.test(item.rawType ?? "")) return "Student renewal";
  return item.type === "CUSTOM" && item.rawType ? item.rawType : fallback;
}
