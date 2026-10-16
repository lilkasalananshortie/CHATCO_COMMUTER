/// <reference types="jest" />
import { mapTrip } from "../trips";
const row = { transaction_id: "ride", shift_id: "shift", payment_method: "CASH", status: "PAID", can_leave_feedback: true, final_amount: "17.00" };
test("transaction and shift identifiers never overwrite each other", () => {
  expect(mapTrip(row)).toMatchObject({ id: "ride", shift_id: "shift", can_leave_feedback: true, final_amount: 17 });
});
test.each([
  { status: "PENDING" }, { status: "FAILED" }, { status: "CANCELLED" }, { status: "REFUNDED" },
  { shift_id: null }, { feedback_exists: true }, { can_leave_feedback: false },
  { payment_reconciliation_status: "REQUIRED" },
])("ineligible history row cannot authorize submission: %j", extra => {
  expect(mapTrip({ ...row, ...extra }).can_leave_feedback).toBe(false);
});
test("missing eligibility and missing identity fail closed", () => {
  const { can_leave_feedback, ...legacy } = row;
  expect(mapTrip(legacy).can_leave_feedback).toBe(false);
  expect(() => mapTrip({})).toThrow("transaction ID");
});
test("existing feedback stays attached and disallows resubmission", () => {
  const feedback = { id: "f", shift_id: "shift", rating: 5, conductor_rating: 2, created_at: "2026-10-15" };
  expect(mapTrip({ ...row, feedback })).toMatchObject({ feedback, has_feedback: true, can_leave_feedback: false });
});
test("legacy trip presentation maps actual backend camelCase without dummy crew", () => {
  expect(mapTrip({ id: "ride", pickup: "A", dropoff: "B", paymentMethod: "CASH", amount: 17, driverName: "Real Driver" }))
    .toMatchObject({ id: "ride", pickup_name: "A", dropoff_name: "B", driver_name: "Real Driver", plate_number: null, unit_number: null });
});
