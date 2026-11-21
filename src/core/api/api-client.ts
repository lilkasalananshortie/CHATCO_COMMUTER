import { appStorage } from "../storage/app-storage";

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://api.chatco.online").replace(/\/$/, "");
export const TOKEN_KEY = "chatco_commuter_session";
export const REQUEST_TIMEOUT_MS = 15000;

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

type Envelope<T> = { success?: boolean; data: T; message?: string; errors?: unknown };

let sessionEndedHandler: (() => void) | null = null;
let sessionEndedNotified = false;

export function setSessionEndedHandler(handler: (() => void) | null): () => void {
  sessionEndedHandler = handler;
  return () => {
    if (sessionEndedHandler === handler) sessionEndedHandler = null;
  };
}

export function resetSessionEndedNotified() {
  sessionEndedNotified = false;
}

let maintenanceHandler: ((message: string) => void) | null = null;

/** Called when the server refuses a request because maintenance is on. */
export function setMaintenanceHandler(handler: ((message: string) => void) | null): () => void {
  maintenanceHandler = handler;
  return () => {
    if (maintenanceHandler === handler) maintenanceHandler = null;
  };
}

/** Any HTTP reply, including 401, proves the server can be reached. */
export async function isServerReachable(timeoutMs = REQUEST_TIMEOUT_MS): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(`${API_URL}/api/v1/mobile/auth/session`, { headers: { Accept: "application/json" }, signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const startedAt = Date.now();
  try {
    return await requestCore<T>(path, init);
  } finally {
    if (typeof __DEV__ !== "undefined" && __DEV__ && process.env.EXPO_PUBLIC_PROFILE_API === "1") {
      // Omit query strings: search text and other private values can appear there.
      console.info(`[API timing] ${init.method ?? "GET"} ${path.split("?")[0]} ${Date.now() - startedAt}ms`);
    }
  }
}

async function requestCore<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await appStorage.getItem(TOKEN_KEY);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;

  try {
    response = await fetch(`${API_URL}/api/v1${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch (cause) {
    const errorDetail = cause instanceof Error ? cause.message : String(cause);
    if (controller.signal.aborted || (cause instanceof Error && cause.name === "AbortError")) {
      throw new NetworkError(`The E-CHATCO server did not respond within ${REQUEST_TIMEOUT_MS / 1000}s. Check your connection and try again.`);
    }
    console.error(`[API Network Error] ${init.method ?? "GET"} ${API_URL}/api/v1${path}:`, cause);
    throw new NetworkError(
      `Unable to reach the E-CHATCO server (${errorDetail}). Target: ${API_URL}. Check your internet connection or host settings.`
    );
  } finally {
    clearTimeout(timeout);
  }

  const payload = (await response.json().catch(() => null)) as Envelope<T> | null;

  if (!response.ok) {
    if (response.status === 503 && (payload as any)?.code === "MAINTENANCE") {
      maintenanceHandler?.(payload?.message ?? "");
    }
    // A late failure from an old token must not sign out a newer login.
    if (response.status === 401 && path !== "/mobile/auth/login"
      && token && await appStorage.getItem(TOKEN_KEY) === token) {
      await appStorage.removeItem(TOKEN_KEY);
      if (!sessionEndedNotified) {
        sessionEndedNotified = true;
        sessionEndedHandler?.();
      }
    }
    let message = payload?.message ?? `Request failed (${response.status}).`;
    if ((payload as any)?.errors && typeof (payload as any).errors === "object") {
      const errList = Object.values((payload as any).errors).flat().filter(Boolean);
      if (errList.length > 0) {
        message = `${message}: ${errList.join("; ")}`;
      }
    }
    if ((payload as any)?.error === "outside_radius") {
      const dist = (payload as any).distance_m ? ` (${Math.round((payload as any).distance_m)}m away)` : "";
      message = payload?.message ?? `Vehicle is outside the 1km hail radius${dist}.`;
    }
    const err = new Error(message);
    (err as any).status = response.status;
    (err as any).response = { status: response.status, data: payload };
    throw err;
  }

  return payload?.data as T;
}

export const post = <T>(path: string, body?: unknown) => {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  return request<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : isFormData ? (body as any) : JSON.stringify(body),
  });
};

export const put = <T>(path: string, body?: unknown) => {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  return request<T>(path, {
    method: "PUT",
    body: body === undefined ? undefined : isFormData ? (body as any) : JSON.stringify(body),
  });
};

export const del = <T>(path: string, body?: unknown) => {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  return request<T>(path, {
    method: "DELETE",
    body: body === undefined ? undefined : isFormData ? (body as any) : JSON.stringify(body),
  });
};

