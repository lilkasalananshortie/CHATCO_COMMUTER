import { createContext, useContext } from "react";
import { Text as NativeText, StyleSheet, type TextProps } from "react-native";
import { brandFont } from "./brand-font";

export const BrandFontContext = createContext(false);

/** Preserve explicit receipt/monospace fonts and native fallback if loading fails. */
export function Text({ style, ...props }: TextProps) {
  const loaded = useContext(BrandFontContext);
  const resolved = StyleSheet.flatten(style);
  return <NativeText {...props} style={[style, loaded && !resolved?.fontFamily
    ? { fontFamily: brandFont(resolved?.fontWeight), fontWeight: "normal" } : undefined]} />;
}
