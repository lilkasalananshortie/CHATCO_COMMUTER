import { post, request } from "./api-client";

export interface EmailChangeState {
  flow: null | { id: string; step: "identity" | "email" | "verify"; current_email: string;
    new_email: string | null; expires_at: string; old_code_sent: boolean; new_code_sent: boolean };
  attempts_left: number; blocked_until: string | null; server_now: string;
  password_retry_after: number; old_resend_in_seconds: number; new_resend_in_seconds: number;
}
const path = "/mobile/commuter/change-email";
export const emailChangeService = {
  state: () => request<EmailChangeState>(path),
  start: () => post<EmailChangeState>(`${path}/start`),
  sendCode: (id: string, stage: "old" | "new", email?: string) => post<EmailChangeState>(`${path}/send-code`, { request_id: id, stage, email }),
  verify: (id: string, method: "email" | "password", value: string) => post<EmailChangeState>(`${path}/verify-identity`, {
    request_id: id, method, ...(method === "email" ? { code: value } : { current_password: value }),
  }),
  confirm: (id: string, code: string) => post<{ email: string }>(`${path}/confirm`, { request_id: id, code }),
  cancel: (id: string) => post<null>(`${path}/cancel`, { request_id: id }),
};
