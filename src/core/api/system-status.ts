import { request } from "./api-client";

export const DEFAULT_MAINTENANCE_MESSAGE = "CHATCO is currently undergoing scheduled maintenance. We'll be back online shortly. Thank you for your patience!";

export interface CommuterMaintenance {
  active: boolean;
  message: string;
}

/** Older settings have no role list and apply maintenance to both apps. */
export function commuterMaintenanceFrom(raw: any): CommuterMaintenance {
  let roles = raw?.maintenance_roles;
  if (typeof roles === "string") {
    try { roles = JSON.parse(roles); } catch { roles = undefined; }
  }
  const coversCommuters = Array.isArray(roles) ? roles.includes("COMMUTER") : true;
  const message = typeof raw?.maintenance_message === "string" ? raw.maintenance_message.trim() : "";
  return {
    active: raw?.maintenance_mode === true && coversCommuters,
    message: message || DEFAULT_MAINTENANCE_MESSAGE,
  };
}

export async function getCommuterMaintenance(): Promise<CommuterMaintenance> {
  return commuterMaintenanceFrom(await request("/mobile/system-status"));
}
