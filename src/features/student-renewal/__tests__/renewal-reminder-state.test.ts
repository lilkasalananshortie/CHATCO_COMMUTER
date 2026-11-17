/// <reference types="jest" />
import { latestRenewalNoticeId, renewalReminderKey, renewalReminderPresentation } from "../renewal-reminder-state";
import type { RenewalState } from "../renewal-types";
const state: RenewalState = { cycle_year: 2027, opens_at: "2027-09-01T00:00:00+08:00", deadline: "2027-10-01T00:00:00+08:00", renewal_period: "September 2027", commuter_type: "STUDENT", discount_eligible: true, discount_expires_at: "2027-10-01T00:00:00+08:00", status: "NOT_RENEWED", can_submit: false, notice_active: true, reminder_due: true, can_switch_to_regular: true, application: null };

test.each([7, 3, 1])("pre-renewal countdown accurately shows %s days before opening", days => {
  const copy = renewalReminderPresentation(state, Date.parse(state.opens_at) - days * 86400000);
  expect(copy.countdown).toBe(`Opens in ${days} day${days === 1 ? "" : "s"}`);
  expect(copy.dateLabel).toBe("Renewal opens");
  expect(copy.dateValue).toBe("Sep 1, 2027");
  expect(copy.action).toBe("View renewal status");
});
test("closing date uses the last renewal day in Manila rather than next-day midnight", () => {
  const copy = renewalReminderPresentation({ ...state, can_submit: true }, Date.parse("2027-09-30T12:00:00+08:00"));
  expect(copy).toMatchObject({ dateLabel: "Renewal closes", dateValue: "Sep 30, 2027", countdown: "12 hours left", action: "Renew student status" });
});
test("correction deadline overrides cycle opening and closing", () => {
  const correction = { ...state, status: "NEEDS_CORRECTION" as const, can_submit: true, application: { id: "proof", revision: 2, correction_due_at: "2027-09-05T12:00:00+08:00" } as RenewalState["application"] };
  expect(renewalReminderPresentation(correction, Date.parse("2027-09-05T11:30:00+08:00"))).toMatchObject({ dateLabel: "Correction due", countdown: "under an hour left", action: "Submit corrected proof" });
  expect(renewalReminderKey(correction)).not.toBe(renewalReminderKey(state));
});
test("server eligibility and saved reminder preferences control visibility", () => {
  expect(renewalReminderKey(state)).not.toBeNull();
  for (const override of [{ reminder_due: false }, { commuter_type: "REGULAR" }, { status: "PENDING" as const }, { status: "APPROVED" as const }]) expect(renewalReminderKey({ ...state, ...override })).toBeNull();
  expect(renewalReminderKey(null)).toBeNull();
});
test("expired and invalid deadlines never promise incorrect remaining time", () => {
  expect(renewalReminderPresentation({ ...state, discount_eligible: false }, Date.parse(state.deadline)).message).toMatch(/Regular fares apply/);
  expect(renewalReminderPresentation(state, Date.parse(state.deadline)).countdown).toBe("Deadline passed");
  expect(renewalReminderPresentation({ ...state, opens_at: "", deadline: "" }).countdown).toBe("Check renewal status");
});

test("new scheduled server notices rearm reminder identity, reading them does not", () => {
  const earlier = { id: "7-days", title: "Renew", rawType: "STUDENT_RENEWAL", created_at: "2027-08-25T00:00:00+08:00" };
  const newer = { ...earlier, id: "3-days", created_at: "2027-08-29T00:00:00+08:00" };
  const last = { ...earlier, id: "1-day", created_at: "2027-08-31T00:00:00+08:00" };
  expect(latestRenewalNoticeId([earlier, last, newer])).toBe("1-day");
  expect(latestRenewalNoticeId([{ ...last, isRead: true }])).toBe("1-day");
  expect(renewalReminderKey(state, earlier.id)).not.toBe(renewalReminderKey(state, newer.id));
  expect(renewalReminderKey(state, newer.id)).not.toBe(renewalReminderKey(state, last.id));
  expect(latestRenewalNoticeId([{ ...last, rawType: "GENERAL" }])).toBeNull();
});
