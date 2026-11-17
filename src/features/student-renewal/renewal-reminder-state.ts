import type { RenewalState } from "./renewal-types";
import type { Announcement } from "../../core/domain/types";

const HOUR = 3_600_000;
const day = (value: number) => new Date(value).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" });
const dateTime = (value: number) => new Date(value).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

/** Eligibility, schedule and snooze/dismiss choices are owned by the shared server. */
export function renewalReminderKey(state: RenewalState | null, noticeId?: string | null): string | null {
  if (!state?.reminder_due || state.commuter_type !== "STUDENT" || ["PENDING", "APPROVED"].includes(state.status)) return null;
  return [state.cycle_year, state.deadline, state.status, state.application?.id, state.application?.revision, state.application?.correction_due_at, noticeId].join(":");
}

/** Marking a notice read must not change its identity and reopen a modal. */
export function latestRenewalNoticeId(notices: Announcement[]): string | null {
  const reminders = notices.filter(notice => (notice.rawType ?? notice.type) === "STUDENT_RENEWAL");
  reminders.sort((a, b) => (Date.parse(b.created_at ?? b.createdAt ?? "") || 0) - (Date.parse(a.created_at ?? a.createdAt ?? "") || 0));
  return reminders[0]?.id ?? null;
}

export function renewalReminderPresentation(state: RenewalState, now = Date.now()) {
  const correction = state.status === "NEEDS_CORRECTION" ? state.application?.correction_due_at : null;
  const opens = Date.parse(state.opens_at);
  const deadline = Date.parse(state.deadline);
  const notOpen = !correction && Number.isFinite(opens) && now < opens;
  const target = correction ? Date.parse(correction) : notOpen ? opens : deadline;
  const remaining = target - now;
  const hours = Math.floor(remaining / HOUR);
  const days = Math.floor(hours / 24);
  const timeLeft = hours >= 24 ? `${days} day${days === 1 ? "" : "s"}` : hours >= 1 ? `${hours} hour${hours === 1 ? "" : "s"}` : "under an hour";
  return {
    title: correction ? "Enrollment proof needs a correction" : "Student renewal reminder",
    message: correction ? "Check the reviewer's note and send your corrected proof before the correction deadline."
      : notOpen ? "Have your current school ID or enrollment proof ready for when submissions open."
      : !state.discount_eligible ? "Regular fares apply until your renewal is approved. Submit your current school ID or enrollment proof to restore your student discount."
      : "Submit your current school ID or enrollment proof to keep your student discount.",
    dateLabel: correction ? "Correction due" : notOpen ? "Renewal opens" : remaining <= 0 ? "Renewal closed" : "Renewal closes",
    dateValue: Number.isFinite(target) ? correction ? dateTime(target) : day(notOpen ? opens : deadline - 1) : "Date unavailable",
    countdownLabel: notOpen ? "Status" : "Time left",
    countdown: !Number.isFinite(target) ? "Check renewal status" : remaining <= 0 ? "Deadline passed" : notOpen ? `Opens in ${timeLeft}` : `${timeLeft} left`,
    action: state.can_submit ? correction ? "Submit corrected proof" : "Renew student status" : "View renewal status",
  };
}
