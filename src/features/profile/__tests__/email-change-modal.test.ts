/// <reference types="jest" />
import React from "react";
import { ChangeEmailModal } from "../ChangeEmailModal";
import { emailChangeService } from "../../../core/api/email-change-service";
let mockStates: any[] = [], mockRefs: any[] = [], mockEffects: Array<() => any> = [];
let mockStateIndex = 0, mockRefIndex = 0;
jest.mock("react", () => ({ ...jest.requireActual("react"),
  useEffect: (fn: () => any) => { mockEffects.push(fn); },
  useRef: (initial: unknown) => { const index = mockRefIndex++; return mockRefs[index] ?? (mockRefs[index] = { current: initial }); },
  useState: (initial: unknown) => { const index = mockStateIndex++; if (!(index in mockStates)) mockStates[index] = initial; return [mockStates[index], (next: any) => { mockStates[index] = typeof next === "function" ? next(mockStates[index]) : next; }]; },
}));
jest.mock("react-native", () => ({ Modal: "Modal", Pressable: "Button", Text: "Text", TextInput: "Input", ScrollView: "Scroll", KeyboardAvoidingView: "Keyboard", ActivityIndicator: "Spinner", useWindowDimensions: () => ({ height: 568, width: 320 }), StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style }, Platform: { OS: "android" } }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 16 }) }));
jest.mock("../../../core/api/email-change-service", () => ({ emailChangeService: { state: jest.fn(), start: jest.fn(), sendCode: jest.fn(), verify: jest.fn(), confirm: jest.fn(), cancel: jest.fn() } }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useCommuterTheme: () => ({ isLight: true }) }));
jest.mock("../ProfileIcon", () => ({ ProfileIcon: "ProfileIcon" }));
const onClose = jest.fn(), onChanged = jest.fn();
type Element = React.ReactElement<Record<string, any>>;
function walk(node: any): Element[] { if (Array.isArray(node)) return node.flatMap(walk); if (!React.isValidElement(node)) return []; const element = node as Element; return [element, ...walk(element.props.children)]; }
function render() { mockStateIndex = 0; mockRefIndex = 0; mockEffects = []; return walk(ChangeEmailModal({ visible: true, currentEmail: "rider@example.com", onClose, onChanged })); }
function button(label: string) { return render().find(element => element.type === "Button" && (element.props.accessibilityLabel === label || walk(element).some(child => child.props.children === label)))!; }
const flow = (step: string) => ({ flow: { id: "request", step, current_email: "old@test.com", new_email: "new@test.com" }, old_resend_in_seconds: 0, new_resend_in_seconds: 0 });
beforeEach(() => { jest.clearAllMocks(); mockStates = []; mockRefs = []; render(); });
test("password identity step sends the existing flow and password", async () => {
  mockStates[0] = flow("identity"); mockStates[1] = "password"; mockStates[2] = "CurrentPass";
  (emailChangeService.verify as jest.Mock).mockResolvedValue(flow("email"));
  button("Continue").props.onPress(); await Promise.resolve(); await Promise.resolve();
  expect(emailChangeService.verify).toHaveBeenCalledWith("request", "password", "CurrentPass");
  expect(mockStates[0].flow.step).toBe("email"); expect(mockStates[2]).toBe("");
});
test("new address is sent for verification, not saved directly", async () => {
  mockStates[0] = flow("email"); mockStates[4] = " new@test.com ";
  (emailChangeService.sendCode as jest.Mock).mockResolvedValue(flow("verify"));
  button("Send code").props.onPress(); await Promise.resolve(); await Promise.resolve();
  expect(emailChangeService.sendCode).toHaveBeenCalledWith("request", "new", "new@test.com");
  expect(onChanged).not.toHaveBeenCalled();
});
test("duplicate confirmation taps send exactly one request", async () => {
  mockStates[0] = flow("verify"); mockStates[5] = "123456";
  let finish!: (value: any) => void;
  (emailChangeService.confirm as jest.Mock).mockReturnValue(new Promise(done => { finish = done; }));
  const confirm = button("Confirm"); confirm.props.onPress(); confirm.props.onPress();
  expect(emailChangeService.confirm).toHaveBeenCalledTimes(1);
  finish({ email: "new@test.com" }); await Promise.resolve(); await Promise.resolve();
  expect(onChanged).toHaveBeenCalledWith("new@test.com"); expect(mockStates[9]).toBe("new@test.com");
});
test("bad code retains flow and does not report success", async () => {
  mockStates[0] = flow("verify"); mockStates[5] = "000000";
  (emailChangeService.confirm as jest.Mock).mockRejectedValue(new Error("Wrong code"));
  button("Confirm").props.onPress(); await Promise.resolve(); await Promise.resolve();
  expect(mockStates[6]).toBe("Wrong code"); expect(mockStates[0].flow.id).toBe("request"); expect(onChanged).not.toHaveBeenCalled();
});
test("closing preserves the request for resumption", () => {
  mockStates[0] = flow("identity"); button("Close change email").props.onPress();
  expect(onClose).toHaveBeenCalled(); expect(emailChangeService.cancel).not.toHaveBeenCalled();
});
test("initial load retry uses the visible primary button style", () => {
  const retry = button("Try again");
  expect(retry.props.style).toContainEqual(expect.objectContaining({ backgroundColor: expect.any(String) }));
});
test("sheet and footer remain above the device navigation inset", () => {
  const tree = render();
  const keyboard = tree.find(element => element.type === "Keyboard")!;
  expect(keyboard.props.style[1].paddingBottom).toBe(16);
  expect(keyboard.props.behavior).toBe("height");
  const panel = tree.find(element => element.props.accessibilityViewIsModal)!;
  expect(panel.props.style[1].maxHeight).toBeLessThan(568 - 16);
  expect(tree.find(element => element.type === "Modal")!.props.statusBarTranslucent).toBeUndefined();
});

