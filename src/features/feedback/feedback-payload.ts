export function feedbackPayload(input: {
  shiftId: string; driverRating: number; driverTags: string[]; driverComment: string;
  conductorRating: number; conductorTags: string[]; conductorComment: string;
}) {
  if (!input.shiftId) throw new Error("Scan a valid unit QR or select a paid ride from Payment History first.");
  if (![input.driverRating, input.conductorRating].every(value => Number.isInteger(value) && value >= 1 && value <= 5)) {
    throw new Error("Please rate both the driver and conductor.");
  }
  return {
    shift_id: input.shiftId,
    rating: input.driverRating, // Backend rating column belongs to the driver, not their average.
    category: input.driverTags[0] || undefined,
    comment: [input.driverTags.join(", "), input.driverComment.trim()].filter(Boolean).join(". ") || undefined,
    conductor_rating: input.conductorRating,
    conductor_category: input.conductorTags[0] || undefined,
    conductor_comment: [input.conductorTags.join(", "), input.conductorComment.trim()].filter(Boolean).join(". ") || undefined,
  };
}
