import { post, request } from "./api-client";
import type { RenewalKind, RenewalState } from "../../features/student-renewal/renewal-types";
const path = (kind: RenewalKind = "STUDENT") => `/mobile/commuter/${kind === "PWD" ? "pwd" : "student"}-renewal`;
export const studentRenewalService = {
  state: (kind?: RenewalKind) => request<RenewalState>(path(kind)),
  submit: (form: FormData, kind?: RenewalKind) => post<RenewalState>(path(kind), form),
  switchToRegular: (kind?: RenewalKind) => post<RenewalState>(`${path(kind)}/regular`, { confirmed: true }),
  reminder: (action: "snooze" | "dismiss", kind?: RenewalKind) => post<RenewalState>(`${path(kind)}/reminder`, { action }),
};