test("initial loading and failed reads do not display steps before settings arrive", () => {
  mockStates[7] = true;
  expect(render().some(element => element.props.accessibilityLabel === "Email change progress")).toBe(false);
  expect(render().some(element => element.props.children === "Loading email settings...")).toBe(true);
  mockStates[7] = false; mockStates[6] = "Offline";
  expect(render().some(element => element.props.accessibilityLabel === "Email change progress")).toBe(false);
});

test.each(["identity", "email", "verify", "success"])("steps connect as completed during %s", step => {
  mockStates[0] = flow(step === "success" ? "verify" : step);
  if (step === "success") mockStates[9] = "new@test.com";
  const tree = render();
  expect(tree.some(element => element.props.accessibilityLabel === "Email change progress")).toBe(true);
  const progress = ["identity", "email", "verify", "success"].indexOf(step);
  for (let index = 0; index < 2; index++) {
    const connector = tree.find(element => element.props.testID === `email-step-connector-${index}`)!;
    expect(connector.props.style[0]).toMatchObject({ height: 2, left: "50%", right: "-50%" });
    expect(Boolean(connector.props.style[1])).toBe(progress > index);
  }
});

function digits() { return render().filter(element => /verification code, digit \d of 6/.test(element.props.accessibilityLabel ?? "")); }

test("verification code uses six separate boxes and supports pasting a complete code", () => {
  mockStates[0] = flow("verify");
  expect(digits()).toHaveLength(6);
  digits()[0]!.props.onChangeText("123456");
  expect(mockStates[5]).toBe("123456");
  expect(digits().map(element => element.props.value)).toEqual(["1", "2", "3", "4", "5", "6"]);
  expect(button("Confirm").props.disabled).toBe(false);
});

test("digit editing and backspace preserve the positions of the other digits", () => {
  mockStates[0] = flow("verify"); mockStates[5] = "123456";
  digits()[2]!.props.onChangeText("");
  expect(mockStates[5]).toBe("12 456");
  expect(button("Confirm").props.disabled).toBe(true);
  digits()[2]!.props.onKeyPress({ nativeEvent: { key: "Backspace" } });
  expect(mockStates[5]).toBe("1  456");
  digits()[1]!.props.onChangeText("98");
  expect(mockStates[5]).toBe("198456");
  digits()[0]!.props.onChangeText("letters");
  expect(mockStates[5]).toBe("198456");
});

test("code autofill replaces all digits from any box and busy requests disable editing", () => {
  mockStates[0] = flow("verify"); mockStates[5] = "123456";
  digits()[4]!.props.onChangeText("654321");
  expect(mockStates[5]).toBe("654321");
  mockStates[7] = true;
  expect(digits().every(element => element.props.editable === false)).toBe(true);
});

test.each(["identity", "email"])("%s send action shows Sending until the server responds", async step => {
  mockStates[0] = flow(step); mockStates[4] = "new@test.com";
  let finish!: (value: any) => void;
  (emailChangeService.sendCode as jest.Mock).mockReturnValue(new Promise(done => { finish = done; }));
  const send = button("Send code"); send.props.onPress(); send.props.onPress();
  expect(emailChangeService.sendCode).toHaveBeenCalledTimes(1);
  expect(button("Sending...").props.disabled).toBe(true);
  expect(render().some(element => element.props.children === "Working...")).toBe(false);
  finish({ ...flow(step === "email" ? "verify" : "identity"),
    flow: { ...flow(step === "email" ? "verify" : "identity").flow, old_code_sent: true },
    old_resend_in_seconds: 60, new_resend_in_seconds: 60 });
  await Promise.resolve(); await Promise.resolve();
  expect(button("Resend in 60s").props.disabled).toBe(true);
});

