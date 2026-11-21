import type { HailRequest } from "../../core/domain/types";

/** Matches HailService::ACCEPTED_HOLD_SECONDS; also caps a wrong device clock. */
export const ACCEPTED_HOLD_MS = 120_000;

export interface HailCooldown {
  /** Null when the cooldown came from a refused hail rather than a known accept. */
  hailId: string | null;
  vehicleId: string;
  unitNumber: string;
  endsAt: number;
  /** The server just refused a hail, so a local nearby reading cannot end this early. */
  serverHeld: boolean;
}

export function hailIsTerminal(hail: HailRequest): boolean {
  return ["REJECTED", "DECLINED", "CANCELLED", "EXPIRED", "COMPLETED"].includes(String(hail.status).toUpperCase());
}
export function hailSecondsRemaining(hail: HailRequest, now = Date.now()): number {
  if (hail.status !== "PENDING") return 0;
  const expiry = Date.parse(hail.expires_at ?? "");
  // Missing expiry is unknown, not permission to invent a client-side timeout.
  return Number.isFinite(expiry) ? Math.max(0, Math.ceil((expiry - now) / 1000)) : 0;
}

/** An accepted hail inside its window, or null once that window has passed. */
export function acceptedHailCooldown(hail: HailRequest, now = Date.now()): HailCooldown | null {
  if (String(hail.status).toUpperCase() !== "ACCEPTED" || !hail.vehicle_id) return null;
  const expiry = Date.parse(hail.expires_at ?? "");
  if (!Number.isFinite(expiry) || expiry <= now) return null;
  return {
    hailId: hail.id,
    vehicleId: hail.vehicle_id,
    unitNumber: hail.accepted_by?.unit_number || "A unit",
    endsAt: Math.min(expiry, now + ACCEPTED_HOLD_MS),
    serverHeld: false,
  };
}

/** The server's 409 hail_cooldown refusal, for a client that missed the accept. */
export function hailCooldownFromError(error: unknown, now = Date.now()): HailCooldown | null {
  const response = (error as { response?: { status?: number; data?: any } } | null)?.response;
  const body = response?.data;
  if (response?.status !== 409 || body?.error !== "hail_cooldown") return null;
  if (typeof body.vehicle_id !== "string" || typeof body.cooldown_ends_at !== "string") return null;
  const expiry = Date.parse(body.cooldown_ends_at);
  if (!Number.isFinite(expiry) || expiry <= now) return null;
  return {
    hailId: null,
    vehicleId: body.vehicle_id,
    unitNumber: body.unit_number || "A unit",
    endsAt: Math.min(expiry, now + ACCEPTED_HOLD_MS),
    serverHeld: true,
  };
}

export function formatHailCooldown(remainingMs: number): string {
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
