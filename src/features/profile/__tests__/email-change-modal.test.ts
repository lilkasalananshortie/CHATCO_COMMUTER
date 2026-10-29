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
jest.mock("react-native", () => ({ Modal: "Modal", Pressable: "Button", Text: "Text", TextInput: "Input", ScrollView: "Scroll", KeyboardAvoidingView: "Keyboard", ActivityIndicator: "Spinner", StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style }, Platform: { OS: "android" } }));
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
