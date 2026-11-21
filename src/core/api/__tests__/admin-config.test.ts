/// <reference types="jest" />
jest.mock("../api-client", () => ({ request: jest.fn() }));
import { groupFaqs, type FaqItem } from "../faq-service";
import { commuterMaintenanceFrom, DEFAULT_MAINTENANCE_MESSAGE } from "../system-status";
import { estimateFare, normalizeFareMatrix } from "../../../features/fare/fare-estimate";

test("maintenance applies only when it covers commuters", () => {
  expect(commuterMaintenanceFrom({ maintenance_mode: true, maintenance_roles: ["COMMUTER"], maintenance_message: "Back soon" })).toEqual({ active: true, message: "Back soon" });
  expect(commuterMaintenanceFrom({ maintenance_mode: true, maintenance_roles: ["CONDUCTOR"] }).active).toBe(false);
  expect(commuterMaintenanceFrom({ maintenance_mode: false, maintenance_roles: ["COMMUTER"] }).active).toBe(false);
});
test("older maintenance settings cover both apps and keep a readable message", () => {
  expect(commuterMaintenanceFrom({ maintenance_mode: true, maintenance_message: "  " })).toEqual({ active: true, message: DEFAULT_MAINTENANCE_MESSAGE });
});

const faq = (id: string, category: string, question = `Question ${id}`): FaqItem => ({ id, category, question, answer: `Answer ${id}` });
test("FAQs follow the web category order and keep unknown categories visible", () => {
  const groups = groupFaqs([faq("a", "rewards"), faq("b", "getting-started"), faq("c", "new-category")]);
  expect(groups.map(group => group.label)).toEqual(["Getting Started", "Rewards & Loyalty", "More Questions"]);
});
test("FAQ search matches questions and answers", () => {
  const items = [faq("a", "payments", "How do I pay?"), faq("b", "riding", "Where is my jeep?")];
  expect(groupFaqs(items, "PAY").flatMap(group => group.items).map(item => item.id)).toEqual(["a"]);
  expect(groupFaqs(items, "answer b").flatMap(group => group.items).map(item => item.id)).toEqual(["b"]);
});

test("a fare rule covering zero barangays is accepted and priced like the backend", () => {
  const matrix = normalizeFareMatrix({
    route: { id: "r", name: "Route" },
    points: [1, 2].map(n => ({ id: `p${n}`, name: `P${n}`, pointNumber: n, regularFare: 17, discountedFare: 13.5 })),
    config: { baseFareRegular: 17, baseFareDiscounted: 13.5, baseBarangayCount: 0, succeedingFareRegular: 2, discountRate: 25 },
  });
  expect(estimateFare(matrix, "p1", "p2", "REGULAR").regular).toBe(21);
  expect(estimateFare(matrix, "p1", "p2", "STUDENT" as never).amount).toBe(15.75);
});
