import React, { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { appStorage } from "../storage/app-storage";
import { commuterColors } from "./colors";

interface ThemeContextValue {
  colors: { [K in keyof typeof commuterColors]: string };
  appearance: "dark" | "light" | "system";
  setAppearance: (value: "dark" | "light" | "system") => Promise<void>;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: commuterColors,
  appearance: "dark", isLight: false, setAppearance: async () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [appearance, updateAppearance] = useState<"dark" | "light" | "system">("dark");
  const changed = useRef(false);
  const system = useColorScheme();
  useEffect(() => { let active = true; void appStorage.getItem("chatco_commuter_appearance").then(value => { if (active && !changed.current && (value === "light" || value === "dark" || value === "system")) updateAppearance(value); }).catch(() => {}); return () => { active = false; }; }, []);
  const isLight = appearance === "light" || (appearance === "system" && system === "light");
  const colors = useMemo(() => isLight ? { ...commuterColors, background: "#F8FAFC", surface: "#FFFFFF", surfaceSecondary: "#F9FAFB", surfaceHover: "#F3F4F6", border: "#E5E7EB", borderSubtle: "#E5E7EB", textPrimary: "#111827", textSecondary: "#4B5563", textMuted: "#6B7280", primaryLight: "#1A5FB4" } : commuterColors, [isLight]);
  const setAppearance = async (value: "dark" | "light" | "system") => {
    // Persist first: a failed save must not claim a saved preference.
    await appStorage.setItem("chatco_commuter_appearance", value);
    changed.current = true; updateAppearance(value);
  };
  return (
    <ThemeContext.Provider value={{ colors, appearance, setAppearance, isLight }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useCommuterTheme() {
  return useContext(ThemeContext);
}
