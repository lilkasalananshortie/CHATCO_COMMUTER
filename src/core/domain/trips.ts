import type { Trip } from "./types";

/** Keep transaction identity separate from its shift; backend eligibility wins. */
export function mapTrip(row: any): Trip {
  const id = row.transaction_id ?? row.id;
  if (!id) throw new Error("The server returned a payment without a transaction ID.");
  const method = String(row.payment_method ?? row.paymentMethod ?? "").toUpperCase();
  const status = String(row.status ?? "PAID").toUpperCase();
  const hasFeedback = Boolean(row.feedback_exists ?? row.has_feedback ?? row.feedback);
  return {
    id: String(id), transaction_id: String(id), shift_id: row.shift_id ?? null,
    route_name: row.route_name ?? undefined,
    pickup_name: row.pickup_name ?? row.origin_name ?? row.pickup,
    dropoff_name: row.dropoff_name ?? row.destination_name ?? row.dropoff,
    gross_amount: Number(row.gross_amount ?? row.regular_amount ?? row.amount ?? 0),
    discount_amount: Number(row.discount_amount ?? 0),
    final_amount: Number(row.final_amount ?? row.amount ?? 0),
    fare_amount: Number(row.final_amount ?? row.amount ?? 0),
    payment_method: method as Trip["payment_method"], status: status as Trip["status"],
    paid_at: row.paid_at ?? row.paidAt ?? null,
    completed_at: row.completed_at ?? row.paid_at ?? row.paidAt ?? null,
    created_at: row.created_at ?? row.createdAt,
    unit_number: row.unit_number ?? row.unitNumber ?? null,
    plate_number: row.plate_number ?? null,
    driver_name: row.driver_name ?? row.driverName,
    conductor_name: row.conductor_name ?? row.conductorName,
    has_feedback: hasFeedback, feedback: row.feedback ?? null,
    payment_reconciliation_status: row.payment_reconciliation_status ?? null,
    // Missing eligibility is not permission to submit. Refresh from payment history.
    can_leave_feedback: row.can_leave_feedback === true && !hasFeedback && Boolean(row.shift_id)
      && status === "PAID" && ["CASH", "GCASH", "VOUCHER"].includes(method)
      && !row.payment_reconciliation_status,
  };
}
