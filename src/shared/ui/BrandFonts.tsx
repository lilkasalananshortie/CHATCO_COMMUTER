import type { ReactNode } from "react";
import { useFonts } from "expo-font";
import { BrandFontContext } from "./BrandText";

/** Bundled licensed fonts: typography works offline, without a new dependency. */
export function BrandFonts({ children }: { children: ReactNode }) {
  const [loaded] = useFonts({
    "Poppins-Regular": require("../../../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-Medium": require("../../../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-SemiBold": require("../../../assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Bold": require("../../../assets/fonts/Poppins-Bold.ttf"),
  });
  return <BrandFontContext.Provider value={loaded}>{children}</BrandFontContext.Provider>;
}
