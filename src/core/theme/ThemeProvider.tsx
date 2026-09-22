import React, { createContext, useContext, type ReactNode } from "react";
import { commuterColors } from "./colors";

interface ThemeContextValue {
  colors: typeof commuterColors;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: commuterColors,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeContext.Provider value={{ colors: commuterColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useCommuterTheme() {
  return useContext(ThemeContext);
}
