/// <reference types="jest" />
import React from "react";
import { post, request } from "../../../core/api/api-client";
import { studentRenewalService } from "../../../core/api/student-renewal-service";
import { StudentRenewalEntry } from "../../profile/StudentRenewalEntry";
import { RewardsRenewalNotice } from "../../rewards/RewardsRenewalNotice";
import { renewalReminderKey, renewalReminderPresentation } from "../renewal-reminder-state";
import { formatCardDate, pwdRenewalPayload, renewalKindFor, type RenewalState } from "../renewal-types";

jest.mock("react", () => ({ ...jest.requireActual("react"), useState: (initial: unknown) => [initial === false ? true : initial, () => {}] }));
jest.mock("react-native", () => ({ View: "View", TouchableOpacity: "Button", StyleSheet: { create: (value: unknown) => value } }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("../../../shared/ui/BrandText", () => ({ Text: "Text" }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useCommuterTheme: () => ({ colors: { primary: "#1A5FB4" }, isLight: false }) }));
jest.mock("../../../core/api/api-client", () => ({ post: jest.fn(), request: jest.fn() }));

const cardDate = `${new Date().getFullYear() + 1}-03-15`;
const proof = () => new File(["id"], "pwd.jpg", { type: "image/jpeg" });
const state: RenewalState = {
  kind: "PWD", valid_until: "2027-03-15", cycle_year: 20892, opens_at: "2027-03-15T00:00:00+08:00", deadline: "2027-04-16T00:00:00+08:00",
  renewal_period: "Mar 15 – Apr 15, 2027", commuter_type: "PWD", discount_eligible: true, discount_expires_at: "2027-04-16T00:00:00+08:00",
  status: "NOT_RENEWED", can_submit: true, notice_active: true, reminder_due: true, can_switch_to_regular: true, application: null,
};
function text(node: unknown): string {
  if (Array.isArray(node)) return node.map(text).join(" ");
  if (typeof node === "string" || typeof node === "number") return String(node);
  return React.isValidElement(node) ? text((node.props as { children?: unknown }).children) : "";
}
const studentWords = /student|school|enrollment/i;

test.each([
  [{ commuter_type: "PWD" }, "PWD"],
  [{ commuter_type: "REGULAR", applied_type: "PWD" }, "PWD"],
  [{ commuter_type: "STUDENT" }, "STUDENT"],
  [{ commuter_type: "REGULAR", applied_type: "STUDENT" }, "STUDENT"],
  [{ commuter_type: "REGULAR", applied_type: "REGULAR" }, "STUDENT"],
  [null, "STUDENT"],
])("%j uses the %s renewal", (profile, kind) => expect(renewalKindFor(profile)).toBe(kind));

test("PWD calls use PWD endpoints and student calls stay unchanged", () => {
  const form = new FormData();
  void studentRenewalService.state("PWD");
  void studentRenewalService.submit(form, "PWD");
  void studentRenewalService.switchToRegular("PWD");
  void studentRenewalService.reminder("snooze", "PWD");
  void studentRenewalService.state();
  expect(request).toHaveBeenNthCalledWith(1, "/mobile/commuter/pwd-renewal");
  expect(post).toHaveBeenCalledWith("/mobile/commuter/pwd-renewal", form);
  expect(post).toHaveBeenCalledWith("/mobile/commuter/pwd-renewal/regular", { confirmed: true });
  expect(post).toHaveBeenCalledWith("/mobile/commuter/pwd-renewal/reminder", { action: "snooze" });
  expect(request).toHaveBeenNthCalledWith(2, "/mobile/commuter/student-renewal");
});

test("PWD payload sends only the card date and proof", () => {
  const form = pwdRenewalPayload(cardDate, null, proof());
  expect(form.get("valid_until")).toBe(cardDate);
  expect(form.get("document")).toBeInstanceOf(File);
  expect(form.has("school_name")).toBe(false);
});

test("a renewed card must be later than the current card", () => {
  expect(() => pwdRenewalPayload(cardDate, cardDate, proof())).toThrow("later than");
  expect(() => pwdRenewalPayload(cardDate, null, null)).toThrow("proof");
});

test("card dates display without a time zone shift", () => {
  expect(formatCardDate("2027-03-15")).toBe("Mar 15, 2027");
  expect(formatCardDate("2027-12-01T00:00:00Z")).toBe("Dec 1, 2027");
});

test("Profile gives a PWD's last discount day, not the next-day cutoff", () => {
  const entry = text(StudentRenewalEntry({ state, discountPercentage: 20, isLight: false, onOpen: () => {} }));
  expect(entry).toContain("by Apr 15, 2027");
  expect(entry).not.toContain("Apr 16");
});

test("PWD reminders are due for PWD accounts and use PWD wording", () => {
  expect(renewalReminderKey(state)).not.toBeNull();
  const copy = renewalReminderPresentation(state, Date.parse("2027-03-20T00:00:00+08:00"));
  expect(copy.title).toBe("PWD renewal reminder");
  expect(copy.action).toBe("Renew PWD ID");
  expect(`${copy.title} ${copy.message} ${copy.action}`).not.toMatch(studentWords);
});

test.each(["NOT_RENEWED", "PENDING", "NEEDS_CORRECTION", "REJECTED"] as const)("%s Profile and Rewards notices have no student wording", (status) => {
  const current = { ...state, status };
  const entry = text(StudentRenewalEntry({ state: current, discountPercentage: 20, isLight: false, onOpen: () => {} }));
  const notice = text(RewardsRenewalNotice({ renewal: current, onOpen: () => {} }));
  expect(entry).toMatch(/PWD/);
  expect(notice).toMatch(/PWD/);
  expect(entry).not.toMatch(studentWords);
  expect(notice).not.toMatch(studentWords);
});
