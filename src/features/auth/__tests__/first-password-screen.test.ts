/// <reference types="jest" />
import React from "react";
import { SetNewPasswordScreen } from "../SetNewPasswordScreen";
import { authService } from "../../../core/api/auth-service";
let mockStates: any[] = [], mockIndex = 0, mockRefs: any[] = [], mockRefIndex = 0;
jest.mock("react", () => ({ ...jest.requireActual("react"), useState: (initial: unknown) => { const i = mockIndex++; if (!(i in mockStates)) mockStates[i] = initial; return [mockStates[i], (value: any) => { mockStates[i] = value; }]; }, useRef: (initial: unknown) => { const i = mockRefIndex++; return mockRefs[i] ?? (mockRefs[i] = { current: initial }); } }));
jest.mock("react-native", () => ({ ScrollView: "Scroll", View: "View", Text: "Text", TextInput: "Input", TouchableOpacity: "Button", ActivityIndicator: "Spinner" }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useCommuterTheme: () => ({ colors: { background: "#050F1A", textPrimary: "#FFFFFF", textSecondary: "#CBD5E1", textMuted: "#94A3B8", border: "#334155", danger: "#EF4444", primary: "#1A5FB4", primaryLight: "#62A0EA" } }) }));
jest.mock("../../../core/api/auth-service", () => ({ authService: { setNewPassword: jest.fn(), logout: jest.fn() } }));
type Element = React.ReactElement<Record<string, any>>;
function walk(node: any): Element[] { if (Array.isArray(node)) return node.flatMap(walk); if (!React.isValidElement(node)) return []; const e = node as Element; return [e, ...walk(e.props.children)]; }
const done = jest.fn();
function render() { mockIndex = 0; mockRefIndex = 0; return walk(SetNewPasswordScreen({ onDone: done })); }
function button(label: string) { return render().find(e => e.type === "Button" && walk(e).some(c => c.props.children === label))!; }
beforeEach(() => { jest.clearAllMocks(); mockStates = []; mockRefs = []; });
test("weak password is rejected without a request", async () => { await button("Activate account").props.onPress(); expect(authService.setNewPassword).not.toHaveBeenCalled(); });
test("successful setup clears form and asks for fresh sign-in", async () => {
  render(); mockStates[0] = mockStates[1] = "NewPassword123!";
  await button("Activate account").props.onPress();
  expect(authService.setNewPassword).toHaveBeenCalledWith("NewPassword123!", "NewPassword123!");
  expect(render().some(e => e.type === "Input")).toBe(false);
  button("Sign in again").props.onPress(); expect(done).toHaveBeenCalledTimes(1);
});
test("failed setup preserves password fields for a retry", async () => {
  render(); mockStates[0] = mockStates[1] = "NewPassword123!";
  (authService.setNewPassword as jest.Mock).mockRejectedValueOnce(new Error("Temporary outage"));
  await button("Activate account").props.onPress();
  expect(mockStates[0]).toBe("NewPassword123!"); expect(mockStates[3]).toBe("Temporary outage"); expect(done).not.toHaveBeenCalled();
});
