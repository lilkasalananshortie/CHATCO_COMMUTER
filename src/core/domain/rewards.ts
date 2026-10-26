import type { RewardProgress, Voucher } from "./types";

export function isVoucherAvailable(voucher: Voucher, at = Date.now()): boolean {
  const expiry = voucher.expires_at ?? voucher.expiresAt ?? voucher.valid_until;
  return voucher.status === "AVAILABLE" && (!expiry || new Date(expiry).getTime() > at);
}

export function voucherWalletStatus(voucher: Voucher, at = Date.now()): "AVAILABLE" | "USED" | "EXPIRED" {
  if (voucher.status === "USED" || voucher.is_used) return "USED";
  return isVoucherAvailable(voucher, at) ? "AVAILABLE" : "EXPIRED";
}

export function voucherLabel(voucher: Pick<Voucher, "type" | "amount">): string {
  return voucher.type === "DISCOUNT" ? `₱${Number(voucher.amount ?? 0).toFixed(2)} Discount Voucher` : "Free Ride Voucher";
}

export function normalizeRewards(raw: any): RewardProgress {
  const current = Number(raw.currentCycleRides ?? raw.current_cycle_rides ?? raw.current_rides ?? raw.rides_completed ?? 0);
  const threshold = Number(raw.ridesNeeded ?? raw.rides_needed ?? raw.target_rides ?? raw.rides_required ?? 10);
  const needed = Number.isFinite(threshold) && threshold > 0 ? threshold : 10;
  const total = Number(raw.totalRides ?? raw.total_rides ?? raw.rides_completed ?? 0);
  const vouchers: Voucher[] = (raw.vouchers ?? raw.available_vouchers ?? []).map((v: any) => {
    const voucher: Voucher = {
      ...v, status: String(v.status ?? "AVAILABLE").toUpperCase(),
      type: v.type ?? "REWARD", amount: v.amount == null ? null : Number(v.amount),
      expires_at: v.expiresAt ?? v.expires_at ?? v.valid_until ?? null,
      rideOrigin: v.rideOrigin ?? v.ride_origin ?? "Reward",
    };
    if (voucher.status === "AVAILABLE" && !isVoucherAvailable(voucher)) voucher.status = "EXPIRED";
    return voucher;
  });
  const availableVoucherCount = Number(raw.availableVoucherCount ?? raw.available_voucher_count);
  return {
    rides_completed: total, current_rides: current, target_rides: needed,
    currentCycleRides: current, ridesNeeded: needed, totalRides: total, vouchers,
    availableVoucherCount: Number.isFinite(availableVoucherCount)
      ? Math.max(0, availableVoucherCount)
      : vouchers.filter((v) => isVoucherAvailable(v)).length,
    archivedVoucherCount: Number(raw.archivedVoucherCount ?? raw.archived_voucher_count ?? 0),
    progressPercent: Math.min(100, Math.round(current / needed * 100)), ridesRemaining: Math.max(0, needed - current),
  };
}
