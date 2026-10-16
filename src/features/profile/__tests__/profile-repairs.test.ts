/// <reference types="jest" />
import React from "react";
import { ProfileScreen } from "../ProfileScreen";
import { commuterService } from "../../../core/api/commuter-service";
import { authService } from "../../../core/api/auth-service";
import { pickProfilePhoto, profilePhotoForm } from "../profile-photo";
let mockStates: any[] = [], mockRefs: any[] = [], mockEffects: Array<() => any> = [];
let mockStateIndex = 0, mockRefIndex = 0;
jest.mock("react", () => ({ ...jest.requireActual("react"), useCallback: (fn: unknown) => fn,
  useEffect: (fn: () => any) => { mockEffects.push(fn); },
  useRef: (initial: unknown) => { const i = mockRefIndex++; return mockRefs[i] ?? (mockRefs[i] = { current: initial }); },
  useState: (initial: unknown) => { const i = mockStateIndex++; if (!(i in mockStates)) mockStates[i] = initial; return [mockStates[i], (next: any) => { mockStates[i] = typeof next === "function" ? next(mockStates[i]) : next; }]; },
}));
jest.mock("react-native", () => ({ View: "View", Image: "Image", Text: "Text", ScrollView: "ScrollView", TouchableOpacity: "Button", TextInput: "Input", Modal: "Modal", ActivityIndicator: "Spinner", StyleSheet: { create: (s: unknown) => s }, Linking: {}, Alert: { alert: jest.fn() } }));
jest.mock("../profile-photo", () => ({ pickProfilePhoto: jest.fn(), profilePhotoForm: jest.fn() }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("../../discount-application/DiscountApplicationEntry", () => ({ DiscountApplicationEntry: "Application" }));
jest.mock("../../../core/api/commuter-service", () => ({ commuterService: { getProfile: jest.fn(), updateProfile: jest.fn(), uploadProfilePhoto: jest.fn(), requestPasswordChangeCode: jest.fn(), confirmPasswordChange: jest.fn() } }));
jest.mock("../../../core/api/auth-service", () => ({ authService: { logout: jest.fn() } }));
type Element = React.ReactElement<Record<string, any>>;
function walk(node: any): Element[] { if (Array.isArray(node)) return node.flatMap(walk); if (!React.isValidElement(node)) return []; const e = node as Element; return [e, ...walk(e.props.children)]; }
const logout = jest.fn(), saved = jest.fn();
function render() { mockStateIndex = 0; mockRefIndex = 0; mockEffects = []; return walk(ProfileScreen({ onLogout: logout, onProfileSaved: saved })); }
function button(label: string) { return render().find(e => e.type === "Button" && walk(e).some(child => child.props.children === label))!; }
const profile = { id: "owner", first_name: "Real", surname: "User", username: "real", commuter_type: "STUDENT", account_status: "APPROVED", contact_number: "09180000000" };
async function flush() { for (let i = 0; i < 8; i++) await Promise.resolve(); }
beforeEach(() => {
  mockStates = []; mockRefs = []; jest.resetAllMocks(); render();
  mockStates[0] = profile; mockStates[1] = { id: "owner", name: "Real User", email: "owner@example.test" }; mockStates[2] = false;
});
test("actual password form sends current/new/confirmation and preserves fields for code confirmation", async () => {
  mockStates[12] = "Old-Pass123!"; mockStates[13] = "New-Pass123!"; mockStates[14] = "New-Pass123!";
  await button("Send Code").props.onPress();
  const fields = { current_password: "Old-Pass123!", password: "New-Pass123!", password_confirmation: "New-Pass123!" };
  expect(commuterService.requestPasswordChangeCode).toHaveBeenCalledWith(fields);
  mockStates[15] = "123456";
  await button("Update Password").props.onPress();
  expect(commuterService.confirmPasswordChange).toHaveBeenCalledWith({ ...fields, code: "123456" });
});
test("profile save publishes the genuine returned profile to App", async () => {
  mockStates[4] = true; mockStates[5] = "09189999999";
  (commuterService.updateProfile as jest.Mock).mockResolvedValue({ ...profile, contact_number: "09189999999" });
  await button("Save Changes").props.onPress();
  expect(saved).toHaveBeenCalledWith(expect.objectContaining({ contact_number: "09189999999", commuter_type: "STUDENT" }));
});
test("failed profile fetch shows retry/logout instead of invented identity or contact", async () => {
  mockStates[0] = null;
  (commuterService.getProfile as jest.Mock).mockRejectedValue(new Error("offline"));
  render(); mockEffects[1]!(); await flush();
  const tree = render();
  expect(mockStates[0]).toBeNull();
  expect(tree.some(e => e.type === "Input")).toBe(false);
  expect(button("Try again")).toBeDefined(); expect(button("Log Out")).toBeDefined();
});
test("logout completes the UI transition even if server revocation was unavailable", async () => {
  mockStates[0] = null; mockStates[3] = "offline";
  (authService.logout as jest.Mock).mockResolvedValue({ serverRevoked: false });
  await button("Log Out").props.onPress();
  expect(logout).toHaveBeenCalledTimes(1);
});

test("photo upload blocks duplicate taps and publishes the authoritative URL", async () => {
  const form = new FormData();
  (pickProfilePhoto as jest.Mock).mockResolvedValue({ uri: "file:///photo.jpg" });
  (profilePhotoForm as jest.Mock).mockReturnValue(form);
  let finish!: (value: unknown) => void;
  (commuterService.uploadProfilePhoto as jest.Mock).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const press = button("Change photo").props.onPress;
  press(); press(); await flush();
  expect(pickProfilePhoto).toHaveBeenCalledTimes(1);
  expect(commuterService.uploadProfilePhoto).toHaveBeenCalledTimes(1);
  expect(commuterService.uploadProfilePhoto).toHaveBeenCalledWith(form);
  finish({ ...profile, profile_image_url: "https://media.example.test/photo.jpg" }); await flush();
  expect(saved).toHaveBeenCalledWith(expect.objectContaining({ profile_image_url: "https://media.example.test/photo.jpg" }));
  expect(render().some(e => e.type === "Image")).toBe(true);
});

test("cancelled photo picker does not upload", async () => {
  (pickProfilePhoto as jest.Mock).mockResolvedValue(null);
  button("Change photo").props.onPress(); await flush();
  expect(commuterService.uploadProfilePhoto).not.toHaveBeenCalled();
  expect(button("Change photo").props.disabled).toBe(false);
});

test("failed upload retains existing photo and allows retry", async () => {
  mockStates[0] = { ...profile, profile_image_url: "https://media.example.test/old.jpg" };
  (pickProfilePhoto as jest.Mock).mockResolvedValue({ uri: "file:///new.jpg" });
  (commuterService.uploadProfilePhoto as jest.Mock).mockRejectedValue(new Error("Offline"));
  button("Change photo").props.onPress(); await flush();
  expect(mockStates[0].profile_image_url).toBe("https://media.example.test/old.jpg");
  expect(render().some(e => e.props.children === "Offline")).toBe(true);
  expect(button("Change photo").props.disabled).toBe(false);
  expect(saved).not.toHaveBeenCalled();
});

test("unavailable photo falls back to initials", () => {
  mockStates[0] = { ...profile, profile_image_url: "https://media.example.test/missing.jpg" };
  render().find(e => e.type === "Image")!.props.onError();
  expect(render().some(e => e.type === "Image")).toBe(false);
});
