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

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
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
    console.error(`[API Network Error] ${init.method ?? "GET"} ${API_URL}/api/v1${path}:`, cause);
    if (cause instanceof Error && cause.name === "AbortError") {
      throw new NetworkError(`The ChatCo server did not respond within ${REQUEST_TIMEOUT_MS / 1000}s. Check your connection and try again.`);
    }
    throw new NetworkError(
      `Unable to reach the ChatCo server (${errorDetail}). Target: ${API_URL}. Check your internet connection or host settings.`
    );
  } finally {
    clearTimeout(timeout);
  }

  const payload = (await response.json().catch(() => null)) as Envelope<T> | null;

  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/login") {
      await appStorage.removeItem(TOKEN_KEY);
      if (!sessionEndedNotified) {
        sessionEndedNotified = true;
        sessionEndedHandler?.();
      }
    }
    const message = payload?.message ?? `Request failed (${response.status}).`;
    throw new Error(`${message} [HTTP ${response.status}]`);
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

