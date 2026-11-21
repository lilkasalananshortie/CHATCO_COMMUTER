import { announcementLabel, mapAnnouncementType } from "../announcement-category";

test.each([
  ["", "SYSTEM"], ["system update", "SYSTEM"], ["voucher_received", "VOUCHER"],
  ["student_renewal_done", "SYSTEM"], ["pwd_renewal_done", "SYSTEM"], ["PWD_RENEWAL", "SYSTEM"], ["discount_application_approved", "SYSTEM"],
  ["claim_approved", "CLAIM_UPDATE"], ["claim_rejected", "CLAIM_UPDATE"], ["saved_item_expiring", "SAVED_ITEM"],
  ["weather", "MAINTENANCE"], ["service disruption", "MAINTENANCE"], ["route advisory", "MAINTENANCE"],
  ["SOS warning", "SAFETY"], ["holiday", "PROMO"], ["University notice", "CUSTOM"],
])("%s matches web category %s", (raw, category) => expect(mapAnnouncementType(raw!)).toBe(category));

test.each([
  ["student_renewal_done", "Student renewal"], ["PWD_RENEWAL_DONE", "PWD renewal"], ["DISCOUNT_APPLICATION_APPROVED", "Discount application"],
])("%s keeps its specific label", (raw, label) => expect(announcementLabel({ type: "SYSTEM", rawType: raw }, "System")).toBe(label));
test("custom labels retain admin text", () => expect(announcementLabel({ type: "CUSTOM", rawType: "University notice" }, "Announcement")).toBe("University notice"));
