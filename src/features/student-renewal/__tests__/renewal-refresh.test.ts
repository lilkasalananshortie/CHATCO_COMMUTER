/// <reference types="jest" />
import { useStudentRenewal } from "../useStudentRenewal";
import { studentRenewalService } from "../../../core/api/student-renewal-service";
import { commuterService } from "../../../core/api/commuter-service";
let mockStates: any[] = [], mockRefs: any[] = [], mockIndex = 0, mockRefIndex = 0;
let mockEffect: () => void | (() => void);
let mockListener: (state: string) => void;
jest.mock("react", () => ({ useCallback: (fn: unknown) => fn,
  useEffect: (fn: typeof mockEffect) => { mockEffect = fn; },
  useRef: (initial: unknown) => { const i = mockRefIndex++; return mockRefs[i] ?? (mockRefs[i] = { current: initial }); },
  useState: (initial: unknown) => { const i = mockIndex++; if (!(i in mockStates)) mockStates[i] = initial; return [mockStates[i], (value: unknown) => { mockStates[i] = value; }]; },
}));
jest.mock("react-native", () => ({ AppState: { currentState: "active", addEventListener: (_event: string, listener: typeof mockListener) => { mockListener = listener; return { remove: jest.fn() }; } }, Platform: { OS: "android" } }));
jest.mock("../../../core/api/student-renewal-service", () => ({ studentRenewalService: { state: jest.fn() } }));
jest.mock("../../../core/api/commuter-service", () => ({ commuterService: { getAnnouncements: jest.fn() } }));
function render(user = "student") { mockIndex = mockRefIndex = 0; return useStudentRenewal(user); }
async function flush() { for (let i = 0; i < 12; i++) await Promise.resolve(); }
const due = { cycle_year: 2027, commuter_type: "STUDENT", reminder_due: true, status: "NOT_RENEWED" };
beforeEach(() => { mockStates = []; mockRefs = []; jest.clearAllMocks(); jest.useFakeTimers(); (commuterService.getAnnouncements as jest.Mock).mockResolvedValue([]); });
afterEach(() => jest.useRealTimers());

test("slow renewal requests serialize polling and mutation refresh waits for a fresh read", async () => {
  let finish!: (value: unknown) => void;
  (studentRenewalService.state as jest.Mock).mockReturnValueOnce(new Promise(resolve => { finish = resolve; })).mockResolvedValue({ ...due, reminder_due: false, status: "PENDING" });
  render(); const cleanup = mockEffect(); await flush();
  await jest.advanceTimersByTimeAsync(120000);
  expect(studentRenewalService.state).toHaveBeenCalledTimes(1);
  const mutationRefresh = render().refresh();
  finish(due); await mutationRefresh;
  expect(studentRenewalService.state).toHaveBeenCalledTimes(2);
  expect(render().state).toMatchObject({ status: "PENDING", reminder_due: false });
  if (cleanup) cleanup();
});
test("a PWD account with no card date has no renewal and stops polling", async () => {
  (studentRenewalService.state as jest.Mock).mockRejectedValue(Object.assign(new Error("No card date"), { status: 403 }));
  mockIndex = mockRefIndex = 0; useStudentRenewal("pwd", "PWD");
  const cleanup = mockEffect(); await flush();
  expect(studentRenewalService.state).toHaveBeenCalledWith("PWD");
  mockIndex = mockRefIndex = 0;
  expect(useStudentRenewal("pwd", "PWD")).toMatchObject({ state: null, error: "" });
  await jest.advanceTimersByTimeAsync(120000);
  expect(studentRenewalService.state).toHaveBeenCalledTimes(1);
  if (cleanup) cleanup();
});
test("foreground resume refreshes due status and scheduled notice identity", async () => {
  (studentRenewalService.state as jest.Mock).mockResolvedValue(due);
  (commuterService.getAnnouncements as jest.Mock).mockResolvedValue([{ id: "next-reminder", rawType: "STUDENT_RENEWAL", created_at: "2027-08-29T00:00:00+08:00" }]);
  render(); const cleanup = mockEffect(); await flush();
  expect(render().noticeId).toBe("next-reminder");
  mockListener("background"); await jest.advanceTimersByTimeAsync(120000);
  expect(studentRenewalService.state).toHaveBeenCalledTimes(1);
  mockListener("active"); await flush();
  expect(studentRenewalService.state).toHaveBeenCalledTimes(2);
  if (cleanup) cleanup();
});
test("an old account response cannot load notices or restore stale eligibility", async () => {
  let finish!: (value: unknown) => void;
  (studentRenewalService.state as jest.Mock).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  render("old-student"); const cleanup = mockEffect(); await flush();
  render("new-user"); finish(due); await flush();
  expect(render("new-user").state).toBeNull();
  expect(commuterService.getAnnouncements).not.toHaveBeenCalled();
  if (cleanup) cleanup();
});
test("notice outages preserve due reminders, renewal outages remove stale state", async () => {
  (studentRenewalService.state as jest.Mock).mockResolvedValue(due);
  (commuterService.getAnnouncements as jest.Mock).mockRejectedValue(new Error("Notice offline"));
  render(); const cleanup = mockEffect(); await flush();
  expect(render().state).toMatchObject({ reminder_due: true });
  (studentRenewalService.state as jest.Mock).mockRejectedValue(new Error("Offline"));
  await render().refresh();
  expect(render().state).toBeNull(); expect(render().error).toBe("Offline");
  if (cleanup) cleanup();
});