test.each(["identity", "verify"])("%s cooldown blocks resending while allowing code verification", step => {
  mockStates[0] = { ...flow(step), flow: { ...flow(step).flow, old_code_sent: true },
    old_resend_in_seconds: 60, new_resend_in_seconds: 60 };
  mockStates[5] = "123456"; mockStates[8] = 17;
  const resend = button("Resend in 43s");
  expect(resend.props.disabled).toBe(true);
  expect(walk(resend).find(element => Array.isArray(element.props.style))!.props.style)
    .toContainEqual(expect.objectContaining({ color: "#D1D5DB" }));
  resend.props.onPress();
  expect(emailChangeService.sendCode).not.toHaveBeenCalled();
  expect(button(step === "identity" ? "Continue" : "Confirm").props.disabled).toBe(false);
  mockStates[8] = 60;
  expect(button("Resend code").props.disabled).toBe(false);
  mockStates[8] = 90;
  expect(button("Resend code").props.disabled).toBe(false);
});

test("changing address keeps the new-code cooldown and disables the send button", () => {
  mockStates[0] = { ...flow("verify"), new_resend_in_seconds: 60 };
  mockStates[4] = "new@test.com";
  mockStates[8] = 20;
  button("Change address").props.onPress();
  const send = button("Send code");
  expect(send.props.disabled).toBe(true);
  expect(send.props.style).toContainEqual({ opacity: 0.5 });
  send.props.onPress();
  expect(emailChangeService.sendCode).not.toHaveBeenCalled();
  expect(render().some(element => Array.isArray(element.props.children) && element.props.children.join("") === "You can request another code in 40s.")).toBe(true);
  mockStates[8] = 60;
  expect(button("Send code").props.disabled).toBe(false);
});

test.each(["identity", "verify"])("%s resend shows Sending and clears the previous code after success", async step => {
  mockStates[0] = { ...flow(step), flow: { ...flow(step).flow, old_code_sent: true } };
  mockStates[5] = "123456";
  let finish!: (value: any) => void;
  (emailChangeService.sendCode as jest.Mock).mockReturnValue(new Promise(done => { finish = done; }));
  button("Resend code").props.onPress();
  expect(render().filter(element => element.props.children === "Sending...")).toHaveLength(2);
  expect(digits().every(element => element.props.editable === false)).toBe(true);
  finish({ ...mockStates[0], old_resend_in_seconds: 60, new_resend_in_seconds: 60 });
  await Promise.resolve(); await Promise.resolve();
  expect(mockStates[5]).toBe("");
  expect(button("Resend in 60s").props.disabled).toBe(true);
});

const serverLimit = {
  server_now: "2026-11-10T12:00:00Z", blocked_until: "2026-11-11T12:00:00Z", attempts_left: 0,
};
const hasLimitWarning = () => render().some(element => typeof element.props.children === "string" && element.props.children.includes("reached the daily limit"));

test.each(["email", "password"])("daily limit prevents a new request through %s verification", method => {
  mockStates[0] = { ...flow("identity"), ...serverLimit, flow: null };
  mockStates[1] = method; mockStates[2] = "CurrentPass";
  const submit = button(method === "email" ? "Send code" : "Continue");
  expect(hasLimitWarning()).toBe(true);
  expect(submit.props.disabled).toBe(true);
  submit.props.onPress();
  expect(emailChangeService.start).not.toHaveBeenCalled();
  expect(emailChangeService.sendCode).not.toHaveBeenCalled();
  expect(emailChangeService.verify).not.toHaveBeenCalled();
});

test.each(["identity", "email", "verify"])("last allowed active request can finish %s without a false daily-limit warning", step => {
  mockStates[0] = { ...flow(step), ...serverLimit, flow: {
    ...flow(step).flow, old_code_sent: true, expires_at: "2026-11-10T12:30:00Z",
  } };
  mockStates[4] = "new@test.com"; mockStates[5] = "123456";
  expect(hasLimitWarning()).toBe(false);
  expect(button(step === "identity" ? "Continue" : step === "email" ? "Send code" : "Confirm").props.disabled).toBe(false);
});

test("expired last request cannot bypass the daily limit with Start again", () => {
  mockStates[0] = { ...flow("identity"), ...serverLimit, flow: {
    ...flow("identity").flow, old_code_sent: true, expires_at: "2026-11-10T12:00:10Z",
  } };
  mockStates[5] = "123456"; mockStates[8] = 11;
  expect(hasLimitWarning()).toBe(true);
  expect(button("Start again")).toBeUndefined();
  const submit = button("Continue");
  expect(submit.props.disabled).toBe(true);
  submit.props.onPress();
  expect(emailChangeService.start).not.toHaveBeenCalled();
  expect(emailChangeService.verify).not.toHaveBeenCalled();
  button("Close change email").props.onPress();
  expect(onClose).toHaveBeenCalled();
});

test("daily limit uses server time even when the phone clock is ahead", () => {
  const clock = jest.spyOn(Date, "now").mockReturnValue(Date.parse("2027-01-01T00:00:00Z"));
  try {
    mockStates[0] = { ...flow("identity"), ...serverLimit, flow: null, attempts_left: 1 };
    expect(button("Send code").props.disabled).toBe(true);
    expect(hasLimitWarning()).toBe(true);
    mockStates[8] = 24 * 60 * 60;
    expect(button("Send code").props.disabled).toBe(false);
    expect(hasLimitWarning()).toBe(false);
  } finally { clock.mockRestore(); }
});
