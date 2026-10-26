export interface VoucherOption { id: string; type: string; amount: number | null; expiresAt?: string | null }
export interface GroupSeat { position: number; passengerType: string | null; fare: number; isPayer: boolean }
const round = (value: number) => Math.round(value * 100) / 100;

/** Display preview matching web. Only the redemption response authorizes payment. */
export function planGroupVouchers(seats: GroupSeat[], vouchers: VoucherOption[]) {
  const fares = new Map(seats.map(seat => [seat.position, round(Math.max(0, seat.fare))]));
  const held = new Set<number>();
  const unused: string[] = [];
  const byFare = () => [...fares.keys()].sort((a, b) => (fares.get(b)! - fares.get(a)!) || a - b);
  const open = () => byFare().find(position => fares.get(position)! > 0 && !held.has(position));
  for (const voucher of vouchers.filter(item => item.type !== "DISCOUNT")) {
    const seat = open();
    if (seat === undefined) { unused.push(voucher.id); continue; }
    held.add(seat); fares.set(seat, 0);
  }
  for (const voucher of vouchers.filter(item => item.type === "DISCOUNT").sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))) {
    const seat = open();
    let left = round(Math.max(0, voucher.amount ?? 0));
    if (seat === undefined || left <= 0) { unused.push(voucher.id); continue; }
    held.add(seat);
    for (const position of [seat, ...byFare().filter(value => value !== seat)]) {
      const take = Math.min(fares.get(position)!, left);
      fares.set(position, round(fares.get(position)! - take));
      left = round(left - take);
    }
  }
  return { remaining: round([...fares.values()].reduce((sum, fare) => sum + fare, 0)), unused };
}
