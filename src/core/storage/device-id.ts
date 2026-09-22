import { appStorage } from "./app-storage";

const DEVICE_KEY = "chatco_commuter_device_v1";

export async function getCommuterDeviceId(): Promise<string> {
  const existing = await appStorage.getItem(DEVICE_KEY);
  if (existing) return existing;

  const random = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  const id = `commuter-${random}`;
  await appStorage.setItem(DEVICE_KEY, id);
  return id;
}

export const COMMUTER_DEVICE_TYPE = "MOBILE" as const;
