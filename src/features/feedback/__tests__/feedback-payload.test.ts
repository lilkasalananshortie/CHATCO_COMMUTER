/// <reference types="jest" />
import { feedbackPayload } from "../feedback-payload";
const input = { shiftId: "shift-real", driverRating: 5, driverTags: ["Safe Driving", "Polite"], driverComment: " Driver text ", conductorRating: 2, conductorTags: ["Wrong Change"], conductorComment: " Conductor text " };
test("distinct scores and comments map to existing backend columns, never averaged", () => {
  expect(feedbackPayload(input)).toEqual({ shift_id: "shift-real", rating: 5, category: "Safe Driving", comment: "Safe Driving, Polite. Driver text", conductor_rating: 2, conductor_category: "Wrong Change", conductor_comment: "Wrong Change. Conductor text" });
});
test("missing shift cannot fall back to transaction id or demo crew", () => {
  expect(() => feedbackPayload({ ...input, shiftId: "" })).toThrow("paid ride");
});
test.each([0, -1, 6, 2.5, NaN])("invalid score %s cannot be submitted", score => {
  expect(() => feedbackPayload({ ...input, driverRating: score })).toThrow("rate both");
});
