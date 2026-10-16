import { post, request } from "./api-client";
import type { ApplicationState } from "../../features/discount-application/application-types";

const PATH = "/mobile/commuter/discount-applications";
export const discountApplicationService = {
  state: () => request<ApplicationState>(PATH),
  submit: (form: FormData) => post<ApplicationState>(PATH, form),
  cancel: (applicationId: string) => post<ApplicationState>(`${PATH}/cancel`, { application_id: applicationId }),
};
