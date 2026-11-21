import { useEffect, useState } from "react";
import { commuterService } from "../../core/api/commuter-service";

const CACHE_MS = 60_000;
let cached: { rate: number; at: number } | null = null;
let pending: Promise<number | null> | null = null;

export function validDiscountRate(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 && rate <= 100 ? rate : null;
}

/** The admin's Financial Rules rate, shared by every screen that quotes it. */
export function loadDiscountRate(now = Date.now()): Promise<number | null> {
  if (cached && now - cached.at < CACHE_MS) return Promise.resolve(cached.rate);
  if (!pending) {
    pending = Promise.resolve().then(() => commuterService.getFareMatrix())
      .then((matrix) => {
        const rate = validDiscountRate(matrix?.config?.discountRate);
        if (rate !== null) cached = { rate, at: Date.now() };
        return rate ?? cached?.rate ?? null;
      })
      .catch(() => cached?.rate ?? null)
      .finally(() => { pending = null; });
  }
  return pending;
}

export function useDiscountRate(): number | null {
  const [rate, setRate] = useState<number | null>(cached?.rate ?? null);
  useEffect(() => {
    let active = true;
    void loadDiscountRate().then((value) => { if (active) setRate(value); });
    return () => { active = false; };
  }, []);
  return rate;
}
