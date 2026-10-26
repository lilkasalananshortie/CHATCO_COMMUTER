/// <reference types="jest" />
import React from "react";
import { ThemeProvider } from "../../../core/theme/ThemeProvider";
import { appStorage } from "../../../core/storage/app-storage";
let mockState = "dark", mockChanged = { current: false }, mockEffects: Array<() => any> = [];
jest.mock("react", () => ({ ...jest.requireActual("react"), useState: () => [mockState, (value: string) => { mockState = value; }], useRef: () => mockChanged, useMemo: (fn: () => unknown) => fn(), useEffect: (fn: () => any) => { mockEffects.push(fn); } }));
jest.mock("react-native", () => ({ useColorScheme: () => "light" }));
jest.mock("../../../core/storage/app-storage", () => ({ appStorage: { getItem: jest.fn(), setItem: jest.fn() } }));
function render() { mockEffects = []; return ThemeProvider({ children: null }).props.value; }
beforeEach(() => { jest.resetAllMocks(); mockState = "dark"; mockChanged = { current: false }; });
test("history appearance persists and light colors have dark text on light surfaces", async () => {
  await render().setAppearance("light");
  expect(appStorage.setItem).toHaveBeenCalledWith("chatco_commuter_appearance", "light");
  expect(render()).toMatchObject({ isLight: true, colors: { surface: "#FFFFFF", textPrimary: "#0F172A" } });
});
test("device appearance follows OS and a failed write does not claim success", async () => {
  await render().setAppearance("system"); expect(render().isLight).toBe(true);
  (appStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("Disk full"));
  await expect(render().setAppearance("dark")).rejects.toThrow("Disk full");
  expect(render().appearance).toBe("system");
});
test("saved appearance restores on restart", async () => {
  (appStorage.getItem as jest.Mock).mockResolvedValue("light"); render(); mockEffects[0]!();
  for (let i = 0; i < 4; i++) await Promise.resolve();
  expect(render().isLight).toBe(true);
});
test("slow bootstrap cannot overwrite a newer selection", async () => {
  let finish!: (value: string) => void;
  (appStorage.getItem as jest.Mock).mockReturnValue(new Promise(done => { finish = done; }));
  const theme = render(); mockEffects[0]!();
  await theme.setAppearance("dark"); finish("light");
  for (let i = 0; i < 4; i++) await Promise.resolve();
  expect(render().appearance).toBe("dark");
});
