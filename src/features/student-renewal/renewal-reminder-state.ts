import { RENEWAL_COPY, type RenewalState } from "./renewal-types";
import type { Announcement } from "../../core/domain/types";

const HOUR = 3_600_000;
const day = (value: number) => new Date(value).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" });
const dateTime = (value: number) => new Date(value).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

/** Eligibility, schedule and snooze/dismiss choices are owned by the shared server. */
export function renewalReminderKey(state: RenewalState | null, noticeId?: string | null): string | null {
  if (!state?.reminder_due || state.commuter_type !== (state.kind ?? "STUDENT") || ["PENDING", "APPROVED"].includes(state.status)) return null;
  return [state.cycle_year, state.deadline, state.status, state.application?.id, state.application?.revision, state.application?.correction_due_at, noticeId].join(":");
}

/** Marking a notice read must not change its identity and reopen a modal. */
export function latestRenewalNoticeId(notices: Announcement[]): string | null {
  const reminders = notices.filter(notice => ["STUDENT_RENEWAL", "PWD_RENEWAL"].includes(String(notice.rawType ?? notice.type)));
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
  const copy = RENEWAL_COPY[state.kind ?? "STUDENT"];
  const pwd = state.kind === "PWD";
  const timeLeft = hours >= 24 ? `${days} day${days === 1 ? "" : "s"}` : hours >= 1 ? `${hours} hour${hours === 1 ? "" : "s"}` : "under an hour";
  return {
    title: correction ? copy.reminderCorrectionTitle : copy.reminderTitle,
    message: correction ? `Check the reviewer's note and send your corrected ${pwd ? "PWD ID" : "proof"} before the correction deadline.`
      : notOpen ? `Have ${copy.ready} ready for when submissions open.`
      : !state.discount_eligible ? `Regular fares apply until your renewal is approved. Submit ${copy.ready} to restore your ${copy.discount}.`
      : `Submit ${copy.ready} to keep your ${copy.discount}.`,
    dateLabel: correction ? "Correction due" : notOpen ? "Renewal opens" : remaining <= 0 ? "Renewal closed" : "Renewal closes",
    dateValue: Number.isFinite(target) ? correction ? dateTime(target) : day(notOpen ? opens : deadline - 1) : "Date unavailable",
    countdownLabel: notOpen ? "Status" : "Time left",
    countdown: !Number.isFinite(target) ? "Check renewal status" : remaining <= 0 ? "Deadline passed" : notOpen ? `Opens in ${timeLeft}` : `${timeLeft} left`,
    action: state.can_submit ? correction ? copy.correctedAction : copy.renewAction : "View renewal status",
  };
}
