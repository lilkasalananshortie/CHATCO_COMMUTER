import type { HailRequest } from "../../core/domain/types";
export function hailIsTerminal(hail: HailRequest): boolean {
  return ["REJECTED", "DECLINED", "CANCELLED", "EXPIRED", "COMPLETED"].includes(String(hail.status).toUpperCase());
}
export function hailSecondsRemaining(hail: HailRequest, now = Date.now()): number {
  if (hail.status !== "PENDING") return 0;
  const expiry = Date.parse(hail.expires_at ?? "");
  // Missing expiry is unknown, not permission to invent a client-side timeout.
  return Number.isFinite(expiry) ? Math.max(0, Math.ceil((expiry - now) / 1000)) : 0;
}
