import { post, request } from "./api-client";
import type { RenewalState } from "../../features/student-renewal/renewal-types";
const PATH = "/mobile/commuter/student-renewal";
export const studentRenewalService = {
  state: () => request<RenewalState>(PATH),
  submit: (form: FormData) => post<RenewalState>(PATH, form),
  switchToRegular: () => post<RenewalState>(`${PATH}/regular`, { confirmed: true }),
  reminder: (action: "snooze" | "dismiss") => post<RenewalState>(`${PATH}/reminder`, { action }),
};
