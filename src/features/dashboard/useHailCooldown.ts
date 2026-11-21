import { useCallback, useEffect, useRef, useState } from "react";
import type { HailRequest } from "../../core/domain/types";
import { acceptedHailCooldown, formatHailCooldown, hailCooldownFromError, type HailCooldown } from "./hail-state";

/** Under this, a hail missing from the server has simply reached its normal end. */
const NORMAL_END_MARGIN_MS = 3000;

// The dashboard unmounts on tab changes, but the server keeps returning a
// released hail until its window ends, so released IDs must outlive the screen.
const released = { userId: undefined as string | undefined, ids: new Set<string>() };

function releasedIdsFor(userId: string | undefined): Set<string> {
  if (released.userId !== userId) {
    released.userId = userId;
    released.ids = new Set();
  }
  return released.ids;
}

export function clearReleasedHails(): void {
  released.userId = undefined;
  released.ids = new Set();
}

/** The cooldown a server read implies, without restarting one that was released. */
export function cooldownFromSnapshot(
  current: HailCooldown | null,
  hail: HailRequest | null,
  releasedIds: ReadonlySet<string>,
  now = Date.now(),
): HailCooldown | null {
  const next = hail ? acceptedHailCooldown(hail, now) : null;
  if (!next) return null;
  // A refusal outranks a local release: the server says the unit can still come.
  if (current?.serverHeld) return { ...current, hailId: next.hailId };
  if (next.hailId && releasedIds.has(next.hailId)) return null;
  return current?.hailId === next.hailId ? current : next;
}

/** `nearbyIds` is null until GPS and the vehicle list can be trusted. */
export function shouldReleaseCooldown(cooldown: HailCooldown | null, nearbyIds: readonly string[] | null): boolean {
  return !!cooldown && !cooldown.serverHeld && nearbyIds !== null && !nearbyIds.includes(cooldown.vehicleId);
}

export function useHailCooldown(userId: string | undefined, nearbyVehicleIds: readonly string[] | null) {
  const [cooldown, setCooldownState] = useState<HailCooldown | null>(null);
  const [releasedUnit, setReleasedUnit] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const cooldownRef = useRef<HailCooldown | null>(cooldown);

  const setCooldown = useCallback((next: HailCooldown | null) => {
    cooldownRef.current = next;
    setCooldownState(next);
  }, []);

  const release = useCallback(() => {
    const current = cooldownRef.current;
    if (!current) return;
    if (current.hailId) releasedIdsFor(userId).add(current.hailId);
    setReleasedUnit(current.unitNumber);
    setCooldown(null);
  }, [setCooldown, userId]);

  /** Applies a server read. "started" means this hail's cooldown is new here. */
  const syncHail = useCallback((hail: HailRequest | null): "started" | "unchanged" | "none" => {
    const current = cooldownRef.current;
    const at = Date.now();
    const next = cooldownFromSnapshot(current, hail, releasedIdsFor(userId), at);
    if (!next) {
      if (current && current.endsAt - at > NORMAL_END_MARGIN_MS) release();
      else if (current) setCooldown(null);
      return "none";
    }
    if (current?.hailId === next.hailId && current.vehicleId === next.vehicleId) {
      if (current !== next) setCooldown(next);
      return "unchanged";
    }
    setReleasedUnit(null);
    setNow(at);
    setCooldown(next);
    return current ? "unchanged" : "started";
  }, [release, setCooldown, userId]);

  const applyRefusal = useCallback((error: unknown): boolean => {
    const at = Date.now();
    const next = hailCooldownFromError(error, at);
    if (!next) return false;
    setReleasedUnit(null);
    setNow(at);
    setCooldown(next);
    return true;
  }, [setCooldown]);

  const clearReleasedNotice = useCallback(() => setReleasedUnit(null), []);

  useEffect(() => {
    setCooldown(null);
    setReleasedUnit(null);
  }, [setCooldown, userId]);

  useEffect(() => {
    if (!cooldown) return;
    const tick = () => {
      const at = Date.now();
      setNow(at);
      if (at >= cooldown.endsAt) setCooldown(null);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [cooldown, setCooldown]);

  const nearbyKey = nearbyVehicleIds === null ? null : nearbyVehicleIds.join("|");
  useEffect(() => {
    if (shouldReleaseCooldown(cooldownRef.current, nearbyVehicleIds)) release();
    // The key is the array's value; the array itself is rebuilt on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cooldown, nearbyKey, release]);

  return {
    cooldown,
    releasedUnit,
    label: cooldown ? formatHailCooldown(cooldown.endsAt - now) : "",
    syncHail,
    applyRefusal,
    clearReleasedNotice,
  };
}
